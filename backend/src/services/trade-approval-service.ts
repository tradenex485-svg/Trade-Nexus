/**
 * CFTC Phase 9: Trade Approval Workflow Service
 *
 * Multi-level trade approval workflow for trades that:
 * - Would breach position limits
 * - Require high utilization (>90%)
 * - Involve high-risk markets
 * - Exceed predefined notional thresholds
 *
 * Workflow:
 * 1. Trade validation identifies need for approval
 * 2. Trade submitted for approval with rationale
 * 3. Approval routed to appropriate level (Trader -> Manager -> Compliance)
 * 4. Approver reviews, approves/rejects with comments
 * 5. Audit trail logs all approval actions
 * 6. Approved trades can proceed to execution
 */

import { D1Database } from '@cloudflare/workers-types';
import { AuditTrailService } from './audit-trail-service';

export interface TradeApproval {
  id?: number;
  trade_reference?: string;
  market_code: string;
  contract_month: string;
  quantity: number;
  deal_type?: string;
  counterparty?: string;
  trade_date: string;
  current_position: number;
  position_after_trade: number;
  limit: number;
  utilization_percent: number;
  approval_reason: string;
  approval_level: 'TRADER' | 'MANAGER' | 'COMPLIANCE' | 'AUTO';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requested_by: number;
  requested_at?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  review_comments?: string;
  company_id: number;
  escalation_level?: number;
  expires_at?: string;
}

export interface ApprovalDecision {
  approval_id: number;
  decision: 'APPROVE' | 'REJECT' | 'ESCALATE';
  comments?: string;
  reviewed_by: number;
  escalate_to_level?: 'MANAGER' | 'COMPLIANCE';
}

export interface ApprovalStats {
  total_approvals: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  by_approval_level: Record<string, number>;
  avg_approval_time_hours?: number;
  approval_rate?: number;
}

export class TradeApprovalService {
  private auditService: AuditTrailService;

  constructor(private db: D1Database) {
    this.auditService = new AuditTrailService(db);
  }

  /**
   * Submit trade for approval
   */
  async submitForApproval(approval: TradeApproval): Promise<number> {
    try {
      // Determine expiration (24 hours from now by default)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const result = await this.db.prepare(`
        INSERT INTO trade_approvals (
          trade_reference,
          market_code,
          contract_month,
          quantity,
          deal_type,
          counterparty,
          trade_date,
          current_position,
          position_after_trade,
          "limit",
          utilization_percent,
          approval_reason,
          approval_level,
          status,
          requested_by,
          requested_at,
          company_id,
          escalation_level,
          expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, datetime('now'), ?, ?, ?)
      `).bind(
        approval.trade_reference || null,
        approval.market_code,
        approval.contract_month,
        approval.quantity,
        approval.deal_type || null,
        approval.counterparty || null,
        approval.trade_date,
        approval.current_position,
        approval.position_after_trade,
        approval.limit,
        approval.utilization_percent,
        approval.approval_reason,
        approval.approval_level,
        approval.requested_by,
        approval.company_id,
        approval.escalation_level || 1,
        expiresAt.toISOString()
      ).run();

      const approvalId = result.meta.last_row_id || 0;

      // Log to audit trail
      await this.auditService.logEvent({
        event_type: 'APPROVAL',
        entity_type: 'TRADE',
        entity_id: approvalId,
        action: 'CREATE',
        user_id: approval.requested_by,
        company_id: approval.company_id,
        metadata: JSON.stringify({
          market_code: approval.market_code,
          contract_month: approval.contract_month,
          quantity: approval.quantity,
          approval_level: approval.approval_level,
          utilization_percent: approval.utilization_percent,
        }),
      });

      return approvalId;
    } catch (error: any) {
      console.error('Failed to submit for approval:', error);
      throw new Error(`Approval submission failed: ${error.message}`);
    }
  }

  /**
   * Process approval decision
   */
  async processDecision(decision: ApprovalDecision): Promise<void> {
    try {
      // Get the approval
      const approval = await this.getApproval(decision.approval_id);
      if (!approval) {
        throw new Error('Approval not found');
      }

      if (approval.status !== 'PENDING') {
        throw new Error(`Cannot process approval in ${approval.status} status`);
      }

      // Check if expired
      if (approval.expires_at && new Date(approval.expires_at) < new Date()) {
        await this.updateApprovalStatus(decision.approval_id, 'CANCELLED', null, 'Approval expired');
        throw new Error('Approval has expired');
      }

      if (decision.decision === 'APPROVE') {
        await this.db.prepare(`
          UPDATE trade_approvals
          SET status = 'APPROVED',
              reviewed_by = ?,
              reviewed_at = datetime('now'),
              review_comments = ?
          WHERE id = ?
        `).bind(
          decision.reviewed_by,
          decision.comments || null,
          decision.approval_id
        ).run();

        await this.auditService.logEvent({
          event_type: 'APPROVAL',
          entity_type: 'TRADE',
          entity_id: decision.approval_id,
          action: 'APPROVE',
          user_id: decision.reviewed_by,
          company_id: approval.company_id,
          metadata: JSON.stringify({
            comments: decision.comments,
            approval_level: approval.approval_level,
          }),
        });
      } else if (decision.decision === 'REJECT') {
        await this.db.prepare(`
          UPDATE trade_approvals
          SET status = 'REJECTED',
              reviewed_by = ?,
              reviewed_at = datetime('now'),
              review_comments = ?
          WHERE id = ?
        `).bind(
          decision.reviewed_by,
          decision.comments || null,
          decision.approval_id
        ).run();

        await this.auditService.logEvent({
          event_type: 'APPROVAL',
          entity_type: 'TRADE',
          entity_id: decision.approval_id,
          action: 'REJECT',
          user_id: decision.reviewed_by,
          company_id: approval.company_id,
          metadata: JSON.stringify({
            comments: decision.comments,
            approval_level: approval.approval_level,
          }),
        });
      } else if (decision.decision === 'ESCALATE') {
        // Escalate to higher approval level
        const newLevel = decision.escalate_to_level || 'COMPLIANCE';
        const newEscalationLevel = (approval.escalation_level || 1) + 1;

        await this.db.prepare(`
          UPDATE trade_approvals
          SET approval_level = ?,
              escalation_level = ?,
              expires_at = datetime('now', '+24 hours')
          WHERE id = ?
        `).bind(
          newLevel,
          newEscalationLevel,
          decision.approval_id
        ).run();

        await this.auditService.logEvent({
          event_type: 'APPROVAL',
          entity_type: 'TRADE',
          entity_id: decision.approval_id,
          action: 'UPDATE',
          user_id: decision.reviewed_by,
          company_id: approval.company_id,
          metadata: JSON.stringify({
            action: 'ESCALATE',
            from_level: approval.approval_level,
            to_level: newLevel,
            comments: decision.comments,
          }),
        });
      }
    } catch (error: any) {
      console.error('Failed to process decision:', error);
      throw new Error(`Decision processing failed: ${error.message}`);
    }
  }

  /**
   * Get approval by ID
   */
  async getApproval(approvalId: number): Promise<TradeApproval | null> {
    const result = await this.db.prepare(`
      SELECT
        id,
        trade_reference,
        market_code,
        contract_month,
        quantity,
        deal_type,
        counterparty,
        trade_date,
        current_position,
        position_after_trade,
        "limit",
        utilization_percent,
        approval_reason,
        approval_level,
        status,
        requested_by,
        requested_at,
        reviewed_by,
        reviewed_at,
        review_comments,
        company_id,
        escalation_level,
        expires_at
      FROM trade_approvals
      WHERE id = ?
    `).bind(approvalId).first();

    return result as TradeApproval | null;
  }

  /**
   * Get approvals with filters
   */
  async getApprovals(filters: {
    status?: string;
    approval_level?: string;
    requested_by?: number;
    company_id?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<TradeApproval[]> {
    const conditions: string[] = [];
    const bindings: any[] = [];

    if (filters.status) {
      conditions.push('status = ?');
      bindings.push(filters.status);
    }
    if (filters.approval_level) {
      conditions.push('approval_level = ?');
      bindings.push(filters.approval_level);
    }
    if (filters.requested_by) {
      conditions.push('requested_by = ?');
      bindings.push(filters.requested_by);
    }
    if (filters.company_id) {
      conditions.push('company_id = ?');
      bindings.push(filters.company_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const query = `
      SELECT
        id,
        trade_reference,
        market_code,
        contract_month,
        quantity,
        deal_type,
        counterparty,
        trade_date,
        current_position,
        position_after_trade,
        "limit",
        utilization_percent,
        approval_reason,
        approval_level,
        status,
        requested_by,
        requested_at,
        reviewed_by,
        reviewed_at,
        review_comments,
        company_id,
        escalation_level,
        expires_at
      FROM trade_approvals
      ${whereClause}
      ORDER BY requested_at DESC
      LIMIT ? OFFSET ?
    `;

    const result = await this.db.prepare(query)
      .bind(...bindings, limit, offset)
      .all();

    return result.results as TradeApproval[];
  }

  /**
   * Get approval statistics
   */
  async getApprovalStats(companyId?: number, startDate?: string, endDate?: string): Promise<ApprovalStats> {
    const conditions: string[] = [];
    const bindings: any[] = [];

    if (companyId) {
      conditions.push('company_id = ?');
      bindings.push(companyId);
    }
    if (startDate) {
      conditions.push('requested_at >= ?');
      bindings.push(startDate);
    }
    if (endDate) {
      conditions.push('requested_at <= ?');
      bindings.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total counts by status
    const statusResult = await this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
      FROM trade_approvals
      ${whereClause}
    `).bind(...bindings).first();

    // By approval level
    const levelResult = await this.db.prepare(`
      SELECT approval_level, COUNT(*) as count
      FROM trade_approvals
      ${whereClause}
      GROUP BY approval_level
    `).bind(...bindings).all();

    // Average approval time (for approved/rejected)
    const timeResult = await this.db.prepare(`
      SELECT AVG(
        CAST((julianday(reviewed_at) - julianday(requested_at)) * 24 AS REAL)
      ) as avg_hours
      FROM trade_approvals
      ${whereClause}
      AND status IN ('APPROVED', 'REJECTED')
      AND reviewed_at IS NOT NULL
    `).bind(...bindings).first();

    const stats: ApprovalStats = {
      total_approvals: (statusResult as any)?.total || 0,
      pending: (statusResult as any)?.pending || 0,
      approved: (statusResult as any)?.approved || 0,
      rejected: (statusResult as any)?.rejected || 0,
      cancelled: (statusResult as any)?.cancelled || 0,
      by_approval_level: {},
      avg_approval_time_hours: (timeResult as any)?.avg_hours || 0,
    };

    levelResult.results.forEach((row: any) => {
      stats.by_approval_level[row.approval_level] = row.count;
    });

    const totalDecided = stats.approved + stats.rejected;
    if (totalDecided > 0) {
      stats.approval_rate = (stats.approved / totalDecided) * 100;
    }

    return stats;
  }

  /**
   * Cancel approval (by requester)
   */
  async cancelApproval(approvalId: number, userId: number, reason?: string): Promise<void> {
    const approval = await this.getApproval(approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    if (approval.requested_by !== userId) {
      throw new Error('Only the requester can cancel this approval');
    }

    if (approval.status !== 'PENDING') {
      throw new Error(`Cannot cancel approval in ${approval.status} status`);
    }

    await this.updateApprovalStatus(approvalId, 'CANCELLED', userId, reason);
  }

  /**
   * Update approval status
   */
  private async updateApprovalStatus(
    approvalId: number,
    status: string,
    userId: number | null,
    comments?: string
  ): Promise<void> {
    await this.db.prepare(`
      UPDATE trade_approvals
      SET status = ?,
          reviewed_by = ?,
          reviewed_at = datetime('now'),
          review_comments = ?
      WHERE id = ?
    `).bind(status, userId, comments || null, approvalId).run();

    if (userId) {
      const approval = await this.getApproval(approvalId);
      if (approval) {
        await this.auditService.logEvent({
          event_type: 'APPROVAL',
          entity_type: 'TRADE',
          entity_id: approvalId,
          action: 'UPDATE',
          user_id: userId,
          company_id: approval.company_id,
          metadata: JSON.stringify({
            new_status: status,
            comments,
          }),
        });
      }
    }
  }

  /**
   * Auto-expire old pending approvals
   */
  async expirePendingApprovals(): Promise<number> {
    const result = await this.db.prepare(`
      UPDATE trade_approvals
      SET status = 'CANCELLED',
          review_comments = 'Auto-expired after 24 hours'
      WHERE status = 'PENDING'
        AND expires_at < datetime('now')
    `).run();

    return result.meta.changes || 0;
  }
}

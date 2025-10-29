/**
 * CFTC Phase 7: Audit Trail Service
 *
 * Comprehensive audit logging system for tracking all changes to:
 * - Market limits
 * - Position calculations
 * - Exception status changes
 * - Report generation
 * - Pre-trade validations
 * - Trade approvals
 *
 * Provides complete audit trail for regulatory compliance and forensic analysis.
 */

import { D1Database } from '@cloudflare/workers-types';

export interface AuditEntry {
  id?: number;
  event_type: string; // 'LIMIT_CHANGE', 'CALCULATION', 'EXCEPTION_UPDATE', 'REPORT_GENERATED', 'VALIDATION', 'APPROVAL'
  entity_type: string; // 'MARKET_LIMIT', 'POSITION', 'EXCEPTION', 'REPORT', 'TRADE'
  entity_id: number;
  action: string; // 'CREATE', 'UPDATE', 'DELETE', 'CALCULATE', 'APPROVE', 'REJECT'
  user_id?: number;
  company_id: number;
  changes?: string; // JSON string of before/after values
  metadata?: string; // JSON string of additional context
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
}

export interface AuditQueryFilters {
  event_type?: string;
  entity_type?: string;
  entity_id?: number;
  user_id?: number;
  company_id?: number;
  action?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  total_events: number;
  by_event_type: Record<string, number>;
  by_action: Record<string, number>;
  by_user: Record<number, number>;
  recent_activity_count: number;
}

export class AuditTrailService {
  constructor(private db: D1Database) {}

  /**
   * Log an audit event
   */
  async logEvent(entry: AuditEntry): Promise<number> {
    try {
      const result = await this.db.prepare(`
        INSERT INTO audit_trail (
          event_type,
          entity_type,
          entity_id,
          action,
          user_id,
          company_id,
          changes,
          metadata,
          ip_address,
          user_agent,
          timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        entry.event_type,
        entry.entity_type,
        entry.entity_id,
        entry.action,
        entry.user_id || null,
        entry.company_id,
        entry.changes || null,
        entry.metadata || null,
        entry.ip_address || null,
        entry.user_agent || null
      ).run();

      return result.meta.last_row_id || 0;
    } catch (error: any) {
      console.error('Failed to log audit event:', error);
      throw new Error(`Audit logging failed: ${error.message}`);
    }
  }

  /**
   * Query audit trail with filters
   */
  async queryAuditTrail(filters: AuditQueryFilters = {}): Promise<AuditEntry[]> {
    const conditions: string[] = [];
    const bindings: any[] = [];

    if (filters.event_type) {
      conditions.push('event_type = ?');
      bindings.push(filters.event_type);
    }
    if (filters.entity_type) {
      conditions.push('entity_type = ?');
      bindings.push(filters.entity_type);
    }
    if (filters.entity_id) {
      conditions.push('entity_id = ?');
      bindings.push(filters.entity_id);
    }
    if (filters.user_id) {
      conditions.push('user_id = ?');
      bindings.push(filters.user_id);
    }
    if (filters.company_id) {
      conditions.push('company_id = ?');
      bindings.push(filters.company_id);
    }
    if (filters.action) {
      conditions.push('action = ?');
      bindings.push(filters.action);
    }
    if (filters.start_date) {
      conditions.push('timestamp >= ?');
      bindings.push(filters.start_date);
    }
    if (filters.end_date) {
      conditions.push('timestamp <= ?');
      bindings.push(filters.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const query = `
      SELECT
        id,
        event_type,
        entity_type,
        entity_id,
        action,
        user_id,
        company_id,
        changes,
        metadata,
        ip_address,
        user_agent,
        timestamp
      FROM audit_trail
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const result = await this.db.prepare(query)
      .bind(...bindings, limit, offset)
      .all();

    return result.results as AuditEntry[];
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(companyId?: number, startDate?: string, endDate?: string): Promise<AuditStats> {
    const conditions: string[] = [];
    const bindings: any[] = [];

    if (companyId) {
      conditions.push('company_id = ?');
      bindings.push(companyId);
    }
    if (startDate) {
      conditions.push('timestamp >= ?');
      bindings.push(startDate);
    }
    if (endDate) {
      conditions.push('timestamp <= ?');
      bindings.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total events
    const totalResult = await this.db.prepare(`
      SELECT COUNT(*) as total
      FROM audit_trail
      ${whereClause}
    `).bind(...bindings).first();

    // Events by type
    const byTypeResult = await this.db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM audit_trail
      ${whereClause}
      GROUP BY event_type
    `).bind(...bindings).all();

    // Events by action
    const byActionResult = await this.db.prepare(`
      SELECT action, COUNT(*) as count
      FROM audit_trail
      ${whereClause}
      GROUP BY action
    `).bind(...bindings).all();

    // Events by user
    const byUserResult = await this.db.prepare(`
      SELECT user_id, COUNT(*) as count
      FROM audit_trail
      ${whereClause}
      AND user_id IS NOT NULL
      GROUP BY user_id
    `).bind(...bindings).all();

    // Recent activity (last 24 hours)
    const recentConditions = [...conditions, "timestamp >= datetime('now', '-1 day')"];
    const recentWhereClause = recentConditions.length > 0 ? `WHERE ${recentConditions.join(' AND ')}` : '';
    const recentResult = await this.db.prepare(`
      SELECT COUNT(*) as count
      FROM audit_trail
      ${recentWhereClause}
    `).bind(...bindings).first();

    const stats: AuditStats = {
      total_events: (totalResult as any)?.total || 0,
      by_event_type: {},
      by_action: {},
      by_user: {},
      recent_activity_count: (recentResult as any)?.count || 0,
    };

    // Map results to stats object
    byTypeResult.results.forEach((row: any) => {
      stats.by_event_type[row.event_type] = row.count;
    });

    byActionResult.results.forEach((row: any) => {
      stats.by_action[row.action] = row.count;
    });

    byUserResult.results.forEach((row: any) => {
      stats.by_user[row.user_id] = row.count;
    });

    return stats;
  }

  /**
   * Get audit trail for a specific entity
   */
  async getEntityHistory(entityType: string, entityId: number, limit = 50): Promise<AuditEntry[]> {
    const result = await this.db.prepare(`
      SELECT
        id,
        event_type,
        entity_type,
        entity_id,
        action,
        user_id,
        company_id,
        changes,
        metadata,
        ip_address,
        user_agent,
        timestamp
      FROM audit_trail
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).bind(entityType, entityId, limit).all();

    return result.results as AuditEntry[];
  }

  /**
   * Get user activity history
   */
  async getUserActivity(userId: number, limit = 50): Promise<AuditEntry[]> {
    const result = await this.db.prepare(`
      SELECT
        id,
        event_type,
        entity_type,
        entity_id,
        action,
        user_id,
        company_id,
        changes,
        metadata,
        ip_address,
        user_agent,
        timestamp
      FROM audit_trail
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).bind(userId, limit).all();

    return result.results as AuditEntry[];
  }

  /**
   * Search audit trail by keyword in changes/metadata
   */
  async searchAuditTrail(
    searchTerm: string,
    companyId?: number,
    limit = 50
  ): Promise<AuditEntry[]> {
    const conditions: string[] = [
      "(changes LIKE ? OR metadata LIKE ?)"
    ];
    const bindings: any[] = [`%${searchTerm}%`, `%${searchTerm}%`];

    if (companyId) {
      conditions.push('company_id = ?');
      bindings.push(companyId);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await this.db.prepare(`
      SELECT
        id,
        event_type,
        entity_type,
        entity_id,
        action,
        user_id,
        company_id,
        changes,
        metadata,
        ip_address,
        user_agent,
        timestamp
      FROM audit_trail
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ?
    `).bind(...bindings, limit).all();

    return result.results as AuditEntry[];
  }

  /**
   * Cleanup old audit entries (for data retention compliance)
   */
  async cleanupOldEntries(retentionDays: number, companyId?: number): Promise<number> {
    const conditions: string[] = [
      `timestamp < datetime('now', '-${retentionDays} days')`
    ];
    const bindings: any[] = [];

    if (companyId) {
      conditions.push('company_id = ?');
      bindings.push(companyId);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await this.db.prepare(`
      DELETE FROM audit_trail
      ${whereClause}
    `).bind(...bindings).run();

    return result.meta.changes || 0;
  }
}

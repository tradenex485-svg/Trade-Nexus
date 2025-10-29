import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';
import { TokenPayload } from '../services/auth-service';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

export const tradeApprovalsRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/trade-approvals
 * Get trade approvals (pending by default)
 */
tradeApprovalsRoutes.get('/', authenticate, async (c) => {
  try {
    const status = c.req.query('status') || 'pending';
    const limit = parseInt(c.req.query('limit') || '100');

    const result = await c.env.DB.prepare(`
      SELECT
        ta.*,
        ptc.market_location,
        ptc.commodity_code,
        ptc.contract_month,
        ptc.trade_side,
        ptc.quantity,
        ptc.projected_utilization_pct,
        ptc.risk_level,
        u1.name as requested_by_name,
        u2.name as approved_by_name
      FROM trade_approvals ta
      JOIN pre_trade_checks ptc ON ta.pre_trade_check_id = ptc.id
      LEFT JOIN users u1 ON ta.requested_by = u1.id
      LEFT JOIN users u2 ON ta.approved_by = u2.id
      WHERE ta.status = ?
      ORDER BY
        CASE ta.urgency
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        ta.requested_at DESC
      LIMIT ?
    `)
      .bind(status, limit)
      .all();

    return c.json({
      success: true,
      data: result.results,
      count: result.results.length,
    });
  } catch (error: any) {
    console.error('Get trade approvals error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get trade approvals',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/trade-approvals/pending-count
 * Get count of pending approvals
 */
tradeApprovalsRoutes.get('/pending-count', authenticate, async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM trade_approvals
      WHERE status = 'pending'
    `).first();

    return c.json({
      success: true,
      count: result?.count || 0,
    });
  } catch (error: any) {
    console.error('Get pending count error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get pending count',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/trade-approvals
 * Create new approval request
 */
tradeApprovalsRoutes.post('/', authenticate, async (c) => {
  try {
    const user = c.get('user') as TokenPayload;
    const body = await c.req.json();

    if (!body.pre_trade_check_id) {
      return c.json(
        {
          success: false,
          error: 'pre_trade_check_id is required',
        },
        400
      );
    }

    // Set expiration (24 hours from now by default)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const result = await c.env.DB.prepare(`
      INSERT INTO trade_approvals (
        pre_trade_check_id, requested_by, urgency, expires_at
      ) VALUES (?, ?, ?, ?)
    `)
      .bind(
        body.pre_trade_check_id,
        user.userId,
        body.urgency || 'normal',
        expiresAt.toISOString()
      )
      .run();

    return c.json(
      {
        success: true,
        message: 'Approval request created successfully',
        approval_id: result.meta.last_row_id,
      },
      201
    );
  } catch (error: any) {
    console.error('Create approval request error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create approval request',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/trade-approvals/:id/approve
 * Approve a trade
 */
tradeApprovalsRoutes.post('/:id/approve', authenticate, authorize('trades.approve'), async (c) => {
  try {
    const user = c.get('user') as TokenPayload;
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    // Check if approval exists and is pending
    const approval = await c.env.DB.prepare(`
      SELECT id, status, pre_trade_check_id FROM trade_approvals WHERE id = ?
    `)
      .bind(id)
      .first();

    if (!approval) {
      return c.json(
        {
          success: false,
          error: 'Approval request not found',
        },
        404
      );
    }

    if (approval.status !== 'pending') {
      return c.json(
        {
          success: false,
          error: 'Approval request is not pending',
        },
        400
      );
    }

    // Update approval status
    await c.env.DB.prepare(`
      UPDATE trade_approvals
      SET status = 'approved',
          approved_by = ?,
          approval_notes = ?,
          reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
      .bind(user.userId, body.notes || null, id)
      .run();

    // Update pre_trade_check to approved
    await c.env.DB.prepare(`
      UPDATE pre_trade_checks
      SET validation_status = 'approved',
          can_proceed = 1
      WHERE id = ?
    `)
      .bind(approval.pre_trade_check_id)
      .run();

    // Log audit trail
    await c.env.DB.prepare(`
      INSERT INTO pre_trade_audit (
        pre_trade_check_id, action, performed_by, details
      ) VALUES (?, 'approved', ?, ?)
    `)
      .bind(
        approval.pre_trade_check_id,
        user.userId,
        body.notes || 'Trade approved by manager'
      )
      .run();

    return c.json({
      success: true,
      message: 'Trade approved successfully',
    });
  } catch (error: any) {
    console.error('Approve trade error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to approve trade',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/trade-approvals/:id/reject
 * Reject a trade
 */
tradeApprovalsRoutes.post('/:id/reject', authenticate, authorize('trades.approve'), async (c) => {
  try {
    const user = c.get('user') as TokenPayload;
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    if (!body.rejection_reason) {
      return c.json(
        {
          success: false,
          error: 'rejection_reason is required',
        },
        400
      );
    }

    // Check if approval exists and is pending
    const approval = await c.env.DB.prepare(`
      SELECT id, status, pre_trade_check_id FROM trade_approvals WHERE id = ?
    `)
      .bind(id)
      .first();

    if (!approval) {
      return c.json(
        {
          success: false,
          error: 'Approval request not found',
        },
        404
      );
    }

    if (approval.status !== 'pending') {
      return c.json(
        {
          success: false,
          error: 'Approval request is not pending',
        },
        400
      );
    }

    // Update approval status
    await c.env.DB.prepare(`
      UPDATE trade_approvals
      SET status = 'rejected',
          approved_by = ?,
          rejection_reason = ?,
          reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
      .bind(user.userId, body.rejection_reason, id)
      .run();

    // Log audit trail
    await c.env.DB.prepare(`
      INSERT INTO pre_trade_audit (
        pre_trade_check_id, action, performed_by, details
      ) VALUES (?, 'rejected', ?, ?)
    `)
      .bind(approval.pre_trade_check_id, user.userId, body.rejection_reason)
      .run();

    return c.json({
      success: true,
      message: 'Trade rejected successfully',
    });
  } catch (error: any) {
    console.error('Reject trade error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to reject trade',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/trade-approvals/history
 * Get approval history
 */
tradeApprovalsRoutes.get('/history', authenticate, async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const startDate = c.req.query('start_date');

    let query = `
      SELECT
        ta.*,
        ptc.market_location,
        ptc.commodity_code,
        ptc.trade_side,
        ptc.quantity,
        u1.name as requested_by_name,
        u2.name as approved_by_name
      FROM trade_approvals ta
      JOIN pre_trade_checks ptc ON ta.pre_trade_check_id = ptc.id
      LEFT JOIN users u1 ON ta.requested_by = u1.id
      LEFT JOIN users u2 ON ta.approved_by = u2.id
      WHERE ta.status IN ('approved', 'rejected')
    `;

    const bindings: any[] = [];

    if (startDate) {
      query += ` AND DATE(ta.reviewed_at) >= DATE(?)`;
      bindings.push(startDate);
    }

    query += ` ORDER BY ta.reviewed_at DESC LIMIT ?`;
    bindings.push(limit);

    const result = await c.env.DB.prepare(query).bind(...bindings).all();

    return c.json({
      success: true,
      data: result.results,
      count: result.results.length,
    });
  } catch (error: any) {
    console.error('Get approval history error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get approval history',
        message: error.message,
      },
      500
    );
  }
});

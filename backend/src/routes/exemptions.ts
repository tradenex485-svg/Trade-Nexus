/**
 * Exemptions API Routes
 * Hedge exemption request and approval workflow
 */

import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';

type Bindings = {
  DB: D1Database;
  CACHE: KVNamespace;
  DOCUMENTS: R2Bucket;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
  FRONTEND_URL?: string;
  SENTRY_DSN?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  DATABASE_ENCRYPTION_KEY?: string;
};

export const exemptionsRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/exemptions
 * Get all exemption requests with optional filtering
 */
exemptionsRoutes.get('/', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const status = c.req.query('status');
    const commodityCode = c.req.query('commodity_code');
    const companyId = c.req.query('company_id');

    let query = `
      SELECT
        he.*,
        c.company_name,
        u1.email as requested_by_name,
        u2.email as reviewed_by_name
      FROM hedge_exemptions he
      LEFT JOIN companies c ON he.company_id = c.id
      LEFT JOIN users u1 ON he.user_id = u1.id
      LEFT JOIN users u2 ON he.reviewed_by = u2.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND he.status = ?`;
      params.push(status);
    }

    if (commodityCode) {
      query += ` AND he.commodity_code = ?`;
      params.push(commodityCode);
    }

    if (companyId) {
      query += ` AND he.company_id = ?`;
      params.push(parseInt(companyId));
    }

    // Filter by company if user is not super admin
    if (user.role_id !== 5) {
      query += ` AND he.company_id = ?`;
      params.push(user.company_id);
    }

    query += ` ORDER BY he.submitted_at DESC LIMIT 100`;

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      data: result.results,
      count: result.results.length,
    });
  } catch (error: any) {
    console.error('[API] Error getting exemptions:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve exemptions',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/exemptions/stats
 * Get exemption statistics
 */
exemptionsRoutes.get('/stats', authenticate, async (c) => {
  try {
    const user = c.get('user');

    let statsQuery = `
      SELECT
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied_requests,
        SUM(CASE WHEN status = 'approved' AND effective_from <= DATE('now') AND effective_to >= DATE('now') THEN 1 ELSE 0 END) as active_exemptions
      FROM hedge_exemptions
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by company if user is not super admin
    if (user.role_id !== 3) {
      statsQuery += ` AND company_id = ?`;
      params.push(user.company_id);
    }

    const stats = await c.env.DB.prepare(statsQuery).bind(...params).first();

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[API] Error getting exemption stats:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve exemption statistics',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/exemptions/:id
 * Get a specific exemption request
 */
exemptionsRoutes.get('/:id', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const exemptionId = parseInt(c.req.param('id'));

    let query = `
      SELECT
        he.*,
        c.company_name,
        u1.email as requested_by_name,
        u2.email as reviewed_by_name
      FROM hedge_exemptions he
      LEFT JOIN companies c ON he.company_id = c.id
      LEFT JOIN users u1 ON he.user_id = u1.id
      LEFT JOIN users u2 ON he.reviewed_by = u2.id
      WHERE he.id = ?
    `;
    const params: any[] = [exemptionId];

    // Filter by company if user is not super admin
    if (user.role_id !== 5) {
      query += ` AND he.company_id = ?`;
      params.push(user.company_id);
    }

    const exemption = await c.env.DB.prepare(query).bind(...params).first();

    if (!exemption) {
      return c.json({
        success: false,
        error: 'Exemption not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: exemption,
    });
  } catch (error: any) {
    console.error('[API] Error getting exemption:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve exemption',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/exemptions
 * Create a new exemption request
 */
exemptionsRoutes.post('/', authenticate, authorize('exemptions.create'), async (c) => {
  try {
    const user = c.get('user');
    const {
      commodity_code,
      company_id,
      exemption_type,
      requested_amount,
      current_position,
      business_justification,
      supporting_documents,
    } = await c.req.json();

    // Validate required fields
    if (!commodity_code || !exemption_type || !requested_amount || !business_justification) {
      return c.json({
        success: false,
        error: 'Missing required fields: commodity_code, exemption_type, requested_amount, business_justification',
      }, 400);
    }

    // Use user's company if not specified (or if user is not super admin)
    const effectiveCompanyId = (user.role_id === 5 && company_id) ? company_id : user.company_id;

    // Insert exemption request
    const result = await c.env.DB.prepare(`
      INSERT INTO hedge_exemptions (
        commodity_code, company_id, exemption_type, position_size,
        hedge_rationale, documentation_provided,
        status, user_id, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'))
    `).bind(
      commodity_code,
      effectiveCompanyId,
      exemption_type,
      requested_amount,
      business_justification,
      supporting_documents || null,
      user.userId
    ).run();

    return c.json({
      success: true,
      message: 'Exemption request created successfully',
      data: {
        id: result.meta.last_row_id,
      },
    }, 201);
  } catch (error: any) {
    console.error('[API] Error creating exemption:', error);
    return c.json({
      success: false,
      error: 'Failed to create exemption request',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/exemptions/:id/approve
 * Approve an exemption request
 */
exemptionsRoutes.post('/:id/approve', authenticate, authorize('exemptions.update'), async (c) => {
  try {
    const user = c.get('user');
    const exemptionId = parseInt(c.req.param('id'));
    const { approval_notes, effective_from, effective_to } = await c.req.json().catch(() => ({}));

    // Get exemption
    const exemption = await c.env.DB.prepare(`
      SELECT * FROM hedge_exemptions WHERE id = ?
    `).bind(exemptionId).first();

    if (!exemption) {
      return c.json({
        success: false,
        error: 'Exemption not found',
      }, 404);
    }

    if (exemption.status !== 'pending') {
      return c.json({
        success: false,
        error: 'Can only approve pending exemptions',
      }, 400);
    }

    // Default to 90 days if not specified
    const effectiveFromDate = effective_from || new Date().toISOString().split('T')[0];
    const effectiveToDate = effective_to || (() => {
      const date = new Date();
      date.setDate(date.getDate() + 90);
      return date.toISOString().split('T')[0];
    })();

    // Update exemption
    await c.env.DB.prepare(`
      UPDATE hedge_exemptions
      SET status = 'approved',
          reviewed_by = ?,
          reviewed_at = datetime('now'),
          approval_notes = ?,
          effective_from = ?,
          effective_to = ?
      WHERE id = ?
    `).bind(
      user.id,
      approval_notes || 'Approved',
      effectiveFromDate,
      effectiveToDate,
      exemptionId
    ).run();

    return c.json({
      success: true,
      message: 'Exemption approved successfully',
    });
  } catch (error: any) {
    console.error('[API] Error approving exemption:', error);
    return c.json({
      success: false,
      error: 'Failed to approve exemption',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/exemptions/:id/deny
 * Deny an exemption request
 */
exemptionsRoutes.post('/:id/deny', authenticate, authorize('exemptions.update'), async (c) => {
  try {
    const user = c.get('user');
    const exemptionId = parseInt(c.req.param('id'));
    const { denial_reason } = await c.req.json();

    if (!denial_reason) {
      return c.json({
        success: false,
        error: 'denial_reason is required',
      }, 400);
    }

    // Get exemption
    const exemption = await c.env.DB.prepare(`
      SELECT * FROM hedge_exemptions WHERE id = ?
    `).bind(exemptionId).first();

    if (!exemption) {
      return c.json({
        success: false,
        error: 'Exemption not found',
      }, 404);
    }

    if (exemption.status !== 'pending') {
      return c.json({
        success: false,
        error: 'Can only deny pending exemptions',
      }, 400);
    }

    // Update exemption
    await c.env.DB.prepare(`
      UPDATE hedge_exemptions
      SET status = 'denied',
          reviewed_by = ?,
          reviewed_at = datetime('now'),
          rejection_reason = ?
      WHERE id = ?
    `).bind(
      user.id,
      denial_reason,
      exemptionId
    ).run();

    return c.json({
      success: true,
      message: 'Exemption denied',
    });
  } catch (error: any) {
    console.error('[API] Error denying exemption:', error);
    return c.json({
      success: false,
      error: 'Failed to deny exemption',
      message: error.message,
    }, 500);
  }
});

/**
 * DELETE /api/exemptions/:id
 * Delete an exemption request (only pending ones)
 */
exemptionsRoutes.delete('/:id', authenticate, authorize('exemptions.delete'), async (c) => {
  try {
    const user = c.get('user');
    const exemptionId = parseInt(c.req.param('id'));

    // Get exemption
    const exemption = await c.env.DB.prepare(`
      SELECT * FROM hedge_exemptions WHERE id = ?
    `).bind(exemptionId).first();

    if (!exemption) {
      return c.json({
        success: false,
        error: 'Exemption not found',
      }, 404);
    }

    // Only allow deleting pending exemptions
    if (exemption.status !== 'pending') {
      return c.json({
        success: false,
        error: 'Can only delete pending exemptions',
      }, 400);
    }

    // Only allow users to delete their own requests (unless super admin)
    if (user.role_id !== 5 && exemption.user_id !== user.userId) {
      return c.json({
        success: false,
        error: 'You can only delete your own exemption requests',
      }, 403);
    }

    await c.env.DB.prepare(`DELETE FROM hedge_exemptions WHERE id = ?`).bind(exemptionId).run();

    return c.json({
      success: true,
      message: 'Exemption request deleted',
    });
  } catch (error: any) {
    console.error('[API] Error deleting exemption:', error);
    return c.json({
      success: false,
      error: 'Failed to delete exemption',
      message: error.message,
    }, 500);
  }
});

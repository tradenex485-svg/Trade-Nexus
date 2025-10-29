import { Hono } from 'hono';
import {
  getUnreadAlerts,
  getAlertStats,
  markAlertAsRead,
  acknowledgeAlert,
  createAlert,
  Alert
} from '../services/alert-service';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { TokenPayload } from '../services/auth-service';
import { getCompanyScopeWhereIncludeNull, enforceCompanyId } from '../middleware/company-scoping';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

export const alertsRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/alerts
 * Get all alerts with optional filtering
 */
alertsRoutes.get('/', optionalAuth, async (c) => {
  try {
    const user = c.get('user') as TokenPayload | undefined;
    const unreadOnly = c.req.query('unread') === 'true';
    const severity = c.req.query('severity');
    const commodityCode = c.req.query('commodity_code');
    const limit = parseInt(c.req.query('limit') || '100');

    let query = `
      SELECT a.*, lc.reporting_limit_code, lc.pos_lots, lc.limit_lots
      FROM alerts a
      LEFT JOIN limit_calculations lc ON a.limit_calculation_id = lc.id
      WHERE 1=1
    `;

    const bindings: any[] = [];

    // Apply company scoping (include NULL company_id for system-generated alerts)
    const companyScope = getCompanyScopeWhereIncludeNull(c, 'a');
    if (companyScope.where) {
      query += companyScope.where;
      bindings.push(...companyScope.params);
    }

    if (user) {
      query += ` AND (a.user_id = ? OR a.user_id IS NULL)`;
      bindings.push(user.userId);
    }

    if (unreadOnly) {
      query += ` AND a.read = 0`;
    }

    if (severity) {
      query += ` AND a.severity = ?`;
      bindings.push(severity);
    }

    if (commodityCode) {
      query += ` AND a.commodity_code = ?`;
      bindings.push(commodityCode);
    }

    query += ` ORDER BY a.created_at DESC LIMIT ?`;
    bindings.push(limit);

    const result = await c.env.DB.prepare(query).bind(...bindings).all();

    // Get unread count with company scoping (include NULL company_id)
    let unreadCountQuery = `SELECT COUNT(*) as count FROM alerts WHERE read = 0`;
    const unreadBindings: any[] = [];

    // Re-use the same company scope (already includes NULL logic)
    if (companyScope.where) {
      unreadCountQuery += companyScope.where.replace(/a\./g, ''); // Remove table alias for simpler query
      unreadBindings.push(...companyScope.params);
    }

    if (user) {
      unreadCountQuery += ` AND (user_id = ? OR user_id IS NULL)`;
      unreadBindings.push(user.userId);
    }

    const unreadCount = await c.env.DB.prepare(unreadCountQuery)
      .bind(...unreadBindings)
      .first();

    return c.json({
      success: true,
      data: result.results,
      count: result.results.length,
      unread_count: unreadCount?.count || 0
    });

  } catch (error: any) {
    console.error('Get alerts error:', error);
    return c.json({
      success: false,
      error: 'Failed to get alerts',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/alerts/stats
 * Get alert statistics
 */
alertsRoutes.get('/stats', async (c) => {
  try {
    const stats = await getAlertStats(c.env.DB);

    return c.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('Get alert stats error:', error);
    return c.json({
      success: false,
      error: 'Failed to get alert statistics',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/alerts/:id
 * Get single alert by ID
 */
alertsRoutes.get('/:id', optionalAuth, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const user = c.get('user') as TokenPayload | undefined;

    let query = `
      SELECT a.*, lc.reporting_limit_code, lc.pos_lots, lc.limit_lots,
             u.name as acknowledged_by_name
      FROM alerts a
      LEFT JOIN limit_calculations lc ON a.limit_calculation_id = lc.id
      LEFT JOIN users u ON a.acknowledged_by = u.id
      WHERE a.id = ?
    `;

    const bindings: any[] = [id];

    if (user) {
      query += ` AND (a.user_id = ? OR a.user_id IS NULL)`;
      bindings.push(user.userId);
    }

    const alert = await c.env.DB.prepare(query).bind(...bindings).first();

    if (!alert) {
      return c.json({
        success: false,
        error: 'Alert not found'
      }, 404);
    }

    // Get alert history
    const history = await c.env.DB.prepare(`
      SELECT ah.*, u.name as performed_by_name
      FROM alert_history ah
      LEFT JOIN users u ON ah.performed_by = u.id
      WHERE ah.alert_id = ?
      ORDER BY ah.created_at DESC
    `).bind(id).all();

    return c.json({
      success: true,
      alert,
      history: history.results
    });

  } catch (error: any) {
    console.error('Get alert error:', error);
    return c.json({
      success: false,
      error: 'Failed to get alert',
      message: error.message
    }, 500);
  }
});

/**
 * POST /api/alerts
 * Create manual alert
 */
alertsRoutes.post('/', authenticate, authorize('alerts.create'), async (c) => {
  try {
    const user = c.get('user') as TokenPayload;
    const body = await c.req.json();

    // Enforce company scoping
    const company_id = enforceCompanyId(c, body);

    const alert: Alert = {
      user_id: body.user_id || null,
      company_id: company_id,
      trader_id: body.trader_id || null,
      limit_calculation_id: body.limit_calculation_id || null,
      alert_type: body.alert_type || 'manual',
      severity: body.severity || 'info',
      title: body.title,
      message: body.message,
      commodity_code: body.commodity_code || null,
      market_location: body.market_location || null,
      current_position: body.current_position || null,
      limit_value: body.limit_value || null,
      utilization_pct: body.utilization_pct || null,
      threshold_pct: body.threshold_pct || null,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      read: 0,
      acknowledged: 0
    };

    const alertId = await createAlert(c.env.DB, alert);

    // Log to history
    await c.env.DB.prepare(`
      INSERT INTO alert_history (alert_id, action, performed_by, notes)
      VALUES (?, 'created', ?, ?)
    `).bind(alertId, user.userId, 'Manual alert creation').run();

    return c.json({
      success: true,
      message: 'Alert created successfully',
      alert_id: alertId
    }, 201);

  } catch (error: any) {
    console.error('Create alert error:', error);
    return c.json({
      success: false,
      error: 'Failed to create alert',
      message: error.message
    }, 500);
  }
});

/**
 * PATCH /api/alerts/:id/read
 * Mark alert as read
 */
alertsRoutes.patch('/:id/read', optionalAuth, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const user = c.get('user') as TokenPayload | undefined;

    // Check alert exists and user has access
    let checkQuery = `SELECT id FROM alerts WHERE id = ?`;
    const checkBindings: any[] = [id];

    if (user) {
      checkQuery += ` AND (user_id = ? OR user_id IS NULL)`;
      checkBindings.push(user.userId);
    }

    const alert = await c.env.DB.prepare(checkQuery).bind(...checkBindings).first();

    if (!alert) {
      return c.json({
        success: false,
        error: 'Alert not found'
      }, 404);
    }

    await markAlertAsRead(c.env.DB, id);

    return c.json({
      success: true,
      message: 'Alert marked as read'
    });

  } catch (error: any) {
    console.error('Mark alert as read error:', error);
    return c.json({
      success: false,
      error: 'Failed to mark alert as read',
      message: error.message
    }, 500);
  }
});

/**
 * POST /api/alerts/:id/acknowledge
 * Acknowledge alert
 */
alertsRoutes.post('/:id/acknowledge', authenticate, authorize('alerts.acknowledge'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const user = c.get('user') as TokenPayload;
    const { notes } = await c.req.json();

    // Check alert exists
    const alert = await c.env.DB.prepare(`
      SELECT id, acknowledged FROM alerts WHERE id = ?
    `).bind(id).first();

    if (!alert) {
      return c.json({
        success: false,
        error: 'Alert not found'
      }, 404);
    }

    if (alert.acknowledged) {
      return c.json({
        success: false,
        error: 'Alert already acknowledged'
      }, 400);
    }

    await acknowledgeAlert(c.env.DB, id, user.userId, notes);

    return c.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });

  } catch (error: any) {
    console.error('Acknowledge alert error:', error);
    return c.json({
      success: false,
      error: 'Failed to acknowledge alert',
      message: error.message
    }, 500);
  }
});

/**
 * DELETE /api/alerts/:id
 * Delete alert
 */
alertsRoutes.delete('/:id', authenticate, authorize('alerts.create', 'system.configure'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const alert = await c.env.DB.prepare(`
      SELECT id FROM alerts WHERE id = ?
    `).bind(id).first();

    if (!alert) {
      return c.json({
        success: false,
        error: 'Alert not found'
      }, 404);
    }

    await c.env.DB.prepare(`
      DELETE FROM alerts WHERE id = ?
    `).bind(id).run();

    return c.json({
      success: true,
      message: 'Alert deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete alert error:', error);
    return c.json({
      success: false,
      error: 'Failed to delete alert',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/alerts/rules
 * Get alert rules
 */
alertsRoutes.get('/rules/list', authenticate, authorize('alerts.configure'), async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT * FROM alert_rules ORDER BY threshold_pct
    `).all();

    return c.json({
      success: true,
      data: result.results,
      count: result.results.length
    });

  } catch (error: any) {
    console.error('Get alert rules error:', error);
    return c.json({
      success: false,
      error: 'Failed to get alert rules',
      message: error.message
    }, 500);
  }
});

/**
 * PUT /api/alerts/rules/:id
 * Update alert rule
 */
alertsRoutes.put('/rules/:id', authenticate, authorize('alerts.configure'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    const rule = await c.env.DB.prepare(`
      SELECT id FROM alert_rules WHERE id = ?
    `).bind(id).first();

    if (!rule) {
      return c.json({
        success: false,
        error: 'Alert rule not found'
      }, 404);
    }

    await c.env.DB.prepare(`
      UPDATE alert_rules
      SET threshold_pct = ?,
          severity = ?,
          is_active = ?,
          notify_email = ?,
          notify_sms = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      body.threshold_pct,
      body.severity,
      body.is_active ? 1 : 0,
      body.notify_email ? 1 : 0,
      body.notify_sms ? 1 : 0,
      id
    ).run();

    return c.json({
      success: true,
      message: 'Alert rule updated successfully'
    });

  } catch (error: any) {
    console.error('Update alert rule error:', error);
    return c.json({
      success: false,
      error: 'Failed to update alert rule',
      message: error.message
    }, 500);
  }
});

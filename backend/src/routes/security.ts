/**
 * Security Events Routes
 * Monitor and manage security events
 */

import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';

const app = new Hono();

/**
 * GET /api/security/events
 * Get all security events
 */
app.get('/events', authenticate, authorize('security.read'), async (c) => {
  try {
    const severity = c.req.query('severity');
    const eventType = c.req.query('event_type');
    const isResolved = c.req.query('is_resolved');
    const limit = parseInt(c.req.query('limit') || '100');

    let query = `SELECT * FROM v_security_events_summary WHERE 1=1`;
    const params: any[] = [];

    if (severity) {
      query += ` AND severity = ?`;
      params.push(severity);
    }

    if (eventType) {
      query += ` AND event_type = ?`;
      params.push(eventType);
    }

    if (isResolved !== undefined) {
      query += ` AND is_resolved = ?`;
      params.push(isResolved === 'true' ? 1 : 0);
    }

    query += ` ORDER BY detected_at DESC LIMIT ?`;
    params.push(limit);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      data: result.results,
      count: result.results.length,
    });
  } catch (error: any) {
    console.error('[API] Error getting security events:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve security events',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/security/events/stats
 * Get security event statistics
 */
app.get('/events/stats', authenticate, authorize('security.read'), async (c) => {
  try {
    const stats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_events,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low,
        SUM(CASE WHEN is_resolved = 0 THEN 1 ELSE 0 END) as unresolved,
        SUM(CASE WHEN is_resolved = 1 THEN 1 ELSE 0 END) as resolved
      FROM security_events
      WHERE detected_at >= datetime('now', '-7 days')
    `).first();

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[API] Error getting security event stats:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve security event statistics',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/security/events/:id/resolve
 * Mark a security event as resolved
 */
app.post('/events/:id/resolve', authenticate, authorize('security.manage'), async (c) => {
  try {
    const user = c.get('user');
    const eventId = parseInt(c.req.param('id'));
    const { resolution_notes } = await c.req.json().catch(() => ({}));

    await c.env.DB.prepare(`
      UPDATE security_events
      SET is_resolved = 1,
          resolved_at = datetime('now'),
          resolved_by = ?,
          resolution_notes = ?
      WHERE id = ?
    `).bind(user.id, resolution_notes || 'Resolved', eventId).run();

    return c.json({
      success: true,
      message: 'Security event marked as resolved',
    });
  } catch (error: any) {
    console.error('[API] Error resolving security event:', error);
    return c.json({
      success: false,
      error: 'Failed to resolve security event',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/security/failed-logins
 * Get failed login analysis
 */
app.get('/failed-logins', authenticate, authorize('security.read'), async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT * FROM v_failed_login_analysis
      ORDER BY attempt_count DESC
      LIMIT 50
    `).all();

    return c.json({
      success: true,
      data: result.results,
      count: result.results.length,
    });
  } catch (error: any) {
    console.error('[API] Error getting failed logins:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve failed login attempts',
      message: error.message,
    }, 500);
  }
});

export default app;

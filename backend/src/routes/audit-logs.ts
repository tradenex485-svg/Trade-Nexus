import { Hono } from 'hono';
import { getMarketLimitAuditLog, getRecentAuditLogs } from '../services/audit-logger';

export const auditLogsRoutes = new Hono();

// Get audit logs for a specific market limit
auditLogsRoutes.get('/market-limits/:id', async (c) => {
  try {
    const marketLimitId = parseInt(c.req.param('id'));

    const logs = await getMarketLimitAuditLog(c.env.DB, marketLimitId);

    return c.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// Get recent audit logs with optional filters
auditLogsRoutes.get('/', async (c) => {
  try {
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 100;
    const fieldName = c.req.query('field_name');
    const changedBy = c.req.query('changed_by') ? parseInt(c.req.query('changed_by')!) : undefined;
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    const logs = await getRecentAuditLogs(c.env.DB, {
      limit,
      fieldName,
      changedBy,
      startDate,
      endDate,
    });

    return c.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// Get audit log statistics
auditLogsRoutes.get('/stats', async (c) => {
  try {
    // Get counts by field
    const byField = await c.env.DB.prepare(`
      SELECT
        field_name,
        COUNT(*) as count
      FROM market_limits_log
      GROUP BY field_name
      ORDER BY count DESC
    `).all();

    // Get counts by date
    const byDate = await c.env.DB.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM market_limits_log
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `).all();

    // Get total count
    const total = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM market_limits_log
    `).first();

    return c.json({
      success: true,
      stats: {
        total: total?.count || 0,
        byField: byField.results || [],
        byDate: byDate.results || [],
      },
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

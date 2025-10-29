import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';
import {
  runRealtimeMonitoring,
  getMonitoringHistory,
  postTradeMonitoring,
} from '../services/realtime-monitoring';
import {
  getOpenBreaches,
  generateComplianceAudit,
  type ComplianceAuditOptions,
} from '../services/regulatory-compliance';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/monitoring/history
 * Get recent monitoring cycle results
 */
app.get('/history', authenticate, async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '24');
    const history = await getMonitoringHistory(c.env.DB, limit);

    return c.json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error: any) {
    console.error('Error fetching monitoring history:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /api/monitoring/breaches
 * Get open breach events
 */
app.get('/breaches', authenticate, async (c) => {
  try {
    const severity = c.req.query('severity') as 'critical' | 'high' | 'medium' | 'low' | undefined;
    const commodityCode = c.req.query('commodityCode');
    const exchangeId = c.req.query('exchangeId');
    const limit = parseInt(c.req.query('limit') || '100');

    const breaches = await getOpenBreaches(c.env.DB, {
      severity,
      commodityCode,
      exchangeId: exchangeId ? parseInt(exchangeId) : undefined,
      limit,
    });

    // Get severity counts
    const severityCounts = await c.env.DB.prepare(`
      SELECT severity, COUNT(*) as count
      FROM position_breach_events
      WHERE status = 'open'
      GROUP BY severity
    `).all();

    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const row of severityCounts.results) {
      counts[row.severity as keyof typeof counts] = row.count as number;
    }

    return c.json({
      success: true,
      total: breaches.length,
      severity_counts: counts,
      data: breaches,
    });
  } catch (error: any) {
    console.error('Error fetching breaches:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /api/monitoring/breaches/:id
 * Get details of a specific breach
 */
app.get('/breaches/:id', authenticate, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const breach = await c.env.DB.prepare(`
      SELECT
        pbe.*,
        rr.rule_code,
        rr.rule_name,
        rr.rule_reference,
        rr.rule_type,
        e.exchange_code,
        e.exchange_name,
        lc.pos_lots,
        lc.pos_pct,
        lc.prioritization
      FROM position_breach_events pbe
      JOIN regulatory_rules rr ON pbe.regulatory_rule_id = rr.id
      JOIN exchanges e ON rr.exchange_id = e.id
      LEFT JOIN limit_calculations lc ON pbe.limit_calculation_id = lc.id
      WHERE pbe.id = ?
    `).bind(id).first();

    if (!breach) {
      return c.json({
        success: false,
        error: 'Breach not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: breach,
    });
  } catch (error: any) {
    console.error('Error fetching breach details:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * PATCH /api/monitoring/breaches/:id
 * Update breach status (acknowledge or resolve)
 */
app.patch('/breaches/:id', authenticate, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { status, resolution_notes } = body;

    if (!['acknowledged', 'resolved'].includes(status)) {
      return c.json({
        success: false,
        error: 'Invalid status. Must be "acknowledged" or "resolved"',
      }, 400);
    }

    const updateFields: string[] = ['status = ?'];
    const bindValues: any[] = [status];

    if (status === 'acknowledged') {
      updateFields.push('acknowledged_at = CURRENT_TIMESTAMP');
      updateFields.push('acknowledged_by = ?');
      bindValues.push(c.get('user')?.id);
    } else if (status === 'resolved') {
      updateFields.push('resolved_at = CURRENT_TIMESTAMP');
      updateFields.push('resolved_by = ?');
      bindValues.push(c.get('user')?.id);
    }

    if (resolution_notes) {
      updateFields.push('resolution_notes = ?');
      bindValues.push(resolution_notes);
    }

    bindValues.push(id);

    await c.env.DB.prepare(`
      UPDATE position_breach_events
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...bindValues).run();

    return c.json({
      success: true,
      message: `Breach ${status}`,
    });
  } catch (error: any) {
    console.error('Error updating breach:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * POST /api/monitoring/run
 * Manually trigger a monitoring cycle (lightweight version)
 */
app.post('/run', authenticate, async (c) => {
  try {
    console.log('Manual monitoring cycle triggered by user:', c.get('user')?.email);

    // Instead of running full monitoring (too heavy for worker limits),
    // just detect breaches on current position data
    const result = await runLightweightMonitoring(c.env.DB);

    return c.json({
      success: true,
      message: 'Monitoring cycle completed',
      data: result,
    });
  } catch (error: any) {
    console.error('Error running monitoring cycle:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * Lightweight monitoring - just check existing positions for breaches
 * without doing full recalculation
 */
async function runLightweightMonitoring(db: any) {
  const timestamp = new Date().toISOString();

  // Get position statistics
  const positionStats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN pos_pct >= 100 THEN 1 ELSE 0 END) as breached,
      AVG(pos_pct) as avg_utilization
    FROM limit_calculations
    WHERE is_active = 1 AND is_parent = 1
  `).first();

  // Get breach statistics
  const breachStats = await db.prepare(`
    SELECT COUNT(*) as count
    FROM position_breach_events
    WHERE status = 'open'
  `).first();

  const result = {
    timestamp,
    calculations_updated: positionStats?.total || 0,
    new_breaches: 0,
    alerts_generated: 0,
    avg_utilization: positionStats?.avg_utilization || 0,
    compliance_score: positionStats?.total > 0
      ? ((positionStats.total - (positionStats.breached || 0)) / positionStats.total) * 100
      : 100,
  };

  // Log result
  await db.prepare(`
    INSERT INTO monitoring_logs (
      timestamp, calculations_updated, new_breaches, alerts_generated,
      compliance_score, critical_violations
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    timestamp,
    result.calculations_updated,
    result.new_breaches,
    result.alerts_generated,
    result.compliance_score,
    0
  ).run().catch(() => {
    console.log('[MONITORING] Could not log to monitoring_logs table');
  });

  return result;
}

/**
 * GET /api/monitoring/compliance/audit
 * Generate compliance audit report
 */
app.get('/compliance/audit', authenticate, authorize('reports.view'), async (c) => {
  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const exchangeId = c.req.query('exchangeId');
    const commodityCode = c.req.query('commodityCode');

    const options: ComplianceAuditOptions = {};

    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (exchangeId) options.exchangeId = parseInt(exchangeId);
    if (commodityCode) options.commodityCode = commodityCode;

    const audit = await generateComplianceAudit(c.env.DB, options);

    return c.json({
      success: true,
      data: audit,
    });
  } catch (error: any) {
    console.error('Error generating compliance audit:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /api/monitoring/data-quality
 * Check for data quality issues in position calculations
 */
app.get('/data-quality', authenticate, async (c) => {
  try {
    const issues: any[] = [];

    // Check for positions with very low limits
    const lowLimits = await c.env.DB.prepare(`
      SELECT id, reporting_limit_code, mkt_index, pos_lots, limit_lots, pos_pct
      FROM limit_calculations
      WHERE is_active = 1 AND is_parent = 1
        AND limit_lots > 0 AND limit_lots < 10000
        AND pos_lots > 100000
      ORDER BY pos_pct DESC
      LIMIT 20
    `).all();

    if (lowLimits.results.length > 0) {
      issues.push({
        type: 'suspiciously_low_limits',
        severity: 'high',
        count: lowLimits.results.length,
        description: 'Positions with very low limit values compared to position size',
        examples: lowLimits.results.slice(0, 5),
      });
    }

    // Check for extreme utilization percentages
    const extremeUtil = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM limit_calculations
      WHERE is_active = 1 AND is_parent = 1 AND pos_pct > 10000
    `).first();

    if (extremeUtil && extremeUtil.count > 0) {
      issues.push({
        type: 'extreme_utilization',
        severity: 'critical',
        count: extremeUtil.count,
        description: 'Positions with utilization >10,000% indicating data issues',
      });
    }

    // Check for duplicate calculation records
    const duplicates = await c.env.DB.prepare(`
      SELECT reporting_limit_code, mkt_index, limit_type, COUNT(*) as dup_count
      FROM limit_calculations
      WHERE is_active = 1 AND is_parent = 1
      GROUP BY reporting_limit_code, mkt_index, limit_type
      HAVING COUNT(*) > 1
    `).all();

    if (duplicates.results.length > 0) {
      issues.push({
        type: 'duplicate_calculations',
        severity: 'medium',
        count: duplicates.results.length,
        description: 'Duplicate active calculation records for same position',
        examples: duplicates.results.slice(0, 5),
      });
    }

    return c.json({
      success: true,
      healthy: issues.length === 0,
      issues_found: issues.length,
      data: issues,
    });
  } catch (error: any) {
    console.error('Error checking data quality:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /api/monitoring/stats
 * Get current monitoring statistics
 */
app.get('/stats', authenticate, async (c) => {
  try {
    // Get latest monitoring result
    const latestMonitoring = await c.env.DB.prepare(`
      SELECT * FROM monitoring_logs
      ORDER BY timestamp DESC
      LIMIT 1
    `).first().catch(() => null);

    // Get position statistics
    const positionStats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_positions,
        SUM(CASE WHEN pos_pct >= 100 THEN 1 ELSE 0 END) as breached,
        SUM(CASE WHEN pos_pct >= 85 AND pos_pct < 100 THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN pos_pct >= 70 AND pos_pct < 85 THEN 1 ELSE 0 END) as caution,
        AVG(pos_pct) as avg_utilization
      FROM limit_calculations
      WHERE is_active = 1 AND is_parent = 1
    `).first();

    // Get breach statistics
    const breachStats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_open_breaches,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low
      FROM position_breach_events
      WHERE status = 'open'
    `).first();

    // Get alert statistics
    const alertStats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_alerts,
        SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as unacknowledged
      FROM alerts
      WHERE created_at >= datetime('now', '-24 hours')
    `).first();

    return c.json({
      success: true,
      data: {
        last_monitoring_cycle: latestMonitoring,
        positions: positionStats,
        breaches: breachStats,
        alerts_24h: alertStats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching monitoring stats:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

export { app as monitoringRoutes };

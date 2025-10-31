import { Hono } from 'hono';
import { authenticate, requireRole } from '../middleware/auth';
import {
  runQualityChecks,
  detectDuplicates,
  findOrphanedRecords,
  checkMissingData,
  reconcileData,
  trackDataLineage,
} from '../services/data-quality-service';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

export const dataQualityRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/data-quality/dashboard
 * Get comprehensive data quality metrics dashboard
 */
dataQualityRoutes.get('/dashboard', authenticate, async (c) => {
  try {
    // Get latest quality check
    const latestCheck = await c.env.DB.prepare(`
      SELECT * FROM data_quality_checks
      ORDER BY check_date DESC
      LIMIT 1
    `).first();

    // Get open issues by severity
    const issuesBySeverity = await c.env.DB.prepare(`
      SELECT severity, COUNT(*) as count
      FROM data_quality_issues
      WHERE status = 'open'
      GROUP BY severity
    `).all();

    // Get issues by type
    const issuesByType = await c.env.DB.prepare(`
      SELECT issue_type, COUNT(*) as count
      FROM data_quality_issues
      WHERE status = 'open'
      GROUP BY issue_type
    `).all();

    // Get quality trend (last 30 days)
    const qualityTrend = await c.env.DB.prepare(`
      SELECT
        DATE(check_date) as date,
        quality_score,
        issues_found
      FROM data_quality_checks
      WHERE check_date >= DATE('now', '-30 days')
      ORDER BY check_date ASC
    `).all();

    // Get recent checks
    const recentChecks = await c.env.DB.prepare(`
      SELECT * FROM data_quality_checks
      ORDER BY check_date DESC
      LIMIT 10
    `).all();

    return c.json({
      success: true,
      dashboard: {
        latest_check: latestCheck,
        issues_by_severity: issuesBySeverity.results,
        issues_by_type: issuesByType.results,
        quality_trend: qualityTrend.results,
        recent_checks: recentChecks.results,
      },
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to load dashboard',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/data-quality/issues
 * Get list of data quality issues with filters
 */
dataQualityRoutes.get('/issues', authenticate, async (c) => {
  try {
    const status = c.req.query('status') || 'open';
    const severity = c.req.query('severity');
    const issueType = c.req.query('issue_type');
    const tableName = c.req.query('table_name');
    const limit = parseInt(c.req.query('limit') || '100');

    let query = 'SELECT * FROM data_quality_issues WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    if (issueType) {
      query += ' AND issue_type = ?';
      params.push(issueType);
    }

    if (tableName) {
      query += ' AND table_name = ?';
      params.push(tableName);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const stmt = c.env.DB.prepare(query);
    const result = await stmt.bind(...params).all();

    return c.json({
      success: true,
      issues: result.results,
      count: result.results.length,
    });
  } catch (error: any) {
    console.error('Get issues error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get issues',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/data-quality/rules
 * Get data quality rules
 */
dataQualityRoutes.get('/rules', authenticate, async (c) => {
  try {
    const includeInactive = c.req.query('include_inactive') === 'true';

    const query = includeInactive
      ? 'SELECT * FROM data_quality_rules ORDER BY rule_name ASC'
      : 'SELECT * FROM data_quality_rules WHERE is_active = 1 ORDER BY rule_name ASC';

    const result = await c.env.DB.prepare(query).all();

    return c.json({
      success: true,
      rules: result.results,
      count: result.results.length,
    });
  } catch (error: any) {
    console.error('Get rules error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get rules',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/data-quality/rules
 * Create new quality rule
 * Requires admin or compliance role
 */
dataQualityRoutes.post('/rules', authenticate, requireRole('admin', 'compliance_officer', 'super_admin'), async (c) => {
  try {
    const body = await c.req.json();

    const { rule_name, rule_type, target_table, target_field, rule_config, severity, description } = body;

    if (!rule_name || !rule_type || !target_table || !rule_config) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: rule_name, rule_type, target_table, rule_config',
        },
        400
      );
    }

    const configStr = typeof rule_config === 'string' ? rule_config : JSON.stringify(rule_config);

    const result = await c.env.DB.prepare(`
      INSERT INTO data_quality_rules (
        rule_name, rule_type, target_table, target_field, rule_config, severity, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      rule_name,
      rule_type,
      target_table,
      target_field || null,
      configStr,
      severity || 'medium',
      description || null
    ).run();

    return c.json(
      {
        success: true,
        message: 'Rule created successfully',
        id: result.meta.last_row_id,
      },
      201
    );
  } catch (error: any) {
    console.error('Create rule error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create rule',
        message: error.message,
      },
      500
    );
  }
});

/**
 * PUT /api/data-quality/rules/:id
 * Update quality rule
 * Requires admin or compliance role
 */
dataQualityRoutes.put('/rules/:id', authenticate, requireRole('admin', 'compliance_officer', 'super_admin'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    const { rule_name, rule_type, target_table, target_field, rule_config, severity, description, is_active } = body;

    const configStr = typeof rule_config === 'string' ? rule_config : JSON.stringify(rule_config);

    await c.env.DB.prepare(`
      UPDATE data_quality_rules
      SET rule_name = ?,
          rule_type = ?,
          target_table = ?,
          target_field = ?,
          rule_config = ?,
          severity = ?,
          description = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      rule_name,
      rule_type,
      target_table,
      target_field || null,
      configStr,
      severity || 'medium',
      description || null,
      is_active !== false ? 1 : 0,
      id
    ).run();

    return c.json({
      success: true,
      message: 'Rule updated successfully',
    });
  } catch (error: any) {
    console.error('Update rule error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to update rule',
        message: error.message,
      },
      500
    );
  }
});

/**
 * DELETE /api/data-quality/rules/:id
 * Delete quality rule
 * Requires admin or superadmin role
 */
dataQualityRoutes.delete('/rules/:id', authenticate, requireRole('admin', 'super_admin'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    await c.env.DB.prepare('DELETE FROM data_quality_rules WHERE id = ?').bind(id).run();

    return c.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete rule error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to delete rule',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/data-quality/run
 * Manually trigger quality checks
 * Requires admin or compliance role
 */
dataQualityRoutes.post('/run', authenticate, requireRole('admin', 'compliance_officer', 'super_admin'), async (c) => {
  try {
    console.log('Running manual quality checks...');

    const result = await runQualityChecks(c.env.DB, 'manual');

    return c.json({
      success: true,
      message: 'Quality checks completed',
      result,
    });
  } catch (error: any) {
    console.error('Run quality checks error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to run quality checks',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/data-quality/reconciliation
 * Get reconciliation status and history
 */
dataQualityRoutes.get('/reconciliation', authenticate, async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20');

    const reconciliations = await c.env.DB.prepare(`
      SELECT * FROM data_reconciliation
      ORDER BY reconciliation_date DESC
      LIMIT ?
    `).bind(limit).all();

    return c.json({
      success: true,
      reconciliations: reconciliations.results,
      count: reconciliations.results.length,
    });
  } catch (error: any) {
    console.error('Get reconciliation error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get reconciliation data',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/data-quality/reconciliation
 * Run data reconciliation
 * Requires admin or compliance role
 */
dataQualityRoutes.post('/reconciliation', authenticate, requireRole('admin', 'compliance_officer', 'super_admin'), async (c) => {
  try {
    const body = await c.req.json();
    const { source_table, target_table, reconciliation_key } = body;

    if (!source_table || !target_table || !reconciliation_key) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: source_table, target_table, reconciliation_key',
        },
        400
      );
    }

    const result = await reconcileData(c.env.DB, source_table, target_table, reconciliation_key);

    return c.json({
      success: true,
      message: 'Reconciliation completed',
      result,
    });
  } catch (error: any) {
    console.error('Reconciliation error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to reconcile data',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/data-quality/lineage/:table/:id
 * Get data lineage for a specific record
 */
dataQualityRoutes.get('/lineage/:table/:id', authenticate, async (c) => {
  try {
    const table = c.req.param('table');
    const id = parseInt(c.req.param('id'));

    // Get lineage where this is the source
    const asSource = await c.env.DB.prepare(`
      SELECT * FROM data_lineage
      WHERE source_table = ? AND source_id = ?
      ORDER BY transformation_date DESC
    `).bind(table, id).all();

    // Get lineage where this is the target
    const asTarget = await c.env.DB.prepare(`
      SELECT * FROM data_lineage
      WHERE target_table = ? AND target_id = ?
      ORDER BY transformation_date DESC
    `).bind(table, id).all();

    return c.json({
      success: true,
      lineage: {
        as_source: asSource.results,
        as_target: asTarget.results,
      },
    });
  } catch (error: any) {
    console.error('Get lineage error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get data lineage',
        message: error.message,
      },
      500
    );
  }
});

/**
 * PUT /api/data-quality/issues/:id
 * Update issue status (resolve, ignore)
 * Requires admin or compliance role
 */
dataQualityRoutes.put('/issues/:id', authenticate, requireRole('admin', 'compliance_officer', 'super_admin'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    const { status, resolution_notes } = body;

    if (!status) {
      return c.json(
        {
          success: false,
          error: 'status is required',
        },
        400
      );
    }

    const resolvedAt = ['resolved', 'ignored'].includes(status) ? new Date().toISOString() : null;

    await c.env.DB.prepare(`
      UPDATE data_quality_issues
      SET status = ?,
          resolved_at = ?,
          resolution_notes = ?
      WHERE id = ?
    `).bind(
      status,
      resolvedAt,
      resolution_notes || null,
      id
    ).run();

    return c.json({
      success: true,
      message: 'Issue updated successfully',
    });
  } catch (error: any) {
    console.error('Update issue error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to update issue',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/data-quality/uploads
 * Get file upload history
 */
dataQualityRoutes.get('/uploads', authenticate, async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const status = c.req.query('status');

    let query = 'SELECT * FROM file_uploads WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND upload_status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const stmt = c.env.DB.prepare(query);
    const result = await stmt.bind(...params).all();

    return c.json({
      success: true,
      uploads: result.results,
      count: result.results.length,
    });
  } catch (error: any) {
    console.error('Get uploads error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get upload history',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/data-quality/stats
 * Get overall data quality statistics
 */
dataQualityRoutes.get('/stats', authenticate, async (c) => {
  try {
    // Total issues
    const totalIssues = await c.env.DB.prepare('SELECT COUNT(*) as count FROM data_quality_issues').first();

    // Open issues
    const openIssues = await c.env.DB.prepare('SELECT COUNT(*) as count FROM data_quality_issues WHERE status = \'open\'').first();

    // Total checks run
    const totalChecks = await c.env.DB.prepare('SELECT COUNT(*) as count FROM data_quality_checks').first();

    // Average quality score
    const avgScore = await c.env.DB.prepare(`
      SELECT AVG(quality_score) as avg_score
      FROM data_quality_checks
      WHERE check_date >= DATE('now', '-30 days')
    `).first();

    return c.json({
      success: true,
      stats: {
        total_issues: totalIssues?.count || 0,
        open_issues: openIssues?.count || 0,
        total_checks: totalChecks?.count || 0,
        avg_quality_score: avgScore?.avg_score || 0,
      },
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get statistics',
        message: error.message,
      },
      500
    );
  }
});

/**
 * Report Generation Service
 * Generates compliance and operational reports from database
 */

export interface ReportParams {
  startDate?: string;
  endDate?: string;
  commodityCode?: string;
  limitType?: number;
}

/**
 * Generate Position Report
 * Current positions vs limits for all active markets
 */
export async function generatePositionReport(db: any, params?: ReportParams) {
  const limitType = params?.limitType || 1;

  // Get all active positions
  const positions = await db
    .prepare(
      `
    SELECT
      lc.mkt_index,
      lc.reporting_limit_code,
      lc.contract_month,
      lc.pos_lots,
      lc.limit_lots,
      lc.pos_pct,
      lc.prioritization,
      lc.limit_exemption,
      lc.limit_type,
      lc.as_of_date
    FROM limit_calculations lc
    WHERE lc.is_active = 1 AND lc.limit_type = ?
    ORDER BY lc.pos_pct DESC
  `
    )
    .bind(limitType)
    .all();

  // Get status counts
  const statusCounts = await db
    .prepare(
      `
    SELECT
      SUM(CASE WHEN prioritization = 'Monitor' THEN 1 ELSE 0 END) as monitor,
      SUM(CASE WHEN prioritization = 'Validate' THEN 1 ELSE 0 END) as validate,
      SUM(CASE WHEN prioritization = 'Remediate' THEN 1 ELSE 0 END) as remediate,
      SUM(CASE WHEN prioritization = 'Breached' THEN 1 ELSE 0 END) as breached,
      COUNT(*) as total,
      AVG(pos_pct) as avg_utilization,
      MAX(pos_pct) as max_utilization
    FROM limit_calculations
    WHERE is_active = 1 AND limit_type = ?
  `
    )
    .bind(limitType)
    .first();

  return {
    report_type: 'position',
    generated_at: new Date().toISOString(),
    parameters: { limit_type: limitType },
    summary: {
      total_positions: statusCounts?.total || 0,
      monitor: statusCounts?.monitor || 0,
      validate: statusCounts?.validate || 0,
      remediate: statusCounts?.remediate || 0,
      breached: statusCounts?.breached || 0,
      avg_utilization: statusCounts?.avg_utilization || 0,
      max_utilization: statusCounts?.max_utilization || 0,
    },
    positions: positions.results || [],
  };
}

/**
 * Generate Compliance Report
 * Breaches, near-breaches, exemptions, and compliance score
 */
export async function generateComplianceReport(
  db: any,
  startDate: string,
  endDate: string
) {
  // Get breaches during period
  const breaches = await db
    .prepare(
      `
    SELECT
      lcs.as_of_date,
      lcs.mkt_index,
      lcs.reporting_limit_code,
      lcs.pos_pct,
      lcs.pos_lots,
      lcs.limit_lots
    FROM limit_calculation_series lcs
    WHERE lcs.pos_pct >= 100
      AND DATE(lcs.as_of_date) >= DATE(?)
      AND DATE(lcs.as_of_date) <= DATE(?)
    ORDER BY lcs.as_of_date DESC, lcs.pos_pct DESC
  `
    )
    .bind(startDate, endDate)
    .all();

  // Get near-breaches (90-99%)
  const nearBreaches = await db
    .prepare(
      `
    SELECT
      lcs.as_of_date,
      lcs.mkt_index,
      lcs.reporting_limit_code,
      lcs.pos_pct,
      lcs.pos_lots,
      lcs.limit_lots
    FROM limit_calculation_series lcs
    WHERE lcs.pos_pct >= 90 AND lcs.pos_pct < 100
      AND DATE(lcs.as_of_date) >= DATE(?)
      AND DATE(lcs.as_of_date) <= DATE(?)
    ORDER BY lcs.as_of_date DESC, lcs.pos_pct DESC
    LIMIT 50
  `
    )
    .bind(startDate, endDate)
    .all();

  // Get exemptions used during period
  const exemptions = await db
    .prepare(
      `
    SELECT
      le.commodity_code,
      le.exemption_spot_month,
      le.exemption_one_month,
      le.exemption_all_month,
      le.start_date,
      le.end_date,
      le.approval_date
    FROM limit_exemptions le
    WHERE le.deleted_at IS NULL
      AND ((DATE(le.start_date) >= DATE(?) AND DATE(le.start_date) <= DATE(?))
        OR (DATE(le.end_date) >= DATE(?) AND DATE(le.end_date) <= DATE(?)))
  `
    )
    .bind(startDate, endDate, startDate, endDate)
    .all();

  // Get current action items (active breaches/remediates)
  const actionItems = await db
    .prepare(
      `
    SELECT
      lc.mkt_index,
      lc.reporting_limit_code,
      lc.pos_pct,
      lc.prioritization
    FROM limit_calculations lc
    WHERE lc.is_active = 1
      AND lc.prioritization IN ('Breached', 'Remediate')
    ORDER BY lc.pos_pct DESC
  `
    )
    .all();

  // Calculate compliance score
  const breachCount = breaches.results?.length || 0;
  const nearBreachCount = nearBreaches.results?.length || 0;
  const actionItemCount = actionItems.results?.length || 0;

  let complianceScore = 100;
  complianceScore -= breachCount * 10;
  complianceScore -= nearBreachCount * 2;
  complianceScore -= actionItemCount * 5;
  complianceScore = Math.max(0, Math.min(100, complianceScore));

  return {
    report_type: 'compliance',
    generated_at: new Date().toISOString(),
    period: { start_date: startDate, end_date: endDate },
    compliance_score: complianceScore,
    summary: {
      total_breaches: breachCount,
      near_breaches: nearBreachCount,
      exemptions_applied: exemptions.results?.length || 0,
      action_items: actionItemCount,
    },
    breaches: breaches.results || [],
    near_breaches: nearBreaches.results || [],
    exemptions: exemptions.results || [],
    action_items: actionItems.results || [],
  };
}

/**
 * Generate Breach Analysis Report
 * Detailed breach history and analysis
 */
export async function generateBreachReport(
  db: any,
  startDate: string,
  endDate: string
) {
  // Get all breaches with details
  const breaches = await db
    .prepare(
      `
    SELECT
      lcs.as_of_date,
      lcs.mkt_index,
      lcs.reporting_limit_code,
      lcs.pos_pct,
      lcs.pos_lots,
      lcs.limit_lots,
      lcs.prioritization
    FROM limit_calculation_series lcs
    WHERE lcs.pos_pct >= 100
      AND DATE(lcs.as_of_date) >= DATE(?)
      AND DATE(lcs.as_of_date) <= DATE(?)
    ORDER BY lcs.as_of_date DESC
  `
    )
    .bind(startDate, endDate)
    .all();

  // Get breach counts by commodity
  const byCommodity = await db
    .prepare(
      `
    SELECT
      lcs.reporting_limit_code,
      COUNT(*) as breach_count,
      AVG(lcs.pos_pct) as avg_breach_pct,
      MAX(lcs.pos_pct) as max_breach_pct
    FROM limit_calculation_series lcs
    WHERE lcs.pos_pct >= 100
      AND DATE(lcs.as_of_date) >= DATE(?)
      AND DATE(lcs.as_of_date) <= DATE(?)
    GROUP BY lcs.reporting_limit_code
    ORDER BY breach_count DESC
  `
    )
    .bind(startDate, endDate)
    .all();

  // Get breach counts by date
  const byDate = await db
    .prepare(
      `
    SELECT
      DATE(lcs.as_of_date) as date,
      COUNT(*) as breach_count
    FROM limit_calculation_series lcs
    WHERE lcs.pos_pct >= 100
      AND DATE(lcs.as_of_date) >= DATE(?)
      AND DATE(lcs.as_of_date) <= DATE(?)
    GROUP BY DATE(lcs.as_of_date)
    ORDER BY date DESC
  `
    )
    .bind(startDate, endDate)
    .all();

  return {
    report_type: 'breach_analysis',
    generated_at: new Date().toISOString(),
    period: { start_date: startDate, end_date: endDate },
    summary: {
      total_breaches: breaches.results?.length || 0,
      unique_markets: byCommodity.results?.length || 0,
      days_with_breaches: byDate.results?.length || 0,
    },
    breaches: breaches.results || [],
    by_commodity: byCommodity.results || [],
    by_date: byDate.results || [],
  };
}

/**
 * Generate Historical Trends Report
 * Time series analysis of position utilization
 */
export async function generateHistoricalReport(
  db: any,
  startDate: string,
  endDate: string
) {
  // Get daily aggregates
  const dailyTrends = await db
    .prepare(
      `
    SELECT
      DATE(lcs.as_of_date) as date,
      AVG(lcs.pos_pct) as avg_utilization,
      MAX(lcs.pos_pct) as max_utilization,
      MIN(lcs.pos_pct) as min_utilization,
      COUNT(*) as position_count,
      SUM(CASE WHEN lcs.pos_pct >= 100 THEN 1 ELSE 0 END) as breach_count
    FROM limit_calculation_series lcs
    WHERE DATE(lcs.as_of_date) >= DATE(?)
      AND DATE(lcs.as_of_date) <= DATE(?)
    GROUP BY DATE(lcs.as_of_date)
    ORDER BY date ASC
  `
    )
    .bind(startDate, endDate)
    .all();

  // Get trends by commodity
  const byCommodity = await db
    .prepare(
      `
    SELECT
      lcs.reporting_limit_code,
      AVG(lcs.pos_pct) as avg_utilization,
      MAX(lcs.pos_pct) as max_utilization,
      MIN(lcs.pos_pct) as min_utilization,
      COUNT(DISTINCT DATE(lcs.as_of_date)) as days_tracked
    FROM limit_calculation_series lcs
    WHERE DATE(lcs.as_of_date) >= DATE(?)
      AND DATE(lcs.as_of_date) <= DATE(?)
    GROUP BY lcs.reporting_limit_code
    ORDER BY avg_utilization DESC
    LIMIT 20
  `
    )
    .bind(startDate, endDate)
    .all();

  return {
    report_type: 'historical_trends',
    generated_at: new Date().toISOString(),
    period: { start_date: startDate, end_date: endDate },
    daily_trends: dailyTrends.results || [],
    by_commodity: byCommodity.results || [],
  };
}

/**
 * Generate Pre-Trade Validation Report
 * Summary of pre-trade checks performed
 */
export async function generatePreTradeReport(
  db: any,
  startDate: string,
  endDate: string
) {
  // Get validation stats
  const stats = await db
    .prepare(
      `
    SELECT
      COUNT(*) as total_checks,
      SUM(CASE WHEN validation_status = 'approved' THEN 1 ELSE 0 END) as auto_approved,
      SUM(CASE WHEN validation_status = 'requires_approval' THEN 1 ELSE 0 END) as requires_approval,
      SUM(CASE WHEN validation_status = 'blocked' THEN 1 ELSE 0 END) as blocked,
      AVG(projected_utilization_pct) as avg_projected_utilization,
      SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low_risk,
      SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) as medium_risk,
      SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high_risk,
      SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical_risk
    FROM pre_trade_checks
    WHERE DATE(created_at) >= DATE(?)
      AND DATE(created_at) <= DATE(?)
  `
    )
    .bind(startDate, endDate)
    .first();

  // Get checks by commodity
  const byCommodity = await db
    .prepare(
      `
    SELECT
      commodity_code,
      COUNT(*) as check_count,
      SUM(CASE WHEN validation_status = 'blocked' THEN 1 ELSE 0 END) as blocked_count,
      AVG(projected_utilization_pct) as avg_utilization
    FROM pre_trade_checks
    WHERE DATE(created_at) >= DATE(?)
      AND DATE(created_at) <= DATE(?)
    GROUP BY commodity_code
    ORDER BY check_count DESC
    LIMIT 20
  `
    )
    .bind(startDate, endDate)
    .all();

  // Get recent checks
  const recentChecks = await db
    .prepare(
      `
    SELECT
      ptc.commodity_code,
      ptc.market_location,
      ptc.trade_side,
      ptc.quantity,
      ptc.projected_utilization_pct,
      ptc.validation_status,
      ptc.risk_level,
      ptc.created_at
    FROM pre_trade_checks ptc
    WHERE DATE(ptc.created_at) >= DATE(?)
      AND DATE(ptc.created_at) <= DATE(?)
    ORDER BY ptc.created_at DESC
    LIMIT 50
  `
    )
    .bind(startDate, endDate)
    .all();

  return {
    report_type: 'pre_trade_validation',
    generated_at: new Date().toISOString(),
    period: { start_date: startDate, end_date: endDate },
    summary: {
      total_checks: stats?.total_checks || 0,
      auto_approved: stats?.auto_approved || 0,
      requires_approval: stats?.requires_approval || 0,
      blocked: stats?.blocked || 0,
      avg_projected_utilization: stats?.avg_projected_utilization || 0,
      risk_distribution: {
        low: stats?.low_risk || 0,
        medium: stats?.medium_risk || 0,
        high: stats?.high_risk || 0,
        critical: stats?.critical_risk || 0,
      },
    },
    by_commodity: byCommodity.results || [],
    recent_checks: recentChecks.results || [],
  };
}

/**
 * Generate Approval Workflow Report
 * Summary of trade approvals
 */
export async function generateApprovalReport(
  db: any,
  startDate: string,
  endDate: string
) {
  // Get approval stats
  const stats = await db
    .prepare(
      `
    SELECT
      COUNT(*) as total_requests,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN urgency = 'critical' THEN 1 ELSE 0 END) as critical_urgency,
      SUM(CASE WHEN urgency = 'high' THEN 1 ELSE 0 END) as high_urgency,
      SUM(CASE WHEN urgency = 'normal' THEN 1 ELSE 0 END) as normal_urgency
    FROM trade_approvals
    WHERE DATE(requested_at) >= DATE(?)
      AND DATE(requested_at) <= DATE(?)
  `
    )
    .bind(startDate, endDate)
    .first();

  // Get recent approvals
  const recentApprovals = await db
    .prepare(
      `
    SELECT
      ta.id,
      ta.status,
      ta.urgency,
      ta.requested_at,
      ta.reviewed_at,
      ptc.commodity_code,
      ptc.market_location,
      ptc.trade_side,
      ptc.quantity,
      ptc.projected_utilization_pct,
      u1.name as requested_by_name,
      u2.name as approved_by_name
    FROM trade_approvals ta
    JOIN pre_trade_checks ptc ON ta.pre_trade_check_id = ptc.id
    LEFT JOIN users u1 ON ta.requested_by = u1.id
    LEFT JOIN users u2 ON ta.approved_by = u2.id
    WHERE DATE(ta.requested_at) >= DATE(?)
      AND DATE(ta.requested_at) <= DATE(?)
      AND ta.status IN ('approved', 'rejected')
    ORDER BY ta.reviewed_at DESC
    LIMIT 50
  `
    )
    .bind(startDate, endDate)
    .all();

  // Calculate approval rate
  const approvalRate =
    stats?.total_requests > 0
      ? ((stats.approved / stats.total_requests) * 100).toFixed(2)
      : 0;

  return {
    report_type: 'approval_workflow',
    generated_at: new Date().toISOString(),
    period: { start_date: startDate, end_date: endDate },
    summary: {
      total_requests: stats?.total_requests || 0,
      approved: stats?.approved || 0,
      rejected: stats?.rejected || 0,
      pending: stats?.pending || 0,
      approval_rate: approvalRate,
      urgency_distribution: {
        critical: stats?.critical_urgency || 0,
        high: stats?.high_urgency || 0,
        normal: stats?.normal_urgency || 0,
      },
    },
    recent_approvals: recentApprovals.results || [],
  };
}

/**
 * Generate Audit Trail Report
 * Complete system activity log
 */
export async function generateAuditReport(
  db: any,
  startDate: string,
  endDate: string
) {
  // Get market limit changes
  const marketLimitChanges = await db
    .prepare(
      `
    SELECT
      mll.created_at,
      mll.field_name,
      mll.old_value,
      mll.new_value,
      ml.contract_name,
      ml.commodity_code,
      u.name as changed_by_name
    FROM market_limits_log mll
    JOIN market_limits ml ON mll.market_limit_id = ml.id
    LEFT JOIN users u ON mll.changed_by = u.id
    WHERE DATE(mll.created_at) >= DATE(?)
      AND DATE(mll.created_at) <= DATE(?)
    ORDER BY mll.created_at DESC
    LIMIT 100
  `
    )
    .bind(startDate, endDate)
    .all();

  // Get pre-trade audit trail
  const preTradeAudit = await db
    .prepare(
      `
    SELECT
      pta.created_at,
      pta.action,
      pta.details,
      ptc.commodity_code,
      ptc.market_location,
      u.name as performed_by_name
    FROM pre_trade_audit pta
    JOIN pre_trade_checks ptc ON pta.pre_trade_check_id = ptc.id
    LEFT JOIN users u ON pta.performed_by = u.id
    WHERE DATE(pta.created_at) >= DATE(?)
      AND DATE(pta.created_at) <= DATE(?)
    ORDER BY pta.created_at DESC
    LIMIT 100
  `
    )
    .bind(startDate, endDate)
    .all();

  return {
    report_type: 'audit_trail',
    generated_at: new Date().toISOString(),
    period: { start_date: startDate, end_date: endDate },
    summary: {
      market_limit_changes: marketLimitChanges.results?.length || 0,
      pre_trade_actions: preTradeAudit.results?.length || 0,
    },
    market_limit_changes: marketLimitChanges.results || [],
    pre_trade_audit: preTradeAudit.results || [],
  };
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], headers: string[]): string {
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header] || '';
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: any): string {
  return JSON.stringify(data, null, 2);
}

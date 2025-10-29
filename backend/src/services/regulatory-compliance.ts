/**
 * Regulatory Compliance Service
 * Enforces ICE, CFTC, CME, NYMEX exchange-specific position limit regulations
 */

export interface RegulatoryRule {
  id: number;
  exchange_id: number;
  exchange_code: string;
  exchange_name: string;
  rule_code: string;
  rule_name: string;
  rule_type: 'position_limit' | 'accountability_level' | 'reportable_threshold' | 'exemption';
  commodity_code: string;
  limit_category: 'spot_month' | 'single_month' | 'all_month';
  limit_value?: number;
  threshold_value?: number;
  calculation_method: 'net_long_short' | 'gross' | 'delta_adjusted';
  enforcement_action: 'block_trade' | 'require_approval' | 'notify_only' | 'report_required';
  rule_reference: string;
  description: string;
}

export interface ComplianceCheckResult {
  compliant: boolean;
  violations: RegulatoryViolation[];
  warnings: RegulatoryWarning[];
  reportable: boolean;
  enforcement_action?: string;
  applicable_rules: RegulatoryRule[];
}

export interface RegulatoryViolation {
  rule_id: number;
  rule_code: string;
  rule_name: string;
  violation_type: 'limit_exceeded' | 'accountability_triggered' | 'reportable_threshold';
  commodity_code: string;
  limit_category: string;
  limit_value: number;
  current_position: number;
  projected_position: number;
  utilization_pct: number;
  excess_amount: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  enforcement_action: string;
  rule_reference: string;
  message: string;
}

export interface RegulatoryWarning {
  rule_id: number;
  rule_code: string;
  message: string;
  warning_type: 'approaching_limit' | 'accountability_threshold' | 'reporting_required';
  utilization_pct: number;
}

export interface BreachEvent {
  company_id?: number;
  trader_id?: number;
  limit_calculation_id?: number;
  regulatory_rule_id: number;
  breach_type: string;
  commodity_code: string;
  market_location: string;
  contract_month?: string;
  limit_type: number;
  position_lots: number;
  limit_value: number;
  utilization_pct: number;
  breach_amount: number;
  severity: string;
  metadata?: any;
}

/**
 * Get applicable regulatory rules for a commodity and limit type
 */
export async function getApplicableRules(
  db: any,
  commodityCode: string,
  limitCategory: 'spot_month' | 'single_month' | 'all_month',
  exchangeId?: number
): Promise<RegulatoryRule[]> {
  let query = `
    SELECT
      rr.*,
      e.exchange_code,
      e.exchange_name
    FROM regulatory_rules rr
    JOIN exchanges e ON rr.exchange_id = e.id
    WHERE rr.commodity_code = ?
      AND rr.limit_category = ?
      AND rr.is_active = 1
      AND (rr.expiration_date IS NULL OR rr.expiration_date > DATE('now'))
  `;

  const params: any[] = [commodityCode, limitCategory];

  if (exchangeId) {
    query += ` AND rr.exchange_id = ?`;
    params.push(exchangeId);
  }

  query += ` ORDER BY
    CASE rr.rule_type
      WHEN 'position_limit' THEN 1
      WHEN 'accountability_level' THEN 2
      WHEN 'reportable_threshold' THEN 3
      ELSE 4
    END,
    rr.limit_value ASC
  `;

  const result = await db.prepare(query).bind(...params).all();
  return result.results as RegulatoryRule[];
}

/**
 * Check compliance against all applicable regulatory rules
 */
export async function checkRegulatoryCompliance(
  db: any,
  params: {
    commodityCode: string;
    marketLocation: string;
    limitCategory: 'spot_month' | 'single_month' | 'all_month';
    currentPosition: number;
    projectedPosition: number;
    exchangeId?: number;
    companyId?: number;
    traderId?: number;
  }
): Promise<ComplianceCheckResult> {
  const {
    commodityCode,
    marketLocation,
    limitCategory,
    currentPosition,
    projectedPosition,
    exchangeId,
  } = params;

  // Get all applicable regulatory rules
  const rules = await getApplicableRules(db, commodityCode, limitCategory, exchangeId);

  const violations: RegulatoryViolation[] = [];
  const warnings: RegulatoryWarning[] = [];
  let compliant = true;
  let reportable = false;
  let enforcement_action: string | undefined = undefined;

  for (const rule of rules) {
    const limitValue = rule.limit_value || rule.threshold_value || 0;
    const positionToCheck = Math.abs(projectedPosition);
    const utilization = limitValue > 0 ? (positionToCheck / limitValue) * 100 : 0;
    const excessAmount = positionToCheck - limitValue;

    // Check for violations based on rule type
    if (rule.rule_type === 'position_limit' && positionToCheck > limitValue) {
      // Hard position limit exceeded
      compliant = false;
      violations.push({
        rule_id: rule.id,
        rule_code: rule.rule_code,
        rule_name: rule.rule_name,
        violation_type: 'limit_exceeded',
        commodity_code: commodityCode,
        limit_category: limitCategory,
        limit_value: limitValue,
        current_position: currentPosition,
        projected_position: projectedPosition,
        utilization_pct: utilization,
        excess_amount: excessAmount,
        severity: 'critical',
        enforcement_action: rule.enforcement_action,
        rule_reference: rule.rule_reference,
        message: `Position limit exceeded: ${rule.rule_name}. Projected ${positionToCheck.toFixed(
          2
        )} lots exceeds limit of ${limitValue} lots by ${excessAmount.toFixed(2)} lots (${utilization.toFixed(
          1
        )}% utilization). Regulatory reference: ${rule.rule_reference}`,
      });

      // Set most restrictive enforcement action
      if (rule.enforcement_action === 'block_trade') {
        enforcement_action = 'block_trade';
      } else if (!enforcement_action) {
        enforcement_action = rule.enforcement_action;
      }
    } else if (rule.rule_type === 'accountability_level' && positionToCheck > limitValue) {
      // Accountability level triggered
      violations.push({
        rule_id: rule.id,
        rule_code: rule.rule_code,
        rule_name: rule.rule_name,
        violation_type: 'accountability_triggered',
        commodity_code: commodityCode,
        limit_category: limitCategory,
        limit_value: limitValue,
        current_position: currentPosition,
        projected_position: projectedPosition,
        utilization_pct: utilization,
        excess_amount: excessAmount,
        severity: 'high',
        enforcement_action: rule.enforcement_action,
        rule_reference: rule.rule_reference,
        message: `Accountability level reached: ${rule.rule_name}. Position of ${positionToCheck.toFixed(
          2
        )} lots exceeds accountability level of ${limitValue} lots. ${
          rule.enforcement_action === 'require_approval'
            ? 'Manager approval required to proceed.'
            : 'Reporting to exchange required.'
        } Reference: ${rule.rule_reference}`,
      });

      if (rule.enforcement_action === 'require_approval' && !enforcement_action) {
        enforcement_action = 'require_approval';
      }
    } else if (rule.rule_type === 'reportable_threshold' && positionToCheck > limitValue) {
      // Reportable threshold exceeded
      reportable = true;
      warnings.push({
        rule_id: rule.id,
        rule_code: rule.rule_code,
        message: `Reportable threshold reached: ${rule.rule_name}. Position of ${positionToCheck.toFixed(
          2
        )} lots exceeds reporting threshold of ${limitValue} lots. Large trader report required per ${
          rule.rule_reference
        }.`,
        warning_type: 'reporting_required',
        utilization_pct: utilization,
      });
    } else if (utilization >= 85 && utilization < 100) {
      // Warning: approaching limit
      warnings.push({
        rule_id: rule.id,
        rule_code: rule.rule_code,
        message: `Approaching ${rule.rule_name}: ${utilization.toFixed(
          1
        )}% utilization. Position of ${positionToCheck.toFixed(
          2
        )} lots is nearing ${limitValue} lots limit.`,
        warning_type: 'approaching_limit',
        utilization_pct: utilization,
      });
    }
  }

  return {
    compliant,
    violations,
    warnings,
    reportable,
    enforcement_action,
    applicable_rules: rules,
  };
}

/**
 * Create a position breach event record
 */
export async function recordBreachEvent(db: any, breach: BreachEvent): Promise<number> {
  const result = await db
    .prepare(
      `
    INSERT INTO position_breach_events (
      company_id, trader_id, limit_calculation_id, regulatory_rule_id,
      breach_type, commodity_code, market_location, contract_month,
      limit_type, position_lots, limit_value, utilization_pct,
      breach_amount, severity, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .bind(
      breach.company_id || null,
      breach.trader_id || null,
      breach.limit_calculation_id || null,
      breach.regulatory_rule_id,
      breach.breach_type,
      breach.commodity_code,
      breach.market_location,
      breach.contract_month || null,
      breach.limit_type,
      breach.position_lots,
      breach.limit_value,
      breach.utilization_pct,
      breach.breach_amount,
      breach.severity,
      breach.metadata ? JSON.stringify(breach.metadata) : null
    )
    .run();

  return result.meta.last_row_id as number;
}

/**
 * Get open breach events
 */
export async function getOpenBreaches(
  db: any,
  options: {
    companyId?: number;
    traderId?: number;
    commodityCode?: string;
    severity?: string;
    exchangeId?: number;
    limit?: number;
  } = {}
): Promise<any[]> {
  let query = `
    SELECT
      pbe.*,
      rr.rule_code,
      rr.rule_name,
      rr.rule_reference,
      rr.enforcement_action,
      e.exchange_code,
      e.exchange_name,
      c.company_name,
      u.name as trader_name
    FROM position_breach_events pbe
    JOIN regulatory_rules rr ON pbe.regulatory_rule_id = rr.id
    JOIN exchanges e ON rr.exchange_id = e.id
    LEFT JOIN companies c ON pbe.company_id = c.id
    LEFT JOIN users u ON pbe.trader_id = u.id
    WHERE pbe.status = 'open'
  `;

  const params: any[] = [];

  if (options.companyId) {
    query += ` AND pbe.company_id = ?`;
    params.push(options.companyId);
  }

  if (options.traderId) {
    query += ` AND pbe.trader_id = ?`;
    params.push(options.traderId);
  }

  if (options.commodityCode) {
    query += ` AND pbe.commodity_code = ?`;
    params.push(options.commodityCode);
  }

  if (options.severity) {
    query += ` AND pbe.severity = ?`;
    params.push(options.severity);
  }

  if (options.exchangeId) {
    query += ` AND rr.exchange_id = ?`;
    params.push(options.exchangeId);
  }

  query += ` ORDER BY
    CASE pbe.severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    pbe.detected_at DESC
  `;

  if (options.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }

  const result = await db.prepare(query).bind(...params).all();
  return result.results || [];
}

/**
 * Acknowledge a breach event
 */
export async function acknowledgeBreachEvent(
  db: any,
  breachId: number,
  acknowledgedBy: number,
  notes?: string
): Promise<void> {
  await db
    .prepare(
      `
    UPDATE position_breach_events
    SET status = 'acknowledged',
        acknowledged_at = CURRENT_TIMESTAMP,
        acknowledged_by = ?,
        resolution_notes = ?
    WHERE id = ?
  `
    )
    .bind(acknowledgedBy, notes || null, breachId)
    .run();
}

/**
 * Resolve a breach event
 */
export async function resolveBreachEvent(
  db: any,
  breachId: number,
  resolvedBy: number,
  resolutionNotes: string
): Promise<void> {
  await db
    .prepare(
      `
    UPDATE position_breach_events
    SET status = 'resolved',
        resolved_at = CURRENT_TIMESTAMP,
        resolution_notes = ?
    WHERE id = ?
  `
    )
    .bind(resolutionNotes, breachId)
    .run();

  // Log resolution in audit trail
  console.log(
    `[REGULATORY COMPLIANCE] Breach #${breachId} resolved by user ${resolvedBy}: ${resolutionNotes}`
  );
}

export interface ComplianceAuditOptions {
  startDate?: string;
  endDate?: string;
  companyId?: number;
  exchangeId?: number;
  commodityCode?: string;
}

/**
 * Generate compliance audit report
 */
export async function generateComplianceAudit(
  db: any,
  options: ComplianceAuditOptions = {}
): Promise<any> {
  const auditDate = options.endDate || new Date().toISOString().split('T')[0];
  const companyId = options.companyId;
  const exchangeId = options.exchangeId;
  // Get compliance statistics
  let statsQuery = `
    SELECT
      COUNT(DISTINCT lc.id) as total_positions,
      SUM(CASE WHEN lc.prioritization = 'Breached' THEN 1 ELSE 0 END) as breached_positions,
      SUM(CASE WHEN lc.prioritization = 'Remediate' THEN 1 ELSE 0 END) as accountability_positions
    FROM limit_calculations lc
    WHERE lc.is_active = 1
      AND lc.as_of_date = ?
  `;

  const statsParams: any[] = [auditDate];

  if (companyId) {
    statsQuery += ` AND lc.company_id = ?`;
    statsParams.push(companyId);
  }

  const stats = await db.prepare(statsQuery).bind(...statsParams).first();

  // Get violation counts
  const violationsQuery = `
    SELECT
      COUNT(*) as total_violations,
      SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_violations,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_violations,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as pending_violations
    FROM position_breach_events
    WHERE DATE(detected_at) = ?
    ${companyId ? ' AND company_id = ?' : ''}
  `;

  const violationParams = [auditDate];
  if (companyId) violationParams.push(companyId);

  const violations = await db.prepare(violationsQuery).bind(...violationParams).first();

  // Calculate compliance score (0-100)
  const totalPositions = stats?.total_positions || 0;
  const breachedPositions = stats?.breached_positions || 0;
  const complianceScore =
    totalPositions > 0 ? ((totalPositions - breachedPositions) / totalPositions) * 100 : 100;

  // Determine audit status
  let auditStatus = 'pass';
  if ((violations?.critical_violations || 0) > 0) {
    auditStatus = 'fail';
  } else if ((violations?.pending_violations || 0) > 5) {
    auditStatus = 'warning';
  }

  // Insert audit record
  await db
    .prepare(
      `
    INSERT INTO regulatory_compliance_audit (
      audit_date, company_id, exchange_id, total_positions,
      breached_positions, accountability_positions, reportable_positions,
      compliance_score, total_violations, critical_violations,
      resolved_violations, pending_violations, audit_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .bind(
      auditDate,
      companyId || null,
      exchangeId || null,
      totalPositions,
      breachedPositions,
      stats?.accountability_positions || 0,
      0, // reportable_positions - to be calculated
      complianceScore,
      violations?.total_violations || 0,
      violations?.critical_violations || 0,
      violations?.resolved_violations || 0,
      violations?.pending_violations || 0,
      auditStatus
    )
    .run();

  return {
    audit_date: auditDate,
    compliance_score: complianceScore,
    audit_status: auditStatus,
    ...stats,
    ...violations,
  };
}

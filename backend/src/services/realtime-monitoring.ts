/**
 * Real-Time Monitoring Service
 * Continuous monitoring of positions and automatic breach detection
 */

import {
  calculateSpotMonthLimits,
  calculateOneMonthLimits,
  calculateAllMonthLimits,
} from './limit-calculator';
import {
  checkRegulatoryCompliance,
  recordBreachEvent,
  generateComplianceAudit,
} from './regulatory-compliance';
import { generateAlertsForAllCalculations } from './alert-service';
import { calculateAllAggregatedPositions } from './aggregation-service';

export interface MonitoringResult {
  timestamp: string;
  calculations_updated: number;
  new_breaches: number;
  alerts_generated: number;
  compliance_score: number;
  critical_violations: number;
  aggregations_calculated: number;
}

/**
 * Run comprehensive real-time monitoring
 * Called every 15 minutes by cron job
 */
export async function runRealtimeMonitoring(db: any): Promise<MonitoringResult> {
  const startTime = Date.now();
  console.log('[REALTIME MONITORING] Starting monitoring cycle...');

  const result: MonitoringResult = {
    timestamp: new Date().toISOString(),
    calculations_updated: 0,
    new_breaches: 0,
    alerts_generated: 0,
    compliance_score: 100,
    critical_violations: 0,
    aggregations_calculated: 0,
  };

  try {
    // Step 1: Recalculate positions
    console.log('[REALTIME MONITORING] Recalculating positions...');
    const spotCount = await calculateSpotMonthLimits(db);
    const oneMonthCount = await calculateOneMonthLimits(db);
    const allMonthCount = await calculateAllMonthLimits(db);

    result.calculations_updated = spotCount + oneMonthCount + allMonthCount;
    console.log(`[REALTIME MONITORING] Updated ${result.calculations_updated} position calculations`);

    // Step 2: Detect regulatory breaches
    console.log('[REALTIME MONITORING] Detecting regulatory breaches...');
    const breachCount = await detectRegulatoryBreaches(db);
    result.new_breaches = breachCount;
    console.log(`[REALTIME MONITORING] Detected ${breachCount} new breaches`);

    // Step 3: Calculate aggregated positions
    console.log('[REALTIME MONITORING] Calculating aggregated positions...');
    const aggregationCount = await calculateAllAggregatedPositions(db);
    result.aggregations_calculated = aggregationCount;
    console.log(`[REALTIME MONITORING] Calculated ${aggregationCount} aggregated positions`);

    // Step 4: Generate alerts
    console.log('[REALTIME MONITORING] Generating alerts...');
    const alertCount = await generateAlertsForAllCalculations(db);
    result.alerts_generated = alertCount;
    console.log(`[REALTIME MONITORING] Generated ${alertCount} alerts`);

    // Step 5: Calculate compliance score
    console.log('[REALTIME MONITORING] Calculating compliance score...');
    const complianceData = await calculateComplianceMetrics(db);
    result.compliance_score = complianceData.score;
    result.critical_violations = complianceData.critical_violations;
    console.log(`[REALTIME MONITORING] Compliance score: ${result.compliance_score.toFixed(2)}%`);

    // Step 6: Send critical breach notifications
    if (result.critical_violations > 0) {
      console.log(`[REALTIME MONITORING] ⚠️  ${result.critical_violations} CRITICAL VIOLATIONS - Notifications required`);
      await sendCriticalBreachNotifications(db);
    }

    const duration = Date.now() - startTime;
    console.log(`[REALTIME MONITORING] ✅ Monitoring cycle completed in ${duration}ms`);

    // Log monitoring result to database
    await logMonitoringResult(db, result);

    return result;
  } catch (error: any) {
    console.error('[REALTIME MONITORING] ❌ Error:', error);
    throw error;
  }
}

/**
 * Detect regulatory breaches by checking all active positions
 */
async function detectRegulatoryBreaches(db: any): Promise<number> {
  // Get all active position calculations
  const positions = await db.prepare(`
    SELECT
      lc.*,
      ml.commodity_code,
      ml.exchange_id
    FROM limit_calculations lc
    LEFT JOIN market_limits ml ON lc.reporting_limit_code = ml.commodity_code
    WHERE lc.is_active = 1 AND lc.is_parent = 1
      AND lc.pos_pct >= 85
  `).all();

  let breachCount = 0;

  for (const position of positions.results) {
    try {
      const limitCategory =
        position.limit_type === 1 ? 'spot_month' :
        position.limit_type === 2 ? 'single_month' : 'all_month';

      // Check regulatory compliance
      const complianceCheck = await checkRegulatoryCompliance(db, {
        commodityCode: position.reporting_limit_code,
        marketLocation: position.mkt_index,
        limitCategory,
        currentPosition: position.pos_lots,
        projectedPosition: position.pos_lots,
        exchangeId: position.exchange_id,
      });

      // Record breaches
      if (!complianceCheck.compliant) {
        for (const violation of complianceCheck.violations) {
          // Check if breach already exists
          const existing = await db.prepare(`
            SELECT id FROM position_breach_events
            WHERE regulatory_rule_id = ?
              AND commodity_code = ?
              AND market_location = ?
              AND limit_type = ?
              AND status = 'open'
          `).bind(
            violation.rule_id,
            position.reporting_limit_code,
            position.mkt_index,
            position.limit_type
          ).first();

          if (!existing) {
            // Record new breach
            await recordBreachEvent(db, {
              limit_calculation_id: position.id,
              regulatory_rule_id: violation.rule_id,
              breach_type: violation.violation_type,
              commodity_code: position.reporting_limit_code,
              market_location: position.mkt_index,
              contract_month: position.contract_month,
              limit_type: position.limit_type,
              position_lots: position.pos_lots,
              limit_value: violation.limit_value,
              utilization_pct: violation.utilization_pct,
              breach_amount: violation.excess_amount,
              severity: violation.severity,
              metadata: {
                rule_code: violation.rule_code,
                rule_reference: violation.rule_reference,
                detected_by: 'realtime_monitoring',
                monitoring_cycle: new Date().toISOString(),
              },
            });

            breachCount++;
            console.log(`[BREACH DETECTED] ${violation.rule_code}: ${position.reporting_limit_code} at ${position.mkt_index} - ${violation.severity}`);
          }
        }
      }
    } catch (error) {
      console.error(`[REALTIME MONITORING] Error checking position ${position.id}:`, error);
    }
  }

  return breachCount;
}

/**
 * Calculate overall compliance metrics
 */
async function calculateComplianceMetrics(db: any): Promise<{
  score: number;
  total_positions: number;
  breached_positions: number;
  critical_violations: number;
}> {
  // Get position counts
  const positionStats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN prioritization = 'Breached' THEN 1 ELSE 0 END) as breached
    FROM limit_calculations
    WHERE is_active = 1 AND is_parent = 1
  `).first();

  // Get critical violations count
  const violationStats = await db.prepare(`
    SELECT COUNT(*) as count
    FROM position_breach_events
    WHERE status = 'open' AND severity = 'critical'
  `).first();

  const total = positionStats?.total || 0;
  const breached = positionStats?.breached || 0;
  const score = total > 0 ? ((total - breached) / total) * 100 : 100;

  return {
    score,
    total_positions: total,
    breached_positions: breached,
    critical_violations: violationStats?.count || 0,
  };
}

/**
 * Send notifications for critical breaches
 */
async function sendCriticalBreachNotifications(db: any): Promise<void> {
  // Get all unnotified critical breaches
  const criticalBreaches = await db.prepare(`
    SELECT
      pbe.*,
      rr.rule_code,
      rr.rule_name,
      rr.rule_reference,
      e.exchange_code,
      e.exchange_name
    FROM position_breach_events pbe
    JOIN regulatory_rules rr ON pbe.regulatory_rule_id = rr.id
    JOIN exchanges e ON rr.exchange_id = e.id
    WHERE pbe.status = 'open'
      AND pbe.severity = 'critical'
      AND pbe.detected_at >= datetime('now', '-20 minutes')
  `).all();

  if (!criticalBreaches.results || criticalBreaches.results.length === 0) {
    console.log('[CRITICAL BREACH NOTIFICATION] No new critical breaches to notify');
    return;
  }

  // Get email recipients for breach alerts
  const recipientsQuery = await db.prepare(`
    SELECT DISTINCT u.email
    FROM users u
    JOIN alert_recipients ar ON u.id = ar.user_id
    WHERE (ar.alert_type = 'BREACH_ALERT' OR ar.alert_type = 'all')
      AND ar.email_enabled = 1
      AND u.is_active = 1
  `).all();

  if (!recipientsQuery.results || recipientsQuery.results.length === 0) {
    console.log('[CRITICAL BREACH NOTIFICATION] ⚠️ No recipients configured for breach alerts');
    return;
  }

  const recipients = recipientsQuery.results.map((r: any) => r.email);

  // Import email service
  const { EmailService } = await import('./email-service');
  const emailService = new EmailService();

  let totalSent = 0;
  let totalFailed = 0;

  for (const breach of criticalBreaches.results) {
    console.log(`[CRITICAL BREACH NOTIFICATION] ${breach.exchange_code} ${breach.rule_code}: ${breach.commodity_code} at ${breach.market_location}`);
    console.log(`  Position: ${breach.position_lots} lots | Limit: ${breach.limit_value} lots | Excess: ${breach.breach_amount} lots`);
    console.log(`  Rule: ${breach.rule_reference}`);

    // Calculate utilization percentage
    const utilizationPct = breach.limit_value > 0
      ? (breach.position_lots / breach.limit_value) * 100
      : 0;

    // Send breach alert email
    const result = await emailService.sendBreachAlert(recipients, {
      commodity_code: breach.commodity_code,
      market_location: breach.market_location,
      pos_lots: breach.position_lots,
      limit_lots: breach.limit_value,
      utilization_pct: utilizationPct,
      severity: 'critical',
      contract_month: breach.contract_month,
      prioritization: 'BREACHED',
    });

    totalSent += result.sent;
    totalFailed += result.failed;

    console.log(`  Email alerts: ${result.sent} sent, ${result.failed} failed`);
  }

  console.log(`[CRITICAL BREACH NOTIFICATION] Total: ${totalSent} emails sent, ${totalFailed} failed to ${recipients.length} recipients`);
}

/**
 * Log monitoring result to database
 */
async function logMonitoringResult(db: any, result: MonitoringResult): Promise<void> {
  await db.prepare(`
    INSERT INTO monitoring_logs (
      timestamp, calculations_updated, new_breaches, alerts_generated,
      compliance_score, critical_violations
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    result.timestamp,
    result.calculations_updated,
    result.new_breaches,
    result.alerts_generated,
    result.compliance_score,
    result.critical_violations
  ).run().catch(() => {
    // Table might not exist yet - that's ok, just log to console
    console.log('[MONITORING RESULT]', JSON.stringify(result));
  });
}

/**
 * Get recent monitoring history
 */
export async function getMonitoringHistory(
  db: any,
  limit: number = 24
): Promise<MonitoringResult[]> {
  const result = await db.prepare(`
    SELECT * FROM monitoring_logs
    ORDER BY timestamp DESC
    LIMIT ?
  `).bind(limit).all().catch(() => ({ results: [] }));

  return result.results as MonitoringResult[];
}

/**
 * Post-trade hook: trigger immediate monitoring after trade execution
 */
export async function postTradeMonitoring(
  db: any,
  tradeData: {
    commodityCode: string;
    marketLocation: string;
    limitType: number;
  }
): Promise<void> {
  console.log(`[POST-TRADE MONITORING] Triggered for ${tradeData.commodityCode} at ${tradeData.marketLocation}`);

  // Recalculate specific position
  const limitCategory = tradeData.limitType === 1 ? 'spot_month' :
                       tradeData.limitType === 2 ? 'single_month' : 'all_month';

  // Run targeted calculation
  if (tradeData.limitType === 1) {
    await calculateSpotMonthLimits(db);
  } else if (tradeData.limitType === 2) {
    await calculateOneMonthLimits(db);
  } else {
    await calculateAllMonthLimits(db);
  }

  // Check for immediate breaches
  await detectRegulatoryBreaches(db);

  console.log(`[POST-TRADE MONITORING] Completed for ${tradeData.commodityCode}`);
}

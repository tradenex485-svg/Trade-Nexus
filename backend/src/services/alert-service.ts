/**
 * Alert Service
 * Generates and manages alerts based on position limit calculations
 */

export interface Alert {
  id?: number;
  user_id?: number;
  limit_calculation_id?: number;
  alert_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  commodity_code?: string;
  market_location?: string;
  current_position?: number;
  limit_value?: number;
  utilization_pct?: number;
  threshold_pct?: number;
  metadata?: string;
  read?: number;
  acknowledged?: number;
}

export interface AlertRule {
  id: number;
  rule_name: string;
  alert_type: string;
  threshold_pct: number;
  severity: string;
  is_active: number;
  notify_email: number;
  notify_sms: number;
}

export interface LimitCalculation {
  id: number;
  as_of_date: string;
  mkt_index: string;
  contract_month: string;
  reporting_limit_code: string;
  child_code?: string;
  limit_lots: number;
  pos_lots: number;
  pos_pct: number;
  prioritization: string;
  limit_type: number;
  is_parent: number;
}

/**
 * Get active alert rules
 */
export async function getActiveAlertRules(db: any): Promise<AlertRule[]> {
  const result = await db.prepare(`
    SELECT * FROM alert_rules WHERE is_active = 1 ORDER BY threshold_pct
  `).all();

  return result.results as AlertRule[];
}

/**
 * Generate alerts based on limit calculation
 */
export async function generateAlertsForCalculation(
  db: any,
  calculation: LimitCalculation
): Promise<number> {
  try {
    // Get active alert rules
    const rules = await getActiveAlertRules(db);

    let alertsGenerated = 0;
    const utilizationPct = calculation.pos_pct;

    // Check each rule
    for (const rule of rules) {
      // Check if utilization exceeds threshold
      const shouldAlert = utilizationPct >= rule.threshold_pct;

      if (!shouldAlert) {
        continue;
      }

      // Check if we already have an unacknowledged alert for this calculation and threshold
      const existingAlert = await db.prepare(`
        SELECT id FROM alerts
        WHERE limit_calculation_id = ?
        AND threshold_pct = ?
        AND acknowledged = 0
      `).bind(calculation.id, rule.threshold_pct).first();

      if (existingAlert) {
        // Alert already exists, skip
        continue;
      }

      // Determine severity based on utilization
      let severity = rule.severity as Alert['severity'];
      if (utilizationPct >= 100) {
        severity = 'critical';
      } else if (utilizationPct >= 80) {
        severity = 'error';
      } else if (utilizationPct >= 60) {
        severity = 'warning';
      } else {
        severity = 'info';
      }

      // Generate alert title and message
      const title = generateAlertTitle(calculation, rule, utilizationPct);
      const message = generateAlertMessage(calculation, rule, utilizationPct);

      // Create alert
      const alert: Alert = {
        limit_calculation_id: calculation.id,
        alert_type: rule.alert_type,
        severity,
        title,
        message,
        commodity_code: calculation.reporting_limit_code,
        market_location: calculation.mkt_index,
        current_position: calculation.pos_lots,
        limit_value: calculation.limit_lots,
        utilization_pct: utilizationPct,
        threshold_pct: rule.threshold_pct,
        metadata: JSON.stringify({
          as_of_date: calculation.as_of_date,
          contract_month: calculation.contract_month,
          limit_type: calculation.limit_type,
          prioritization: calculation.prioritization,
          rule_name: rule.rule_name
        }),
        read: 0,
        acknowledged: 0
      };

      await createAlert(db, alert);
      alertsGenerated++;

      // Send notifications if configured
      if (rule.notify_email || rule.notify_sms) {
        await queueNotifications(db, alert, rule);
      }
    }

    return alertsGenerated;

  } catch (error) {
    console.error('Error generating alerts:', error);
    return 0;
  }
}

/**
 * Generate alert title
 */
function generateAlertTitle(
  calculation: LimitCalculation,
  rule: AlertRule,
  utilizationPct: number
): string {
  const commodity = calculation.reporting_limit_code;
  const pct = utilizationPct.toFixed(1);

  if (utilizationPct >= 100) {
    return `LIMIT BREACH: ${commodity} exceeds limit (${pct}%)`;
  } else if (utilizationPct >= 80) {
    return `HIGH RISK: ${commodity} at ${pct}% of limit`;
  } else if (utilizationPct >= 60) {
    return `EARLY WARNING: ${commodity} at ${pct}% of limit`;
  } else {
    return `MONITOR: ${commodity} at ${pct}% of limit`;
  }
}

/**
 * Generate alert message
 */
function generateAlertMessage(
  calculation: LimitCalculation,
  rule: AlertRule,
  utilizationPct: number
): string {
  const commodity = calculation.reporting_limit_code;
  const market = calculation.mkt_index;
  const position = calculation.pos_lots.toFixed(2);
  const limit = calculation.limit_lots.toFixed(2);
  const pct = utilizationPct.toFixed(2);
  const status = calculation.prioritization;

  let action = '';
  if (utilizationPct >= 100) {
    action = ' Immediate action required - position exceeds regulatory limit.';
  } else if (utilizationPct >= 80) {
    action = ' High risk - consider reducing position or requesting exemption.';
  } else if (utilizationPct >= 60) {
    action = ' Early warning - position requires monitoring and validation.';
  }

  return `${commodity} position at ${market} has reached ${pct}% utilization.` +
    ` Current position: ${position} lots, Limit: ${limit} lots.` +
    ` Status: ${status}.` +
    action;
}

/**
 * Create alert in database
 */
export async function createAlert(db: any, alert: Alert): Promise<number> {
  const result = await db.prepare(`
    INSERT INTO alerts (
      user_id, limit_calculation_id, alert_type, severity,
      title, message, commodity_code, market_location,
      current_position, limit_value, utilization_pct, threshold_pct,
      metadata, read, acknowledged
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    alert.user_id || null,
    alert.limit_calculation_id || null,
    alert.alert_type,
    alert.severity,
    alert.title,
    alert.message,
    alert.commodity_code || null,
    alert.market_location || null,
    alert.current_position || null,
    alert.limit_value || null,
    alert.utilization_pct || null,
    alert.threshold_pct || null,
    alert.metadata || null,
    alert.read || 0,
    alert.acknowledged || 0
  ).run();

  return result.meta.last_row_id as number;
}

/**
 * Queue notifications for alert
 */
async function queueNotifications(
  db: any,
  alert: Alert,
  rule: AlertRule
): Promise<void> {
  // Get alert recipients
  const recipients = await db.prepare(`
    SELECT ar.*, u.email, u.name
    FROM alert_recipients ar
    JOIN users u ON ar.user_id = u.id
    WHERE ar.alert_type = ? OR ar.alert_type = 'all'
    AND ar.commodity_code IS NULL OR ar.commodity_code = ?
  `).bind(rule.alert_type, alert.commodity_code).all();

  for (const recipient of recipients.results) {
    if (rule.notify_email && recipient.email_enabled) {
      await queueEmailNotification(db, alert, recipient);
    }

    if (rule.notify_sms && recipient.sms_enabled && recipient.phone_number) {
      await queueSMSNotification(db, alert, recipient);
    }
  }
}

/**
 * Queue email notification
 */
async function queueEmailNotification(db: any, alert: Alert, recipient: any): Promise<void> {
  try {
    const { EmailService } = await import('./email-service');
    const emailService = new EmailService();

    if (alert.severity === 'critical' && alert.utilization_pct && alert.utilization_pct >= 100) {
      // Send breach alert
      await emailService.sendPositionBreachAlert(recipient.email, {
        commodity_code: alert.commodity_code || '',
        market_location: alert.market_location || '',
        pos_lots: alert.current_position || 0,
        limit_lots: alert.limit_value || 0,
        utilization_pct: alert.utilization_pct,
        severity: alert.severity,
      });
    } else if (alert.threshold_pct && alert.utilization_pct) {
      // Send threshold warning
      await emailService.sendThresholdWarning(recipient.email, {
        commodity_code: alert.commodity_code || '',
        market_location: alert.market_location || '',
        pos_lots: alert.current_position || 0,
        limit_lots: alert.limit_value || 0,
        utilization_pct: alert.utilization_pct,
        threshold_pct: alert.threshold_pct,
      });
    }
  } catch (error) {
    console.error(`[EMAIL] Failed to send alert to ${recipient.email}:`, error);
  }
}

/**
 * Queue SMS notification (placeholder - implement with Twilio or similar)
 */
async function queueSMSNotification(db: any, alert: Alert, recipient: any): Promise<void> {
  console.log(`[SMS] Alert to ${recipient.phone_number}: ${alert.title}`);
  // TODO: Implement actual SMS sending via Twilio or similar
}

/**
 * Get all unread alerts
 */
export async function getUnreadAlerts(db: any, userId?: number): Promise<Alert[]> {
  let query = `
    SELECT * FROM alerts
    WHERE read = 0
  `;

  const bindings: any[] = [];

  if (userId) {
    query += ` AND (user_id = ? OR user_id IS NULL)`;
    bindings.push(userId);
  }

  query += ` ORDER BY created_at DESC LIMIT 100`;

  const result = await db.prepare(query).bind(...bindings).all();
  return result.results as Alert[];
}

/**
 * Get alert statistics
 */
export async function getAlertStats(db: any): Promise<any> {
  const totalResult = await db.prepare(`
    SELECT COUNT(*) as total FROM alerts
  `).first();

  const unreadResult = await db.prepare(`
    SELECT COUNT(*) as unread FROM alerts WHERE read = 0
  `).first();

  const unacknowledgedResult = await db.prepare(`
    SELECT COUNT(*) as unacknowledged FROM alerts WHERE acknowledged = 0
  `).first();

  const bySeverity = await db.prepare(`
    SELECT severity, COUNT(*) as count
    FROM alerts
    WHERE read = 0
    GROUP BY severity
  `).all();

  const byCommodity = await db.prepare(`
    SELECT commodity_code, COUNT(*) as count
    FROM alerts
    WHERE read = 0 AND commodity_code IS NOT NULL
    GROUP BY commodity_code
    ORDER BY count DESC
    LIMIT 10
  `).all();

  return {
    total: totalResult.total || 0,
    unread: unreadResult.unread || 0,
    unacknowledged: unacknowledgedResult.unacknowledged || 0,
    by_severity: bySeverity.results,
    by_commodity: byCommodity.results
  };
}

/**
 * Mark alert as read
 */
export async function markAlertAsRead(db: any, alertId: number): Promise<void> {
  await db.prepare(`
    UPDATE alerts SET read = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(alertId).run();
}

/**
 * Acknowledge alert
 */
export async function acknowledgeAlert(
  db: any,
  alertId: number,
  userId: number,
  notes?: string
): Promise<void> {
  await db.prepare(`
    UPDATE alerts
    SET acknowledged = 1,
        acknowledged_at = CURRENT_TIMESTAMP,
        acknowledged_by = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(userId, alertId).run();

  // Log to history
  await db.prepare(`
    INSERT INTO alert_history (alert_id, action, performed_by, notes)
    VALUES (?, 'acknowledged', ?, ?)
  `).bind(alertId, userId, notes || null).run();
}

/**
 * Bulk generate alerts for all active calculations
 */
export async function generateAlertsForAllCalculations(db: any): Promise<number> {
  const calculations = await db.prepare(`
    SELECT * FROM limit_calculations WHERE is_active = 1
  `).all();

  let totalAlertsGenerated = 0;

  for (const calc of calculations.results) {
    const alertsGenerated = await generateAlertsForCalculation(db, calc as LimitCalculation);
    totalAlertsGenerated += alertsGenerated;
  }

  console.log(`Generated ${totalAlertsGenerated} alerts from ${calculations.results.length} calculations`);

  return totalAlertsGenerated;
}

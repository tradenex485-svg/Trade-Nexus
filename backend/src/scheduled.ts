// Scheduled job handler for Cloudflare Cron Triggers
import {
  calculateSpotMonthLimits,
  calculateOneMonthLimits,
  calculateAllMonthLimits,
  calculateSpotPlusMonthLimits,
  exportToTimeSeries,
} from './services/limit-calculator';
import { runRealtimeMonitoring } from './services/realtime-monitoring';
import { generateCFTCLTRS, generateICEDailyReport, generateCMEReport } from './services/regulatory-reporting';

export interface Env {
  DB: any;
}

export async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  console.log('Cron trigger fired:', event.cron);

  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

  console.log(`Current UTC time: ${hour}:${minute} (Day: ${dayOfWeek})`);

  try {
    // Every 15 minutes - Real-time monitoring & breach detection
    if (minute % 15 === 0) {
      console.log('Running real-time monitoring cycle...');
      const monitoringResult = await runRealtimeMonitoring(env.DB);
      console.log(`Monitoring complete: ${monitoringResult.calculations_updated} positions updated, ${monitoringResult.new_breaches} new breaches, ${monitoringResult.compliance_score.toFixed(2)}% compliant`);

      if (monitoringResult.critical_violations > 0) {
        console.warn(`⚠️  ALERT: ${monitoringResult.critical_violations} critical violations detected!`);
        // Breach alert emails are sent automatically by runRealtimeMonitoring
      }
    }

    // 1:00 AM UTC - Import ICE data
    if (hour === 1 && minute === 0) {
      console.log('Running daily ICE data import...');
      await importICEData(env.DB);
    }

    // 4:00 AM UTC - Run full calculations
    if (hour === 4 && minute === 0) {
      console.log('Running daily limit calculations...');
      const spotCount = await calculateSpotMonthLimits(env.DB);
      console.log(`Spot month: ${spotCount} calculations`);

      const spotPlusCount = await calculateSpotPlusMonthLimits(env.DB);
      console.log(`Spot plus month: ${spotPlusCount} calculations`);

      const oneMonthCount = await calculateOneMonthLimits(env.DB);
      console.log(`One month: ${oneMonthCount} calculations`);

      const allMonthCount = await calculateAllMonthLimits(env.DB);
      console.log(`All month: ${allMonthCount} calculations`);
    }

    // 11:00 PM UTC - Export to time series
    if (hour === 23 && minute === 0) {
      console.log('Running daily time series export...');
      const exportCount = await exportToTimeSeries(env.DB);
      console.log(`Exported ${exportCount} records to time series`);
    }

    // 5:00 AM UTC - Generate regulatory filings
    if (hour === 5 && minute === 0) {
      console.log('Running daily regulatory filing generation...');
      await generateDailyRegulatoryFilings(env.DB);
    }

    // 6:00 AM UTC - Send EOD summary emails
    if (hour === 6 && minute === 0) {
      console.log('Sending daily compliance summary emails...');
      await sendDailySummaryEmails(env.DB);
    }

    // 8:00 AM UTC on Sunday - Send weekly compliance digest
    if (dayOfWeek === 0 && hour === 8 && minute === 0) {
      console.log('Sending weekly compliance digest emails...');
      await sendWeeklyDigestEmails(env.DB);
    }

    console.log('Scheduled job completed successfully');
  } catch (error: any) {
    console.error('Scheduled job error:', error);
    throw error;
  }
}

// Import ICE data function (same logic as the API endpoint)
async function importICEData(db: any): Promise<void> {
  const XLSX = await import('xlsx');

  const url = 'https://www.ice.com/publicdocs/otc/advisory_notices/IFUS_Energy_Position_Limit_Accountability_and_Reportable_Levels.xlsx';

  console.log('Downloading Excel file from ICE...');
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  console.log(`Downloaded ${arrayBuffer.byteLength} bytes`);

  // Parse Excel
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Extract effective date
  const dateStr = data[1]?.[0]?.toString() || '';
  const effectiveDate = extractDate(dateStr);

  if (!effectiveDate) {
    throw new Error('Could not extract effective date from Excel file');
  }

  console.log(`Effective date: ${effectiveDate}`);

  // Check if already imported
  const existing = await db.prepare(
    'SELECT COUNT(*) as count FROM market_limits WHERE effective_date = ?'
  ).bind(effectiveDate).first();

  if (existing && existing.count > 0) {
    console.log('Data already up to date, skipping import');
    return;
  }

  // Parse and import data
  const dataRows = data.slice(4);
  const validRows: any[] = [];

  for (const row of dataRows) {
    if (!row[0]) continue;

    const parsed = {
      effective_date: effectiveDate,
      commodity_code: row[0]?.toString().trim() || null,
      contract_name: row[1]?.toString().trim() || null,
      unit_of_trading: row[2]?.toString().trim() || null,
      spot_month_limit: parseInt(row[3]) || 0,
      single_month_accountability_level: parseInt(row[4]) || 0,
      all_month_accountability_level: parseInt(row[5]) || 0,
      strike_price_format: row[6]?.toString().trim() || null,
      strike_price_example: row[7]?.toString().trim() || null,
      aggregate_1_positive_correlation: row[8]?.toString().trim() || null,
      aggregate_2_negative_correlation: row[9]?.toString().trim() || null,
      reportable_level_all_contract_months: parseInt(row[10]) || 0,
      is_parent: 0,
      is_active: 1,
    };

    if (parsed.commodity_code && parsed.spot_month_limit > 0) {
      validRows.push(parsed);
    }
  }

  console.log(`Parsed ${validRows.length} valid rows`);

  if (validRows.length === 0) {
    throw new Error('No valid data rows found in Excel file');
  }

  // Clear and insert
  await db.prepare('DELETE FROM market_limits').run();

  const stmt = db.prepare(`
    INSERT INTO market_limits
    (effective_date, commodity_code, contract_name, unit_of_trading,
     spot_month_limit, single_month_accountability_level, all_month_accountability_level,
     strike_price_format, strike_price_example,
     aggregate_1_positive_correlation, aggregate_2_negative_correlation,
     reportable_level_all_contract_months, is_parent, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const batch = validRows.map(row =>
    stmt.bind(
      row.effective_date,
      row.commodity_code,
      row.contract_name,
      row.unit_of_trading,
      row.spot_month_limit,
      row.single_month_accountability_level,
      row.all_month_accountability_level,
      row.strike_price_format,
      row.strike_price_example,
      row.aggregate_1_positive_correlation,
      row.aggregate_2_negative_correlation,
      row.reportable_level_all_contract_months,
      row.is_parent,
      row.is_active
    )
  );

  await db.batch(batch);
  console.log(`Imported ${validRows.length} market limits`);

  // Trigger calculations immediately after import
  console.log('Triggering calculations...');
  await calculateSpotMonthLimits(db);
  await calculateSpotPlusMonthLimits(db);
  await calculateOneMonthLimits(db);
  await calculateAllMonthLimits(db);
  console.log('Import and calculations completed');
}

function extractDate(dateStr: string): string | null {
  const monthYearMatch = dateStr.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)(?: \d{1,2},)? \d{4}\b/i);
  if (monthYearMatch) {
    return new Date(monthYearMatch[0]).toISOString().split('T')[0];
  }

  const slashDateMatch = dateStr.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
  if (slashDateMatch) {
    return new Date(slashDateMatch[0]).toISOString().split('T')[0];
  }

  return null;
}

/**
 * Generate daily regulatory filings for all regulatory bodies
 */
async function generateDailyRegulatoryFilings(db: any): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const reportDate = yesterday.toISOString().split('T')[0];

  console.log(`Generating regulatory filings for report date: ${reportDate}`);

  try {
    // 1. Generate CFTC LTRS (Large Trader Reporting System)
    console.log('Generating CFTC LTRS filing...');
    const cftcResult = await generateCFTCLTRS(db, reportDate);
    console.log(`CFTC LTRS: ${cftcResult.reportable_positions} reportable positions`);

    // 2. Generate ICE Daily Position Report
    // Get ICE exchange ID
    const iceExchange = await db.prepare(`
      SELECT id FROM exchanges WHERE exchange_code = 'ICE' AND is_active = 1 LIMIT 1
    `).first();

    if (iceExchange) {
      console.log('Generating ICE Daily Position Report...');
      const iceResult = await generateICEDailyReport(db, reportDate, iceExchange.id);
      console.log(`ICE Report: ${iceResult.line_items_count} positions reported`);
    }

    // 3. Generate CME Position Report
    const cmeExchange = await db.prepare(`
      SELECT id FROM exchanges WHERE exchange_code = 'CME' AND is_active = 1 LIMIT 1
    `).first();

    if (cmeExchange) {
      console.log('Generating CME Position Report...');
      const cmeResult = await generateCMEReport(db, reportDate, cmeExchange.id);
      console.log(`CME Report: ${cmeResult.line_items_count} positions reported`);
    }

    console.log('✅ All regulatory filings generated successfully');
  } catch (error: any) {
    console.error('❌ Error generating regulatory filings:', error);
    throw error;
  }
}

/**
 * Send daily compliance summary emails to all compliance recipients
 */
async function sendDailySummaryEmails(db: any): Promise<void> {
  const reportDate = new Date().toISOString().split('T')[0];

  console.log(`Generating daily summary for report date: ${reportDate}`);

  try {
    // 1. Get compliance summary statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_positions,
        COUNT(CASE WHEN prioritization = 'COMPLIANT' THEN 1 END) as compliant_positions,
        COUNT(CASE WHEN prioritization IN ('MONITOR', 'VALIDATE') THEN 1 END) as warning_positions,
        COUNT(CASE WHEN prioritization IN ('REMEDIATE', 'BREACHED') THEN 1 END) as breach_positions,
        AVG(pos_pct) as avg_utilization,
        MAX(pos_pct) as max_utilization
      FROM limit_calculations
      WHERE is_active = 1 AND as_of_date = ?
    `;

    const stats = await db.prepare(statsQuery).bind(reportDate).first();

    // 2. Get critical items (>90% utilization or breached)
    const criticalQuery = `
      SELECT
        reporting_limit_code as commodity_code,
        mkt_index as market_location,
        pos_pct as utilization_pct,
        prioritization as status
      FROM limit_calculations
      WHERE is_active = 1
        AND as_of_date = ?
        AND pos_pct >= 90
      ORDER BY pos_pct DESC
      LIMIT 10
    `;

    const criticalResult = await db.prepare(criticalQuery).bind(reportDate).all();

    // 3. Get breach activity (new vs resolved)
    const breachActivityQuery = `
      SELECT
        COUNT(CASE WHEN created_at >= date('now', '-1 day') THEN 1 END) as new_breaches,
        COUNT(CASE WHEN resolution_status = 'RESOLVED' AND resolution_date >= date('now', '-1 day') THEN 1 END) as resolved_breaches
      FROM compliance_breaches
      WHERE as_of_date = ?
    `;

    const breachActivity = await db.prepare(breachActivityQuery).bind(reportDate).first();

    const summary = {
      report_date: reportDate,
      total_positions: stats?.total_positions || 0,
      compliant_positions: stats?.compliant_positions || 0,
      warning_positions: stats?.warning_positions || 0,
      breach_positions: stats?.breach_positions || 0,
      avg_utilization: stats?.avg_utilization || 0,
      max_utilization: stats?.max_utilization || 0,
      critical_items: criticalResult.results || [],
      new_breaches_today: breachActivity?.new_breaches || 0,
      resolved_breaches_today: breachActivity?.resolved_breaches || 0,
    };

    // 4. Get email recipients for daily summaries
    const recipientsQuery = `
      SELECT DISTINCT u.email, u.name
      FROM users u
      JOIN alert_recipients ar ON u.id = ar.user_id
      WHERE ar.alert_type = 'DAILY_SUMMARY' OR ar.alert_type = 'all'
        AND ar.email_enabled = 1
        AND u.is_active = 1
    `;

    const recipients = await db.prepare(recipientsQuery).all();

    if (!recipients.results || recipients.results.length === 0) {
      console.log('⚠️ No recipients configured for daily summary emails');
      return;
    }

    // 5. Send emails to all recipients
    const { EmailService } = await import('./services/email-service');
    const emailService = new EmailService();
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients.results) {
      try {
        const success = await emailService.sendDailySummary(recipient.email, summary);
        if (success) {
          sentCount++;
          console.log(`✅ Sent daily summary to ${recipient.email}`);
        } else {
          failedCount++;
          console.error(`❌ Failed to send daily summary to ${recipient.email}`);
        }
      } catch (error) {
        failedCount++;
        console.error(`❌ Error sending to ${recipient.email}:`, error);
      }
    }

    console.log(`📧 Daily summary emails: ${sentCount} sent, ${failedCount} failed`);
    console.log(`Summary: ${summary.total_positions} positions, ${summary.breach_positions} breaches, ${summary.avg_utilization.toFixed(1)}% avg utilization`);

  } catch (error: any) {
    console.error('❌ Error sending daily summary emails:', error);
    throw error;
  }
}

/**
 * Send weekly compliance digest emails to all compliance recipients
 */
async function sendWeeklyDigestEmails(db: any): Promise<void> {
  const today = new Date();
  const weekEnd = today.toISOString().split('T')[0];

  // Calculate week start (7 days ago)
  const weekStartDate = new Date(today);
  weekStartDate.setDate(weekStartDate.getDate() - 7);
  const weekStart = weekStartDate.toISOString().split('T')[0];

  console.log(`Generating weekly digest for period: ${weekStart} to ${weekEnd}`);

  try {
    // 1. Get current week statistics
    const currentWeekStats = await db.prepare(`
      SELECT
        COUNT(*) as total_positions,
        AVG(pos_pct) as avg_utilization_week,
        MAX(pos_pct) as peak_utilization_week,
        COUNT(CASE WHEN prioritization IN ('REMEDIATE', 'BREACHED') THEN 1 END) as total_breaches_week,
        COUNT(CASE WHEN prioritization IN ('MONITOR', 'VALIDATE') THEN 1 END) as total_warnings_week
      FROM limit_calculations
      WHERE is_active = 1
        AND as_of_date >= ?
    `).bind(weekStart).first();

    // 2. Get breach activity for the week
    const breachActivityQuery = `
      SELECT
        COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_breaches,
        COUNT(CASE WHEN resolution_status = 'RESOLVED' AND resolution_date >= ? THEN 1 END) as resolved_breaches
      FROM compliance_breaches
      WHERE created_at >= ? OR resolution_date >= ?
    `;

    const breachActivity = await db.prepare(breachActivityQuery)
      .bind(weekStart, weekStart, weekStart, weekStart)
      .first();

    // 3. Get trending up positions (risk increasing)
    const trendingUpQuery = `
      SELECT
        lc_current.reporting_limit_code as commodity_code,
        lc_current.mkt_index as market_location,
        lc_current.pos_pct as current_utilization,
        lc_previous.pos_pct as previous_utilization,
        (lc_current.pos_pct - lc_previous.pos_pct) as change_pct
      FROM limit_calculations lc_current
      LEFT JOIN limit_calculations lc_previous
        ON lc_current.reporting_limit_code = lc_previous.reporting_limit_code
        AND lc_current.mkt_index = lc_previous.mkt_index
        AND lc_current.limit_type = lc_previous.limit_type
        AND lc_previous.as_of_date = ?
      WHERE lc_current.is_active = 1
        AND lc_current.as_of_date = ?
        AND (lc_current.pos_pct - COALESCE(lc_previous.pos_pct, 0)) > 5
      ORDER BY change_pct DESC
      LIMIT 5
    `;

    const trendingUp = await db.prepare(trendingUpQuery)
      .bind(weekStart, weekEnd)
      .all();

    // 4. Get trending down positions (risk decreasing)
    const trendingDownQuery = `
      SELECT
        lc_current.reporting_limit_code as commodity_code,
        lc_current.mkt_index as market_location,
        lc_current.pos_pct as current_utilization,
        lc_previous.pos_pct as previous_utilization,
        (lc_current.pos_pct - lc_previous.pos_pct) as change_pct
      FROM limit_calculations lc_current
      LEFT JOIN limit_calculations lc_previous
        ON lc_current.reporting_limit_code = lc_previous.reporting_limit_code
        AND lc_current.mkt_index = lc_previous.mkt_index
        AND lc_current.limit_type = lc_previous.limit_type
        AND lc_previous.as_of_date = ?
      WHERE lc_current.is_active = 1
        AND lc_current.as_of_date = ?
        AND (lc_current.pos_pct - COALESCE(lc_previous.pos_pct, 0)) < -5
      ORDER BY change_pct ASC
      LIMIT 5
    `;

    const trendingDown = await db.prepare(trendingDownQuery)
      .bind(weekStart, weekEnd)
      .all();

    // 5. Get persistent breaches (breached for multiple days)
    const persistentBreachesQuery = `
      SELECT
        commodity_code,
        market_location,
        MAX(utilization_pct) as utilization_pct,
        COUNT(DISTINCT as_of_date) as days_breached
      FROM compliance_breaches
      WHERE status = 'OPEN'
        AND as_of_date >= ?
      GROUP BY commodity_code, market_location
      HAVING days_breached >= 3
      ORDER BY days_breached DESC, utilization_pct DESC
      LIMIT 5
    `;

    const topBreaches = await db.prepare(persistentBreachesQuery)
      .bind(weekStart)
      .all();

    const digest = {
      week_start: weekStart,
      week_end: weekEnd,
      total_positions: currentWeekStats?.total_positions || 0,
      avg_utilization_week: currentWeekStats?.avg_utilization_week || 0,
      peak_utilization_week: currentWeekStats?.peak_utilization_week || 0,
      total_breaches_week: currentWeekStats?.total_breaches_week || 0,
      total_warnings_week: currentWeekStats?.total_warnings_week || 0,
      new_breaches: breachActivity?.new_breaches || 0,
      resolved_breaches: breachActivity?.resolved_breaches || 0,
      trending_up: trendingUp.results || [],
      trending_down: trendingDown.results || [],
      top_breaches: topBreaches.results || [],
    };

    // 6. Get email recipients for weekly digests
    const recipientsQuery = `
      SELECT DISTINCT u.email, u.name
      FROM users u
      JOIN alert_recipients ar ON u.id = ar.user_id
      WHERE (ar.alert_type = 'WEEKLY_DIGEST' OR ar.alert_type = 'all')
        AND ar.email_enabled = 1
        AND u.is_active = 1
    `;

    const recipients = await db.prepare(recipientsQuery).all();

    if (!recipients.results || recipients.results.length === 0) {
      console.log('⚠️ No recipients configured for weekly digest emails');
      return;
    }

    // 7. Send emails to all recipients
    const { EmailService } = await import('./services/email-service');
    const emailService = new EmailService();
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients.results) {
      try {
        const success = await emailService.sendWeeklyDigest(recipient.email, digest);
        if (success) {
          sentCount++;
          console.log(`✅ Sent weekly digest to ${recipient.email}`);
        } else {
          failedCount++;
          console.error(`❌ Failed to send weekly digest to ${recipient.email}`);
        }
      } catch (error) {
        failedCount++;
        console.error(`❌ Error sending to ${recipient.email}:`, error);
      }
    }

    console.log(`📧 Weekly digest emails: ${sentCount} sent, ${failedCount} failed`);
    console.log(`Summary: ${digest.total_positions} positions, ${digest.total_breaches_week} breaches, ${digest.avg_utilization_week.toFixed(1)}% avg utilization`);

  } catch (error: any) {
    console.error('❌ Error sending weekly digest emails:', error);
    throw error;
  }
}

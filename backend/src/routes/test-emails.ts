/**
 * Test Email Routes
 * FOR DEVELOPMENT/TESTING ONLY
 * Allows manual triggering of email notifications for testing
 */

import { Hono } from 'hono';
import { EmailService } from '../services/email-service';

const app = new Hono();

/**
 * Test breach alert email
 * POST /api/test-emails/breach-alert
 */
app.post('/breach-alert', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: 'Email address required' }, 400);
    }

    const emailService = new EmailService();

    // Send test breach alert
    const result = await emailService.sendBreachAlert([email], {
      commodity_code: 'NG',
      market_location: 'Henry Hub',
      pos_lots: 12500,
      limit_lots: 10000,
      utilization_pct: 125.0,
      severity: 'critical',
      contract_month: '2025-11',
      prioritization: 'BREACHED',
    });

    return c.json({
      success: true,
      message: 'Test breach alert sent',
      result,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * Test daily summary email
 * POST /api/test-emails/daily-summary
 */
app.post('/daily-summary', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: 'Email address required' }, 400);
    }

    const emailService = new EmailService();

    // Send test daily summary
    const success = await emailService.sendDailySummary(email, {
      report_date: new Date().toISOString().split('T')[0],
      total_positions: 45,
      compliant_positions: 38,
      warning_positions: 5,
      breach_positions: 2,
      avg_utilization: 67.3,
      max_utilization: 125.0,
      critical_items: [
        {
          commodity_code: 'NG',
          market_location: 'Henry Hub',
          utilization_pct: 125.0,
          status: 'BREACHED',
        },
        {
          commodity_code: 'CL',
          market_location: 'WTI Cushing',
          utilization_pct: 95.2,
          status: 'REMEDIATE',
        },
      ],
      new_breaches_today: 2,
      resolved_breaches_today: 1,
    });

    return c.json({
      success,
      message: success ? 'Test daily summary sent' : 'Failed to send daily summary',
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * Test weekly digest email
 * POST /api/test-emails/weekly-digest
 */
app.post('/weekly-digest', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: 'Email address required' }, 400);
    }

    const emailService = new EmailService();

    const today = new Date();
    const weekEnd = today.toISOString().split('T')[0];
    const weekStartDate = new Date(today);
    weekStartDate.setDate(weekStartDate.getDate() - 7);
    const weekStart = weekStartDate.toISOString().split('T')[0];

    // Send test weekly digest
    const success = await emailService.sendWeeklyDigest(email, {
      week_start: weekStart,
      week_end: weekEnd,
      total_positions: 45,
      avg_utilization_week: 65.8,
      peak_utilization_week: 125.0,
      total_breaches_week: 3,
      total_warnings_week: 7,
      new_breaches: 3,
      resolved_breaches: 2,
      trending_up: [
        {
          commodity_code: 'NG',
          market_location: 'Henry Hub',
          current_utilization: 95.0,
          previous_utilization: 78.5,
          change_pct: 16.5,
        },
        {
          commodity_code: 'CL',
          market_location: 'WTI Cushing',
          current_utilization: 88.2,
          previous_utilization: 72.1,
          change_pct: 16.1,
        },
      ],
      trending_down: [
        {
          commodity_code: 'HO',
          market_location: 'NY Harbor',
          current_utilization: 45.3,
          previous_utilization: 67.8,
          change_pct: -22.5,
        },
      ],
      top_breaches: [
        {
          commodity_code: 'NG',
          market_location: 'Henry Hub',
          utilization_pct: 125.0,
          days_breached: 5,
        },
      ],
    });

    return c.json({
      success,
      message: success ? 'Test weekly digest sent' : 'Failed to send weekly digest',
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * Test all email types at once
 * POST /api/test-emails/all
 */
app.post('/all', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: 'Email address required' }, 400);
    }

    const results = {
      breach_alert: { success: false, error: '' },
      daily_summary: { success: false, error: '' },
      weekly_digest: { success: false, error: '' },
    };

    // Test breach alert
    try {
      const breachResponse = await fetch(`${c.req.url.replace('/all', '/breach-alert')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      results.breach_alert = await breachResponse.json();
    } catch (error: any) {
      results.breach_alert.error = error.message;
    }

    // Test daily summary
    try {
      const dailyResponse = await fetch(`${c.req.url.replace('/all', '/daily-summary')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      results.daily_summary = await dailyResponse.json();
    } catch (error: any) {
      results.daily_summary.error = error.message;
    }

    // Test weekly digest
    try {
      const weeklyResponse = await fetch(`${c.req.url.replace('/all', '/weekly-digest')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      results.weekly_digest = await weeklyResponse.json();
    } catch (error: any) {
      results.weekly_digest.error = error.message;
    }

    const allSuccess = results.breach_alert.success &&
                       results.daily_summary.success &&
                       results.weekly_digest.success;

    return c.json({
      success: allSuccess,
      message: allSuccess
        ? 'All test emails sent successfully'
        : 'Some emails failed to send',
      results,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

export default app;

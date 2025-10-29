import { Hono } from 'hono';
import {
  generatePositionReport,
  generateComplianceReport,
  generateBreachReport,
  generateHistoricalReport,
  generatePreTradeReport,
  generateApprovalReport,
  generateAuditReport,
  exportToCSV,
  exportToJSON,
} from '../services/report-service';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

export const reportsRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/reports/position
 * Current position report
 */
reportsRoutes.get('/position', async (c) => {
  try {
    const limitType = parseInt(c.req.query('limit_type') || '1');

    const report = await generatePositionReport(c.env.DB, { limitType });

    return c.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Position report error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to generate position report',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/reports/compliance
 * Compliance report with breaches and score
 */
reportsRoutes.get('/compliance', async (c) => {
  try {
    const startDate = c.req.query('start_date') || getDateDaysAgo(30);
    const endDate = c.req.query('end_date') || getToday();

    const report = await generateComplianceReport(c.env.DB, startDate, endDate);

    return c.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Compliance report error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to generate compliance report',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/reports/breaches
 * Detailed breach analysis
 */
reportsRoutes.get('/breaches', async (c) => {
  try {
    const startDate = c.req.query('start_date') || getDateDaysAgo(30);
    const endDate = c.req.query('end_date') || getToday();

    const report = await generateBreachReport(c.env.DB, startDate, endDate);

    return c.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Breach report error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to generate breach report',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/reports/historical
 * Historical trends report
 */
reportsRoutes.get('/historical', async (c) => {
  try {
    const startDate = c.req.query('start_date') || getDateDaysAgo(30);
    const endDate = c.req.query('end_date') || getToday();

    const report = await generateHistoricalReport(c.env.DB, startDate, endDate);

    return c.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Historical report error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to generate historical report',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/reports/pre-trade
 * Pre-trade validation summary
 */
reportsRoutes.get('/pre-trade', async (c) => {
  try {
    const startDate = c.req.query('start_date') || getDateDaysAgo(30);
    const endDate = c.req.query('end_date') || getToday();

    const report = await generatePreTradeReport(c.env.DB, startDate, endDate);

    return c.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Pre-trade report error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to generate pre-trade report',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/reports/approvals
 * Approval workflow summary
 */
reportsRoutes.get('/approvals', async (c) => {
  try {
    const startDate = c.req.query('start_date') || getDateDaysAgo(30);
    const endDate = c.req.query('end_date') || getToday();

    const report = await generateApprovalReport(c.env.DB, startDate, endDate);

    return c.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Approval report error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to generate approval report',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/reports/audit
 * Complete audit trail
 */
reportsRoutes.get('/audit', async (c) => {
  try {
    const startDate = c.req.query('start_date') || getDateDaysAgo(30);
    const endDate = c.req.query('end_date') || getToday();

    const report = await generateAuditReport(c.env.DB, startDate, endDate);

    return c.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Audit report error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to generate audit report',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/reports/export
 * Export report in specified format
 */
reportsRoutes.post('/export', async (c) => {
  try {
    const body = await c.req.json();
    const { report_type, format, start_date, end_date, limit_type } = body;

    if (!report_type || !format) {
      return c.json(
        {
          success: false,
          error: 'report_type and format are required',
        },
        400
      );
    }

    // Generate report based on type
    let report: any;
    const startDate = start_date || getDateDaysAgo(30);
    const endDate = end_date || getToday();

    switch (report_type) {
      case 'position':
        report = await generatePositionReport(c.env.DB, {
          limitType: limit_type || 1,
        });
        break;
      case 'compliance':
        report = await generateComplianceReport(c.env.DB, startDate, endDate);
        break;
      case 'breaches':
        report = await generateBreachReport(c.env.DB, startDate, endDate);
        break;
      case 'historical':
        report = await generateHistoricalReport(c.env.DB, startDate, endDate);
        break;
      case 'pre-trade':
        report = await generatePreTradeReport(c.env.DB, startDate, endDate);
        break;
      case 'approvals':
        report = await generateApprovalReport(c.env.DB, startDate, endDate);
        break;
      case 'audit':
        report = await generateAuditReport(c.env.DB, startDate, endDate);
        break;
      default:
        return c.json(
          {
            success: false,
            error: 'Invalid report type',
          },
          400
        );
    }

    // Export in requested format
    let content: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'csv':
        // For CSV, use the main data array
        const dataKey = getDataKey(report_type);
        const data = report[dataKey] || [];
        const headers = data.length > 0 ? Object.keys(data[0]) : [];
        content = exportToCSV(data, headers);
        contentType = 'text/csv';
        filename = `${report_type}_report_${getToday()}.csv`;
        break;

      case 'json':
        content = exportToJSON(report);
        contentType = 'application/json';
        filename = `${report_type}_report_${getToday()}.json`;
        break;

      default:
        return c.json(
          {
            success: false,
            error: 'Invalid format. Supported: csv, json',
          },
          400
        );
    }

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export report error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to export report',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/reports/summary
 * Quick summary of key metrics (for backwards compatibility)
 */
reportsRoutes.get('/summary', async (c) => {
  try {
    const positionReport = await generatePositionReport(c.env.DB, { limitType: 1 });
    const complianceReport = await generateComplianceReport(
      c.env.DB,
      getDateDaysAgo(7),
      getToday()
    );

    return c.json({
      success: true,
      summary: {
        total_positions: positionReport.summary.total_positions,
        breached: positionReport.summary.breached,
        remediate: positionReport.summary.remediate,
        validate: positionReport.summary.validate,
        monitor: positionReport.summary.monitor,
        avg_utilization: positionReport.summary.avg_utilization,
        compliance_score: complianceReport.compliance_score,
        recent_breaches: complianceReport.summary.total_breaches,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Summary report error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to generate summary',
        message: error.message,
      },
      500
    );
  }
});

// Helper functions
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function getDataKey(reportType: string): string {
  const keyMap: { [key: string]: string } = {
    position: 'positions',
    compliance: 'breaches',
    breaches: 'breaches',
    historical: 'daily_trends',
    'pre-trade': 'recent_checks',
    approvals: 'recent_approvals',
    audit: 'market_limit_changes',
  };
  return keyMap[reportType] || 'data';
}

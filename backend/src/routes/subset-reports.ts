/**
 * Subset Reports API Routes
 *
 * Endpoints for generating and retrieving CFTC subset reports
 */

import { Hono } from 'hono';
import { createSubsetReportService } from '../services/subset-report-service';
import { authenticate } from '../middleware/auth';

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

// ============================================================================
// SUBSET REPORT ROUTES
// ============================================================================

/**
 * GET /api/subset-reports/top-counterparties
 * Get top 10 physical counterparties for natural gas
 */
app.get('/top-counterparties', authenticate, async (c) => {
  const db = c.env.DB;
  const { start_date, end_date, company_id } = c.req.query();

  try {
    if (!start_date || !end_date) {
      return c.json(
        { error: 'start_date and end_date query parameters are required' },
        400
      );
    }

    const user = c.get('user') as any;
    const companyId = company_id ? parseInt(company_id) : user?.companyId || 1;

    const service = createSubsetReportService(db);
    const report = await service.getTopCounterpartiesReport(
      start_date,
      end_date,
      companyId
    );

    return c.json({
      report_type: 'TOP_COUNTERPARTIES',
      start_date,
      end_date,
      company_id: companyId,
      data: report,
      total_counterparties: report.length,
    });
  } catch (error: any) {
    console.error('Error generating top counterparties report:', error);
    return c.json(
      { error: 'Failed to generate report', details: error.message },
      500
    );
  }
});

/**
 * GET /api/subset-reports/next-day-fixed
 * Get next-day fixed-price transactions
 */
app.get('/next-day-fixed', authenticate, async (c) => {
  const db = c.env.DB;
  const { target_date, company_id } = c.req.query();

  try {
    if (!target_date) {
      return c.json(
        { error: 'target_date query parameter is required' },
        400
      );
    }

    const user = c.get('user') as any;
    const companyId = company_id ? parseInt(company_id) : user?.companyId || 1;

    const service = createSubsetReportService(db);
    const report = await service.getNextDayFixedPriceReport(
      target_date,
      companyId
    );

    return c.json({
      report_type: 'NEXT_DAY_FIXED',
      target_date,
      company_id: companyId,
      data: report,
      total_transactions: report.length,
    });
  } catch (error: any) {
    console.error('Error generating next-day fixed report:', error);
    return c.json(
      { error: 'Failed to generate report', details: error.message },
      500
    );
  }
});

/**
 * GET /api/subset-reports/next-day-index
 * Get next-day index-based transactions
 */
app.get('/next-day-index', authenticate, async (c) => {
  const db = c.env.DB;
  const { target_date, company_id } = c.req.query();

  try {
    if (!target_date) {
      return c.json(
        { error: 'target_date query parameter is required' },
        400
      );
    }

    const user = c.get('user') as any;
    const companyId = company_id ? parseInt(company_id) : user?.companyId || 1;

    const service = createSubsetReportService(db);
    const report = await service.getNextDayIndexPriceReport(
      target_date,
      companyId
    );

    return c.json({
      report_type: 'NEXT_DAY_INDEX',
      target_date,
      company_id: companyId,
      data: report,
      total_transactions: report.length,
    });
  } catch (error: any) {
    console.error('Error generating next-day index report:', error);
    return c.json(
      { error: 'Failed to generate report', details: error.message },
      500
    );
  }
});

/**
 * GET /api/subset-reports/next-day-exposure
 * Get next-day print exposure summary
 */
app.get('/next-day-exposure', authenticate, async (c) => {
  const db = c.env.DB;
  const { target_date, company_id } = c.req.query();

  try {
    if (!target_date) {
      return c.json(
        { error: 'target_date query parameter is required' },
        400
      );
    }

    const user = c.get('user') as any;
    const companyId = company_id ? parseInt(company_id) : user?.companyId || 1;

    const service = createSubsetReportService(db);
    const report = await service.getNextDayPrintExposureReport(
      target_date,
      companyId
    );

    return c.json({
      report_type: 'NEXT_DAY_EXPOSURE',
      target_date,
      company_id: companyId,
      data: report,
      total_locations: report.length,
    });
  } catch (error: any) {
    console.error('Error generating next-day exposure report:', error);
    return c.json(
      { error: 'Failed to generate report', details: error.message },
      500
    );
  }
});

/**
 * POST /api/subset-reports/generate
 * Generate and store a subset report
 */
app.post('/generate', authenticate, async (c) => {
  const db = c.env.DB;

  try {
    const body = await c.req.json();
    const { report_type, report_date, company_id, params } = body;

    if (!report_type || !report_date) {
      return c.json(
        { error: 'report_type and report_date are required' },
        400
      );
    }

    const user = c.get('user') as any;
    const companyId = company_id || user?.companyId || 1;
    const userId = user?.userId;

    const service = createSubsetReportService(db);
    const report = await service.generateReport(
      report_type,
      report_date,
      companyId,
      userId,
      params
    );

    return c.json(
      {
        message: 'Report generated successfully',
        report: {
          id: report.id,
          report_type: report.report_type,
          report_date: report.report_date,
          generation_status: report.generation_status,
        },
      },
      201
    );
  } catch (error: any) {
    console.error('Error generating and storing report:', error);
    return c.json(
      { error: 'Failed to generate report', details: error.message },
      500
    );
  }
});

/**
 * GET /api/subset-reports/:id
 * Get stored report by ID
 */
app.get('/:id', authenticate, async (c) => {
  const db = c.env.DB;
  const reportId = parseInt(c.req.param('id'));

  try {
    if (isNaN(reportId)) {
      return c.json({ error: 'Invalid report ID' }, 400);
    }

    const service = createSubsetReportService(db);
    const report = await service.getStoredReport(reportId);

    if (!report) {
      return c.json({ error: 'Report not found' }, 404);
    }

    // Parse report data
    let reportData;
    try {
      reportData = JSON.parse(report.report_data || '[]');
    } catch {
      reportData = [];
    }

    return c.json({
      id: report.id,
      report_type: report.report_type,
      report_date: report.report_date,
      company_id: report.company_id,
      generation_status: report.generation_status,
      error_message: report.error_message,
      generated_at: report.generated_at,
      data: reportData,
    });
  } catch (error: any) {
    console.error('Error retrieving report:', error);
    return c.json(
      { error: 'Failed to retrieve report', details: error.message },
      500
    );
  }
});

/**
 * GET /api/subset-reports
 * List stored reports with filters
 */
app.get('/', authenticate, async (c) => {
  const db = c.env.DB;
  const { report_type, start_date, end_date, company_id } = c.req.query();

  try {
    const user = c.get('user') as any;
    const companyId = company_id
      ? parseInt(company_id)
      : user?.companyId || undefined;

    const service = createSubsetReportService(db);
    const reports = await service.getReports(
      report_type,
      start_date,
      end_date,
      companyId
    );

    // Don't include full report_data in list view (too large)
    const reportList = reports.map((r) => ({
      id: r.id,
      report_type: r.report_type,
      report_date: r.report_date,
      company_id: r.company_id,
      generation_status: r.generation_status,
      error_message: r.error_message,
      generated_at: r.generated_at,
    }));

    return c.json({
      reports: reportList,
      total: reportList.length,
    });
  } catch (error: any) {
    console.error('Error listing reports:', error);
    return c.json(
      { error: 'Failed to list reports', details: error.message },
      500
    );
  }
});

/**
 * DELETE /api/subset-reports/cleanup
 * Delete old reports (admin only)
 */
app.delete('/cleanup', authenticate, async (c) => {
  const db = c.env.DB;
  const { days_to_keep } = c.req.query();

  try {
    const daysToKeep = days_to_keep ? parseInt(days_to_keep) : 90;

    const service = createSubsetReportService(db);
    const deletedCount = await service.deleteOldReports(daysToKeep);

    return c.json({
      message: 'Old reports cleaned up successfully',
      deleted_count: deletedCount,
      days_kept: daysToKeep,
    });
  } catch (error: any) {
    console.error('Error cleaning up reports:', error);
    return c.json(
      { error: 'Failed to clean up reports', details: error.message },
      500
    );
  }
});

export default app;

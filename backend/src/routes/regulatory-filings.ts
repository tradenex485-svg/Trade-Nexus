/**
 * Regulatory Filings API Routes
 * Endpoints for managing regulatory submissions and filings
 */

import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';
import {
  generateCFTCLTRS,
  generateICEDailyReport,
  generateCMEReport,
  getFilingHistory,
  getFilingDetails,
  submitFiling,
} from '../services/regulatory-reporting';

const app = new Hono();

/**
 * GET /api/regulatory-filings
 * Get filing history with optional filters
 */
app.get('/', authenticate, async (c) => {
  try {
    const filingType = c.req.query('filing_type');
    const regulatoryBody = c.req.query('regulatory_body');
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');

    const filings = await getFilingHistory(c.env.DB, {
      filing_type: filingType,
      regulatory_body: regulatoryBody,
      status,
      limit,
    });

    return c.json({
      success: true,
      data: filings,
      count: filings.length,
    });
  } catch (error: any) {
    console.error('[API] Error getting filing history:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve filing history',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/regulatory-filings/:id
 * Get detailed filing information including line items
 */
app.get('/:id', authenticate, async (c) => {
  try {
    const filingId = parseInt(c.req.param('id'));

    const filing = await getFilingDetails(c.env.DB, filingId);

    if (!filing) {
      return c.json({
        success: false,
        error: 'Filing not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: filing,
    });
  } catch (error: any) {
    console.error('[API] Error getting filing details:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve filing details',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/regulatory-filings/generate/cftc-ltrs
 * Generate CFTC Large Trader Reporting System filing
 */
app.post('/generate/cftc-ltrs', authenticate, authorize('filings.create'), async (c) => {
  try {
    const user = c.get('user');
    const { report_date } = await c.req.json();

    if (!report_date) {
      return c.json({
        success: false,
        error: 'report_date is required',
      }, 400);
    }

    const result = await generateCFTCLTRS(c.env.DB, report_date, user.userId);

    return c.json({
      success: true,
      message: 'CFTC LTRS filing generated successfully',
      data: {
        filing_id: result.filing_id,
        file_format: result.file_format,
        line_items_count: result.line_items_count,
        reportable_positions: result.reportable_positions,
      },
      file_preview: result.file_content.substring(0, 500) + '...',
    });
  } catch (error: any) {
    console.error('[API] Error generating CFTC LTRS:', error);
    return c.json({
      success: false,
      error: 'Failed to generate CFTC LTRS filing',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/regulatory-filings/generate/ice-daily
 * Generate ICE Daily Position Report
 */
app.post('/generate/ice-daily', authenticate, authorize('filings.create'), async (c) => {
  try {
    const user = c.get('user');
    const { report_date, exchange_id } = await c.req.json();

    if (!report_date || !exchange_id) {
      return c.json({
        success: false,
        error: 'report_date and exchange_id are required',
      }, 400);
    }

    const result = await generateICEDailyReport(c.env.DB, report_date, exchange_id, user.userId);

    return c.json({
      success: true,
      message: 'ICE Daily Position Report generated successfully',
      data: {
        filing_id: result.filing_id,
        file_format: result.file_format,
        line_items_count: result.line_items_count,
        reportable_positions: result.reportable_positions,
      },
      file_preview: result.file_content.substring(0, 500) + '...',
    });
  } catch (error: any) {
    console.error('[API] Error generating ICE report:', error);
    return c.json({
      success: false,
      error: 'Failed to generate ICE Daily Position Report',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/regulatory-filings/generate/cme
 * Generate CME Position Report
 */
app.post('/generate/cme', authenticate, authorize('filings.create'), async (c) => {
  try {
    const user = c.get('user');
    const { report_date, exchange_id } = await c.req.json();

    if (!report_date || !exchange_id) {
      return c.json({
        success: false,
        error: 'report_date and exchange_id are required',
      }, 400);
    }

    const result = await generateCMEReport(c.env.DB, report_date, exchange_id, user.userId);

    return c.json({
      success: true,
      message: 'CME Position Report generated successfully',
      data: {
        filing_id: result.filing_id,
        file_format: result.file_format,
        line_items_count: result.line_items_count,
        reportable_positions: result.reportable_positions,
      },
      file_preview: result.file_content.substring(0, 500) + '...',
    });
  } catch (error: any) {
    console.error('[API] Error generating CME report:', error);
    return c.json({
      success: false,
      error: 'Failed to generate CME Position Report',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/regulatory-filings/:id/submit
 * Submit filing to regulatory body
 */
app.post('/:id/submit', authenticate, authorize('filings.submit'), async (c) => {
  try {
    const filingId = parseInt(c.req.param('id'));

    await submitFiling(c.env.DB, filingId);

    return c.json({
      success: true,
      message: 'Filing submitted successfully',
      data: { filing_id: filingId },
    });
  } catch (error: any) {
    console.error('[API] Error submitting filing:', error);
    return c.json({
      success: false,
      error: 'Failed to submit filing',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/regulatory-filings/:id/download
 * Download filing file
 */
app.get('/:id/download', authenticate, async (c) => {
  try {
    const filingId = parseInt(c.req.param('id'));

    const filing = await getFilingDetails(c.env.DB, filingId);

    if (!filing) {
      return c.json({
        success: false,
        error: 'Filing not found',
      }, 404);
    }

    // Get file content from filing
    const fileContent = await c.env.DB.prepare(`
      SELECT
        rf.*,
        GROUP_CONCAT(
          json_object(
            'commodity_code', fli.commodity_code,
            'contract_month', fli.contract_month,
            'net_position', fli.net_position,
            'long_position', fli.long_position,
            'short_position', fli.short_position
          )
        ) as line_items_json
      FROM regulatory_filings rf
      LEFT JOIN filing_line_items fli ON rf.id = fli.filing_id
      WHERE rf.id = ?
      GROUP BY rf.id
    `).bind(filingId).first();

    if (!fileContent) {
      return c.json({
        success: false,
        error: 'File content not available',
      }, 404);
    }

    // Regenerate file based on format
    let content = '';
    let contentType = 'text/plain';
    let filename = '';

    if (filing.file_format === 'xml') {
      // Regenerate XML
      content = generateFileContent(filing, 'xml');
      contentType = 'application/xml';
      filename = `${filing.filing_type}_${filing.report_date}.xml`;
    } else if (filing.file_format === 'csv') {
      // Regenerate CSV
      content = generateFileContent(filing, 'csv');
      contentType = 'text/csv';
      filename = `${filing.filing_type}_${filing.report_date}.csv`;
    } else {
      content = JSON.stringify(filing, null, 2);
      contentType = 'application/json';
      filename = `${filing.filing_type}_${filing.report_date}.json`;
    }

    return c.body(content, 200, {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
  } catch (error: any) {
    console.error('[API] Error downloading filing:', error);
    return c.json({
      success: false,
      error: 'Failed to download filing',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/regulatory-filings/stats/summary
 * Get filing statistics summary
 */
app.get('/stats/summary', authenticate, async (c) => {
  try {
    const stats = await c.env.DB.prepare(`
      SELECT
        filing_type,
        regulatory_body,
        COUNT(*) as total_filings,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'generated' THEN 1 ELSE 0 END) as generated,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        MAX(submitted_at) as last_submission
      FROM regulatory_filings
      WHERE created_at >= date('now', '-30 days')
      GROUP BY filing_type, regulatory_body
    `).all();

    const totalStats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_filings,
        COUNT(DISTINCT filing_type) as filing_types,
        COUNT(DISTINCT regulatory_body) as regulatory_bodies,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_total
      FROM regulatory_filings
      WHERE created_at >= date('now', '-30 days')
    `).first();

    return c.json({
      success: true,
      data: {
        by_type: stats.results,
        summary: totalStats,
      },
    });
  } catch (error: any) {
    console.error('[API] Error getting filing stats:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve filing statistics',
      message: error.message,
    }, 500);
  }
});

/**
 * Helper: Generate file content from filing data
 */
function generateFileContent(filing: any, format: string): string {
  if (format === 'xml') {
    // Regenerate XML from line items
    const lineItems = filing.line_items || [];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<LargeTraderReport version="2.0">
  <ReportHeader>
    <ReportDate>${filing.report_date}</ReportDate>
    <FilingType>${filing.filing_type}</FilingType>
  </ReportHeader>
  <Positions>
`;
    for (const item of lineItems) {
      xml += `    <Position>
      <CommodityCode>${item.commodity_code}</CommodityCode>
      <ContractMonth>${item.contract_month || ''}</ContractMonth>
      <NetPosition>${item.net_position}</NetPosition>
    </Position>
`;
    }
    xml += `  </Positions>
</LargeTraderReport>`;
    return xml;
  } else if (format === 'csv') {
    // Regenerate CSV from line items
    const lineItems = filing.line_items || [];
    const header = 'Report Date,Commodity Code,Contract Month,Net Position,Long Position,Short Position';
    const rows = lineItems.map((item: any) => {
      return [
        filing.report_date,
        item.commodity_code,
        item.contract_month || '',
        item.net_position,
        item.long_position,
        item.short_position
      ].join(',');
    });
    return [header, ...rows].join('\n');
  }

  return JSON.stringify(filing, null, 2);
}

export default app;

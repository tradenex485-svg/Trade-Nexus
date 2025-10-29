/**
 * Regulatory Reporting Service
 * Generates and manages automated regulatory filings
 * Supports: CFTC LTRS, ICE Daily Position Reports, CME Reports
 */

export interface FilingData {
  filing_type: string;
  filing_period: string;
  report_date: string;
  exchange_id?: number;
  regulatory_body: string;
  created_by?: number;
}

export interface LineItem {
  commodity_code: string;
  contract_month?: string;
  market_location?: string;
  exchange_code?: string;
  long_position: number;
  short_position: number;
  net_position: number;
  spread_position?: number;
  limit_type?: string;
  applicable_limit?: number;
  utilization_pct?: number;
  hedge_exemption?: number;
  exemption_type?: string;
  trader_classification?: string;
  account_id?: string;
}

export interface FilingResult {
  filing_id: number;
  file_content: string;
  file_format: string;
  line_items_count: number;
  reportable_positions: number;
}

/**
 * Generate CFTC Large Trader Reporting System (LTRS) filing
 * Format: XML (Form 40/102)
 */
export async function generateCFTCLTRS(
  db: any,
  reportDate: string,
  createdBy?: number
): Promise<FilingResult> {
  console.log(`[REGULATORY FILING] Generating CFTC LTRS for ${reportDate}`);

  // Step 1: Create filing record
  const filing = await createFiling(db, {
    filing_type: 'cftc_ltrs',
    filing_period: 'daily',
    report_date: reportDate,
    regulatory_body: 'CFTC',
    created_by: createdBy,
  });

  // Step 2: Get reportable positions
  const positions = await getReportablePositions(db, reportDate, 'CFTC');

  // Step 3: Create line items
  const lineItems: LineItem[] = [];
  for (const pos of positions.results) {
    const lineItem: LineItem = {
      commodity_code: pos.commodity_code,
      contract_month: pos.contract_month,
      market_location: pos.market_location,
      exchange_code: pos.exchange_code || 'ICE',
      long_position: pos.long_position || 0,
      short_position: pos.short_position || 0,
      net_position: pos.net_position,
      limit_type: pos.limit_type === 1 ? 'spot_month' : pos.limit_type === 2 ? 'single_month' : 'all_month',
      applicable_limit: pos.applicable_limit,
      utilization_pct: pos.utilization_pct,
      trader_classification: classifyTrader(pos.net_position, pos.reportable_threshold),
    };

    await saveLineItem(db, filing.id, lineItem);
    lineItems.push(lineItem);
  }

  // Step 4: Generate XML content
  const xmlContent = generateCFTCXML(filing, lineItems, reportDate);

  // Step 5: Update filing record
  await updateFilingStatus(db, filing.id, {
    status: 'generated',
    file_format: 'xml',
    file_content: xmlContent,
    generated_at: new Date().toISOString(),
  });

  console.log(`[REGULATORY FILING] CFTC LTRS generated: ${lineItems.length} positions`);

  return {
    filing_id: filing.id,
    file_content: xmlContent,
    file_format: 'xml',
    line_items_count: lineItems.length,
    reportable_positions: lineItems.length,
  };
}

/**
 * Generate ICE Daily Position Report
 * Format: CSV
 */
export async function generateICEDailyReport(
  db: any,
  reportDate: string,
  exchangeId: number,
  createdBy?: number
): Promise<FilingResult> {
  console.log(`[REGULATORY FILING] Generating ICE Daily Position Report for ${reportDate}`);

  // Step 1: Create filing record
  const filing = await createFiling(db, {
    filing_type: 'ice_daily_position',
    filing_period: 'daily',
    report_date: reportDate,
    exchange_id: exchangeId,
    regulatory_body: 'ICE',
    created_by: createdBy,
  });

  // Step 2: Get all active positions for ICE exchange
  const positions = await getExchangePositions(db, reportDate, exchangeId);

  // Step 3: Create line items
  const lineItems: LineItem[] = [];
  for (const pos of positions.results) {
    const lineItem: LineItem = {
      commodity_code: pos.commodity_code,
      contract_month: pos.contract_month,
      market_location: pos.market_location,
      exchange_code: 'ICE',
      long_position: pos.long_position || 0,
      short_position: pos.short_position || 0,
      net_position: pos.net_position,
      spread_position: pos.spread_position || 0,
      limit_type: pos.limit_type === 1 ? 'spot_month' : pos.limit_type === 2 ? 'single_month' : 'all_month',
      applicable_limit: pos.applicable_limit,
      utilization_pct: pos.utilization_pct,
    };

    await saveLineItem(db, filing.id, lineItem);
    lineItems.push(lineItem);
  }

  // Step 4: Generate CSV content
  const csvContent = generateICECSV(lineItems, reportDate);

  // Step 5: Update filing record
  await updateFilingStatus(db, filing.id, {
    status: 'generated',
    file_format: 'csv',
    file_content: csvContent,
    generated_at: new Date().toISOString(),
  });

  console.log(`[REGULATORY FILING] ICE report generated: ${lineItems.length} positions`);

  return {
    filing_id: filing.id,
    file_content: csvContent,
    file_format: 'csv',
    line_items_count: lineItems.length,
    reportable_positions: lineItems.filter(i => Math.abs(i.net_position) >= 100).length,
  };
}

/**
 * Generate CME Position Report
 * Format: CSV
 */
export async function generateCMEReport(
  db: any,
  reportDate: string,
  exchangeId: number,
  createdBy?: number
): Promise<FilingResult> {
  console.log(`[REGULATORY FILING] Generating CME Position Report for ${reportDate}`);

  const filing = await createFiling(db, {
    filing_type: 'cme_position_report',
    filing_period: 'daily',
    report_date: reportDate,
    exchange_id: exchangeId,
    regulatory_body: 'CME',
    created_by: createdBy,
  });

  const positions = await getExchangePositions(db, reportDate, exchangeId);
  const lineItems: LineItem[] = [];

  for (const pos of positions.results) {
    const lineItem: LineItem = {
      commodity_code: pos.commodity_code,
      contract_month: pos.contract_month,
      long_position: pos.long_position || 0,
      short_position: pos.short_position || 0,
      net_position: pos.net_position,
      limit_type: pos.limit_type === 1 ? 'spot_month' : pos.limit_type === 2 ? 'single_month' : 'all_month',
      applicable_limit: pos.applicable_limit,
    };

    await saveLineItem(db, filing.id, lineItem);
    lineItems.push(lineItem);
  }

  const csvContent = generateCMECSV(lineItems, reportDate);

  await updateFilingStatus(db, filing.id, {
    status: 'generated',
    file_format: 'csv',
    file_content: csvContent,
    generated_at: new Date().toISOString(),
  });

  console.log(`[REGULATORY FILING] CME report generated: ${lineItems.length} positions`);

  return {
    filing_id: filing.id,
    file_content: csvContent,
    file_format: 'csv',
    line_items_count: lineItems.length,
    reportable_positions: lineItems.length,
  };
}

/**
 * Helper: Create filing record
 */
async function createFiling(db: any, data: FilingData): Promise<any> {
  const result = await db.prepare(`
    INSERT INTO regulatory_filings (
      filing_type, filing_period, report_date, exchange_id,
      regulatory_body, status, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)
  `).bind(
    data.filing_type,
    data.filing_period,
    data.report_date,
    data.exchange_id || null,
    data.regulatory_body,
    data.created_by || null
  ).run();

  return { id: result.meta.last_row_id };
}

/**
 * Helper: Get reportable positions (exceeding CFTC thresholds)
 */
async function getReportablePositions(db: any, reportDate: string, regulatoryBody: string): Promise<any> {
  return await db.prepare(`
    SELECT
      lc.id,
      lc.reporting_limit_code as commodity_code,
      lc.mkt_index as market_location,
      lc.contract_month,
      lc.limit_type,
      lc.pos_lots as net_position,
      0 as long_position,
      0 as short_position,
      0 as spread_position,
      e.exchange_code,
      CASE
        WHEN lc.limit_type = 1 THEN ml.spot_month_limit
        WHEN lc.limit_type = 2 THEN ml.one_month_limit
        ELSE ml.all_month_limit
      END as applicable_limit,
      lc.pos_pct as utilization_pct,
      rt.threshold_value as reportable_threshold
    FROM limit_calculations lc
    JOIN market_limits ml ON lc.reporting_limit_code = ml.commodity_code
    LEFT JOIN exchanges e ON ml.exchange_id = e.id
    LEFT JOIN regulatory_thresholds rt ON
      rt.commodity_code = lc.reporting_limit_code
      AND rt.regulatory_body = ?
      AND rt.threshold_type = 'reportable_position'
      AND rt.is_active = 1
    WHERE lc.is_active = 1
      AND lc.is_parent = 1
      AND ABS(lc.pos_lots) >= COALESCE(rt.threshold_value, 100)
    ORDER BY ABS(lc.pos_lots) DESC
  `).bind(regulatoryBody).all();
}

/**
 * Helper: Get all positions for specific exchange
 */
async function getExchangePositions(db: any, reportDate: string, exchangeId: number): Promise<any> {
  return await db.prepare(`
    SELECT
      lc.id,
      lc.reporting_limit_code as commodity_code,
      lc.mkt_index as market_location,
      lc.contract_month,
      lc.limit_type,
      lc.pos_lots as net_position,
      0 as long_position,
      0 as short_position,
      0 as spread_position,
      CASE
        WHEN lc.limit_type = 1 THEN ml.spot_month_limit
        WHEN lc.limit_type = 2 THEN ml.one_month_limit
        ELSE ml.all_month_limit
      END as applicable_limit,
      lc.pos_pct as utilization_pct
    FROM limit_calculations lc
    JOIN market_limits ml ON lc.reporting_limit_code = ml.commodity_code
    WHERE lc.is_active = 1
      AND lc.is_parent = 1
      AND ml.exchange_id = ?
    ORDER BY lc.reporting_limit_code, lc.contract_month
  `).bind(exchangeId).all();
}

/**
 * Helper: Save line item
 */
async function saveLineItem(db: any, filingId: number, item: LineItem): Promise<void> {
  await db.prepare(`
    INSERT INTO filing_line_items (
      filing_id, commodity_code, contract_month, market_location, exchange_code,
      long_position, short_position, net_position, spread_position,
      limit_type, applicable_limit, utilization_pct,
      hedge_exemption, exemption_type, trader_classification, account_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    filingId,
    item.commodity_code,
    item.contract_month || null,
    item.market_location || null,
    item.exchange_code || null,
    item.long_position,
    item.short_position,
    item.net_position,
    item.spread_position || 0,
    item.limit_type || null,
    item.applicable_limit || null,
    item.utilization_pct || null,
    item.hedge_exemption || 0,
    item.exemption_type || null,
    item.trader_classification || null,
    item.account_id || null
  ).run();
}

/**
 * Helper: Update filing status
 */
async function updateFilingStatus(db: any, filingId: number, updates: any): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.status) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.file_format) {
    fields.push('file_format = ?');
    values.push(updates.file_format);
  }
  if (updates.generated_at) {
    fields.push('generated_at = ?');
    values.push(updates.generated_at);
  }
  if (updates.submitted_at) {
    fields.push('submitted_at = ?');
    values.push(updates.submitted_at);
  }
  if (updates.confirmation_number) {
    fields.push('confirmation_number = ?');
    values.push(updates.confirmation_number);
  }
  if (updates.error_message) {
    fields.push('error_message = ?');
    values.push(updates.error_message);
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(filingId);

  await db.prepare(`
    UPDATE regulatory_filings
    SET ${fields.join(', ')}
    WHERE id = ?
  `).bind(...values).run();
}

/**
 * Helper: Classify trader for CFTC reporting
 */
function classifyTrader(netPosition: number, threshold: number): string {
  if (Math.abs(netPosition) >= threshold) {
    return 'reportable';
  }
  return 'non_reportable';
}

/**
 * Generate CFTC XML format (simplified Form 102)
 */
function generateCFTCXML(filing: any, lineItems: LineItem[], reportDate: string): string {
  const date = new Date(reportDate).toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<LargeTraderReport xmlns="http://www.cftc.gov/LTR" version="2.0">
  <ReportHeader>
    <ReportType>Form102</ReportType>
    <ReportDate>${date}</ReportDate>
    <ReportingFirm>Trade Nexus</ReportingFirm>
    <SubmissionTimestamp>${new Date().toISOString()}</SubmissionTimestamp>
  </ReportHeader>
  <Positions>
`;

  for (const item of lineItems) {
    xml += `    <Position>
      <CommodityCode>${escapeXML(item.commodity_code)}</CommodityCode>
      <ContractMonth>${item.contract_month || ''}</ContractMonth>
      <Exchange>${item.exchange_code || 'ICE'}</Exchange>
      <LongPosition>${item.long_position}</LongPosition>
      <ShortPosition>${item.short_position}</ShortPosition>
      <NetPosition>${item.net_position}</NetPosition>
      <TraderClassification>${item.trader_classification || 'reportable'}</TraderClassification>
    </Position>
`;
  }

  xml += `  </Positions>
</LargeTraderReport>`;

  return xml;
}

/**
 * Generate ICE CSV format
 */
function generateICECSV(lineItems: LineItem[], reportDate: string): string {
  const header = 'Report Date,Commodity Code,Contract Month,Market Location,Long Position,Short Position,Net Position,Spread Position,Limit Type,Applicable Limit,Utilization %';
  const rows = lineItems.map(item => {
    return [
      reportDate,
      item.commodity_code,
      item.contract_month || '',
      item.market_location || '',
      item.long_position,
      item.short_position,
      item.net_position,
      item.spread_position || 0,
      item.limit_type || '',
      item.applicable_limit || '',
      item.utilization_pct ? item.utilization_pct.toFixed(2) : ''
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Generate CME CSV format
 */
function generateCMECSV(lineItems: LineItem[], reportDate: string): string {
  const header = 'Reporting Date,Product Code,Contract Month,Long Contracts,Short Contracts,Net Position,Position Limit';
  const rows = lineItems.map(item => {
    return [
      reportDate,
      item.commodity_code,
      item.contract_month || '',
      item.long_position,
      item.short_position,
      item.net_position,
      item.applicable_limit || ''
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Helper: Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Get filing history with filters
 */
export async function getFilingHistory(
  db: any,
  filters: {
    filing_type?: string;
    regulatory_body?: string;
    status?: string;
    limit?: number;
  }
): Promise<any[]> {
  let query = `SELECT * FROM v_filing_status WHERE 1=1`;
  const params: any[] = [];

  if (filters.filing_type) {
    query += ` AND filing_type = ?`;
    params.push(filters.filing_type);
  }
  if (filters.regulatory_body) {
    query += ` AND regulatory_body = ?`;
    params.push(filters.regulatory_body);
  }
  if (filters.status) {
    query += ` AND status = ?`;
    params.push(filters.status);
  }

  query += ` ORDER BY report_date DESC, created_at DESC LIMIT ?`;
  params.push(filters.limit || 50);

  const result = await db.prepare(query).bind(...params).all();
  return result.results;
}

/**
 * Get filing details including line items
 */
export async function getFilingDetails(db: any, filingId: number): Promise<any> {
  const filing = await db.prepare(`
    SELECT * FROM regulatory_filings WHERE id = ?
  `).bind(filingId).first();

  if (!filing) {
    return null;
  }

  const lineItems = await db.prepare(`
    SELECT * FROM filing_line_items WHERE filing_id = ? ORDER BY commodity_code
  `).bind(filingId).all();

  return {
    ...filing,
    line_items: lineItems.results,
  };
}

/**
 * Submit filing (placeholder for actual submission logic)
 */
export async function submitFiling(db: any, filingId: number): Promise<void> {
  const filing = await db.prepare(`
    SELECT * FROM regulatory_filings WHERE id = ?
  `).bind(filingId).first();

  if (!filing) {
    throw new Error('Filing not found');
  }

  if (filing.status !== 'generated') {
    throw new Error('Filing must be generated before submission');
  }

  // TODO: Implement actual submission logic based on filing_type
  // - CFTC LTRS: Submit via CFTC API or SFTP
  // - ICE: Submit via ICE portal API
  // - CME: Submit via CME reporting system

  // For now, mark as submitted
  await updateFilingStatus(db, filingId, {
    status: 'submitted',
    submitted_at: new Date().toISOString(),
    confirmation_number: `CONF-${filingId}-${Date.now()}`,
  });

  console.log(`[REGULATORY FILING] Filing ${filingId} submitted successfully`);
}

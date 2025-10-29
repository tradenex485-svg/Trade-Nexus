/**
 * Subset Report Service
 *
 * Generates specialized CFTC subset reports for position limit compliance
 * and risk monitoring as per GPL - CFTC Position Limit Functional Specification.
 */

export interface TopCounterpartyReport {
  counterparty_name: string;
  transaction_count: number;
  total_volume: number;
  buy_volume: number;
  sell_volume: number;
}

export interface NextDayTransaction {
  id: number;
  trade_date: string;
  market_location: string;
  contract_month: string;
  counterparty_name: string;
  position: number;
  price_type: string;
}

export interface NextDayExposure {
  market_location: string;
  contract_month: string;
  long_exposure: number;
  short_exposure: number;
  net_exposure: number;
  transaction_count: number;
}

export interface SubsetReportMetadata {
  id?: number;
  report_type: string;
  report_date: string;
  company_id: number;
  generated_by_user_id?: number;
  report_data: string; // JSON string
  generation_status: string;
  error_message?: string;
  generated_at?: string;
}

export class SubsetReportService {
  constructor(private db: D1Database) {}

  /**
   * Report 1: Top 10 Physical Counterparties - Natural Gas
   */
  async getTopCounterpartiesReport(
    startDate: string,
    endDate: string,
    companyId: number
  ): Promise<TopCounterpartyReport[]> {
    const query = `
      SELECT
        t.counterparty_name,
        COUNT(*) as transaction_count,
        SUM(ABS(t.base_delta_notnl_nd)) as total_volume,
        SUM(CASE WHEN t.base_delta_notnl_nd > 0 THEN t.base_delta_notnl_nd ELSE 0 END) as buy_volume,
        SUM(CASE WHEN t.base_delta_notnl_nd < 0 THEN ABS(t.base_delta_notnl_nd) ELSE 0 END) as sell_volume
      FROM transactions t
      WHERE t.company_id = ?
        AND (t.market_location LIKE '%NG%' OR t.commodity_code = 'NG')
        AND t.trade_date >= ?
        AND t.trade_date <= ?
        AND t.transaction_type = 'COMM-PHYS'
      GROUP BY t.counterparty_name
      ORDER BY total_volume DESC
      LIMIT 10
    `;

    const result = await this.db
      .prepare(query)
      .bind(companyId, startDate, endDate)
      .all();

    return result.results as unknown as TopCounterpartyReport[];
  }

  /**
   * Report 2: Physical Next-Day Fixed-Price Transactions
   */
  async getNextDayFixedPriceReport(
    targetDate: string,
    companyId: number
  ): Promise<NextDayTransaction[]> {
    const query = `
      SELECT
        t.id,
        t.trade_date,
        t.market_location,
        t.contract_month,
        t.counterparty_name,
        t.base_delta_notnl_nd as position,
        'FIXED' as price_type
      FROM transactions t
      WHERE t.company_id = ?
        AND t.is_next_day = 1
        AND t.price_type = 'FIXED'
        AND t.transaction_type = 'COMM-PHYS'
        AND t.trade_date = ?
      ORDER BY t.market_location, ABS(t.base_delta_notnl_nd) DESC
    `;

    const result = await this.db
      .prepare(query)
      .bind(companyId, targetDate)
      .all();

    return result.results as unknown as NextDayTransaction[];
  }

  /**
   * Report 3: Physical Next-Day Index-Based Transactions
   */
  async getNextDayIndexPriceReport(
    targetDate: string,
    companyId: number
  ): Promise<NextDayTransaction[]> {
    const query = `
      SELECT
        t.id,
        t.trade_date,
        t.market_location,
        t.contract_month,
        t.counterparty_name,
        t.base_delta_notnl_nd as position,
        'INDEX' as price_type
      FROM transactions t
      WHERE t.company_id = ?
        AND t.is_next_day = 1
        AND t.price_type = 'INDEX'
        AND t.transaction_type = 'COMM-PHYS'
        AND t.trade_date = ?
      ORDER BY t.market_location, ABS(t.base_delta_notnl_nd) DESC
    `;

    const result = await this.db
      .prepare(query)
      .bind(companyId, targetDate)
      .all();

    return result.results as unknown as NextDayTransaction[];
  }

  /**
   * Report 4: Next Day Print Exposure
   */
  async getNextDayPrintExposureReport(
    targetDate: string,
    companyId: number
  ): Promise<NextDayExposure[]> {
    const query = `
      SELECT
        t.market_location,
        t.contract_month,
        SUM(CASE WHEN t.base_delta_notnl_nd > 0 THEN t.base_delta_notnl_nd ELSE 0 END) as long_exposure,
        SUM(CASE WHEN t.base_delta_notnl_nd < 0 THEN ABS(t.base_delta_notnl_nd) ELSE 0 END) as short_exposure,
        SUM(t.base_delta_notnl_nd) as net_exposure,
        COUNT(*) as transaction_count
      FROM transactions t
      WHERE t.company_id = ?
        AND t.is_next_day = 1
        AND t.trade_date = ?
      GROUP BY t.market_location, t.contract_month
      ORDER BY ABS(SUM(t.base_delta_notnl_nd)) DESC
    `;

    const result = await this.db
      .prepare(query)
      .bind(companyId, targetDate)
      .all();

    return result.results as unknown as NextDayExposure[];
  }

  /**
   * Generate and store a subset report
   */
  async generateReport(
    reportType: string,
    reportDate: string,
    companyId: number,
    userId?: number,
    params?: any
  ): Promise<SubsetReportMetadata> {
    try {
      let reportData: any;

      switch (reportType) {
        case 'TOP_COUNTERPARTIES':
          const startDate = params?.startDate || reportDate;
          const endDate = params?.endDate || reportDate;
          reportData = await this.getTopCounterpartiesReport(
            startDate,
            endDate,
            companyId
          );
          break;

        case 'NEXT_DAY_FIXED':
          reportData = await this.getNextDayFixedPriceReport(
            reportDate,
            companyId
          );
          break;

        case 'NEXT_DAY_INDEX':
          reportData = await this.getNextDayIndexPriceReport(
            reportDate,
            companyId
          );
          break;

        case 'NEXT_DAY_EXPOSURE':
          reportData = await this.getNextDayPrintExposureReport(
            reportDate,
            companyId
          );
          break;

        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      // Store report in database
      const reportDataJson = JSON.stringify(reportData);

      const result = await this.db
        .prepare(
          `INSERT INTO subset_reports
           (report_type, report_date, company_id, generated_by_user_id,
            report_data, generation_status, generated_at)
           VALUES (?, ?, ?, ?, ?, 'COMPLETED', datetime('now'))`
        )
        .bind(reportType, reportDate, companyId, userId || null, reportDataJson)
        .run();

      return {
        id: result.meta.last_row_id,
        report_type: reportType,
        report_date: reportDate,
        company_id: companyId,
        generated_by_user_id: userId,
        report_data: reportDataJson,
        generation_status: 'COMPLETED',
      };
    } catch (error: any) {
      // Store error status
      await this.db
        .prepare(
          `INSERT INTO subset_reports
           (report_type, report_date, company_id, generated_by_user_id,
            generation_status, error_message, generated_at)
           VALUES (?, ?, ?, ?, 'FAILED', ?, datetime('now'))`
        )
        .bind(
          reportType,
          reportDate,
          companyId,
          userId || null,
          error.message
        )
        .run();

      throw error;
    }
  }

  /**
   * Get stored report by ID
   */
  async getStoredReport(reportId: number): Promise<SubsetReportMetadata | null> {
    const result = await this.db
      .prepare('SELECT * FROM subset_reports WHERE id = ?')
      .bind(reportId)
      .first<SubsetReportMetadata>();

    return result || null;
  }

  /**
   * Get reports by type and date range
   */
  async getReports(
    reportType?: string,
    startDate?: string,
    endDate?: string,
    companyId?: number
  ): Promise<SubsetReportMetadata[]> {
    let query = 'SELECT * FROM subset_reports WHERE 1=1';
    const params: any[] = [];

    if (reportType) {
      query += ' AND report_type = ?';
      params.push(reportType);
    }

    if (startDate) {
      query += ' AND report_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND report_date <= ?';
      params.push(endDate);
    }

    if (companyId) {
      query += ' AND company_id = ?';
      params.push(companyId);
    }

    query += ' ORDER BY generated_at DESC LIMIT 100';

    const result = await this.db.prepare(query).bind(...params).all();

    return result.results as unknown as SubsetReportMetadata[];
  }

  /**
   * Delete old reports (cleanup)
   */
  async deleteOldReports(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const result = await this.db
      .prepare('DELETE FROM subset_reports WHERE report_date < ?')
      .bind(cutoffDateStr)
      .run();

    return result.meta.changes || 0;
  }
}

/**
 * Factory function to create SubsetReportService instance
 */
export function createSubsetReportService(db: D1Database): SubsetReportService {
  return new SubsetReportService(db);
}

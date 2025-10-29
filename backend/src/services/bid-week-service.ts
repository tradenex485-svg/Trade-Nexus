/**
 * Bid Week Calculation Service
 *
 * Implements CFTC Position Limits bid week logic for exchange-specific
 * Good Business Days (GBD) calculations as per GPL - CFTC Position Limit
 * Functional Specification Section 2.1.1 (Definitions).
 *
 * Bid Week: Last N trading days of each month (excluding holidays/weekends)
 * - ICE: Last 5 Good Business Days (GBDs)
 * - CME/NYMEX: Last 3 Good Business Days (GBDs)
 *
 * Spot Month Determination:
 * - If NOT in bid week: Current month is spot month
 * - If IN bid week: Next month is spot month
 */

export interface HolidayCalendar {
  id: number;
  exchange_code: string;
  holiday_date: string; // YYYY-MM-DD
  holiday_name: string;
  is_active: number;
}

export interface BidWeekSchedule {
  id?: number;
  exchange_code: string;
  schedule_month: string; // YYYY-MM-01
  bid_week_start_date: string; // YYYY-MM-DD
  bid_week_end_date: string; // YYYY-MM-DD
  good_business_days_count: number;
  spot_month_start: string; // YYYY-MM-01
  created_at?: string;
  updated_at?: string;
}

export interface BidWeekResult {
  exchange_code: string;
  current_date: string;
  is_in_bid_week: boolean;
  bid_week_start: string;
  bid_week_end: string;
  spot_month: string; // YYYY-MM-01
  current_month: string; // YYYY-MM-01
  good_business_days_count: number;
  days_until_bid_week?: number;
  days_into_bid_week?: number;
}

export class BidWeekService {
  constructor(private db: D1Database) {}

  /**
   * Check if a given date is a Good Business Day (GBD) for an exchange
   * A GBD is a weekday that is not a holiday
   */
  async isGoodBusinessDay(
    exchangeCode: string,
    date: Date
  ): Promise<boolean> {
    // Check if weekend
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false; // Sunday or Saturday
    }

    // Check if holiday
    const dateStr = this.formatDate(date);
    const holiday = await this.db
      .prepare(
        `SELECT id FROM exchange_holidays
         WHERE exchange_code = ? AND holiday_date = ? AND is_active = 1`
      )
      .bind(exchangeCode, dateStr)
      .first();

    return !holiday; // GBD if not a holiday
  }

  /**
   * Get the number of GBDs required for bid week for a given exchange
   */
  getBidWeekDaysCount(exchangeCode: string): number {
    const upperExchange = exchangeCode.toUpperCase();

    switch (upperExchange) {
      case 'ICE':
      case 'IFUS':
        return 5; // ICE requires last 5 GBDs

      case 'CME':
      case 'NYMEX':
      case 'COMEX':
        return 3; // CME/NYMEX requires last 3 GBDs

      default:
        // Default to 5 for unknown exchanges
        console.warn(`Unknown exchange: ${exchangeCode}, defaulting to 5 GBDs`);
        return 5;
    }
  }

  /**
   * Calculate the last N Good Business Days of a month
   * Works backwards from the last day of the month
   */
  async calculateBidWeekForMonth(
    exchangeCode: string,
    year: number,
    month: number // 1-12
  ): Promise<BidWeekSchedule> {
    const requiredGBDs = this.getBidWeekDaysCount(exchangeCode);
    const lastDayOfMonth = new Date(year, month, 0); // Day 0 of next month = last day of current month

    const goodBusinessDays: Date[] = [];
    let currentDate = new Date(lastDayOfMonth);

    // Work backwards from last day of month to find GBDs
    while (goodBusinessDays.length < requiredGBDs && currentDate.getMonth() === month - 1) {
      if (await this.isGoodBusinessDay(exchangeCode, currentDate)) {
        goodBusinessDays.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() - 1);
    }

    if (goodBusinessDays.length < requiredGBDs) {
      throw new Error(
        `Could not find ${requiredGBDs} GBDs for ${exchangeCode} in ${year}-${month.toString().padStart(2, '0')}`
      );
    }

    // Sort in ascending order (earliest to latest)
    goodBusinessDays.sort((a, b) => a.getTime() - b.getTime());

    const bidWeekStart = goodBusinessDays[0];
    const bidWeekEnd = goodBusinessDays[goodBusinessDays.length - 1];

    // Determine spot month start date
    // If we're in bid week, spot month is NEXT month
    // Otherwise, spot month is CURRENT month
    const spotMonthStart = new Date(year, month, 1); // Next month (month is 0-indexed in Date)

    const schedule: BidWeekSchedule = {
      exchange_code: exchangeCode,
      schedule_month: `${year}-${month.toString().padStart(2, '0')}-01`,
      bid_week_start_date: this.formatDate(bidWeekStart),
      bid_week_end_date: this.formatDate(bidWeekEnd),
      good_business_days_count: requiredGBDs,
      spot_month_start: `${spotMonthStart.getFullYear()}-${(spotMonthStart.getMonth() + 1).toString().padStart(2, '0')}-01`,
    };

    return schedule;
  }

  /**
   * Calculate and store bid week schedules for multiple months ahead
   */
  async generateBidWeekSchedules(
    exchangeCode: string,
    startYear: number,
    startMonth: number,
    monthsAhead: number = 12
  ): Promise<BidWeekSchedule[]> {
    const schedules: BidWeekSchedule[] = [];

    for (let i = 0; i < monthsAhead; i++) {
      const date = new Date(startYear, startMonth - 1 + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      try {
        const schedule = await this.calculateBidWeekForMonth(
          exchangeCode,
          year,
          month
        );

        // Store in database
        await this.db
          .prepare(
            `INSERT OR REPLACE INTO bid_week_schedules
             (exchange_code, schedule_month, bid_week_start_date, bid_week_end_date,
              good_business_days_count, spot_month_start, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(
            schedule.exchange_code,
            schedule.schedule_month,
            schedule.bid_week_start_date,
            schedule.bid_week_end_date,
            schedule.good_business_days_count,
            schedule.spot_month_start
          )
          .run();

        schedules.push(schedule);
      } catch (error) {
        console.error(`Error generating bid week for ${year}-${month}:`, error);
      }
    }

    return schedules;
  }

  /**
   * Get current bid week status for a specific date and exchange
   */
  async getBidWeekStatus(
    exchangeCode: string,
    checkDate: Date = new Date()
  ): Promise<BidWeekResult> {
    const year = checkDate.getFullYear();
    const month = checkDate.getMonth() + 1;
    const scheduleMonth = `${year}-${month.toString().padStart(2, '0')}-01`;

    // Try to get from database first
    let schedule = await this.db
      .prepare(
        `SELECT * FROM bid_week_schedules
         WHERE exchange_code = ? AND schedule_month = ?`
      )
      .bind(exchangeCode, scheduleMonth)
      .first<BidWeekSchedule>();

    // If not in database, calculate it
    if (!schedule) {
      schedule = await this.calculateBidWeekForMonth(exchangeCode, year, month);

      // Store for future use
      await this.db
        .prepare(
          `INSERT OR REPLACE INTO bid_week_schedules
           (exchange_code, schedule_month, bid_week_start_date, bid_week_end_date,
            good_business_days_count, spot_month_start, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(
          schedule.exchange_code,
          schedule.schedule_month,
          schedule.bid_week_start_date,
          schedule.bid_week_end_date,
          schedule.good_business_days_count,
          schedule.spot_month_start
        )
        .run();
    }

    const checkDateStr = this.formatDate(checkDate);
    const isInBidWeek =
      checkDateStr >= schedule.bid_week_start_date &&
      checkDateStr <= schedule.bid_week_end_date;

    // Calculate days until/into bid week
    const bidWeekStartDate = new Date(schedule.bid_week_start_date);
    const daysDiff = Math.floor(
      (bidWeekStartDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const result: BidWeekResult = {
      exchange_code: exchangeCode,
      current_date: checkDateStr,
      is_in_bid_week: isInBidWeek,
      bid_week_start: schedule.bid_week_start_date,
      bid_week_end: schedule.bid_week_end_date,
      spot_month: isInBidWeek ? schedule.spot_month_start : scheduleMonth,
      current_month: scheduleMonth,
      good_business_days_count: schedule.good_business_days_count,
    };

    if (isInBidWeek) {
      const bidWeekEndDate = new Date(schedule.bid_week_end_date);
      result.days_into_bid_week = Math.floor(
        (checkDate.getTime() - bidWeekStartDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
    } else if (daysDiff > 0) {
      result.days_until_bid_week = daysDiff;
    }

    return result;
  }

  /**
   * Determine spot month for position limit calculations
   * Per CFTC spec: If not in bid week, current month is spot month
   *                If in bid week, next month is spot month
   */
  async getSpotMonth(
    exchangeCode: string,
    checkDate: Date = new Date()
  ): Promise<string> {
    const bidWeekStatus = await this.getBidWeekStatus(exchangeCode, checkDate);
    return bidWeekStatus.spot_month;
  }

  /**
   * Get all bid week schedules for an exchange
   */
  async getBidWeekSchedules(
    exchangeCode: string,
    startDate?: string,
    endDate?: string
  ): Promise<BidWeekSchedule[]> {
    let query = `SELECT * FROM bid_week_schedules WHERE exchange_code = ?`;
    const params: any[] = [exchangeCode];

    if (startDate) {
      query += ` AND schedule_month >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND schedule_month <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY schedule_month`;

    const result = await this.db.prepare(query).bind(...params).all();
    return result.results as unknown as BidWeekSchedule[];
  }

  /**
   * Add or update a holiday for an exchange
   */
  async addHoliday(holiday: Omit<HolidayCalendar, 'id'>): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO exchange_holidays
         (exchange_code, holiday_date, holiday_name, is_active, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        holiday.exchange_code,
        holiday.holiday_date,
        holiday.holiday_name,
        holiday.is_active ?? 1
      )
      .run();
  }

  /**
   * Get all holidays for an exchange
   */
  async getHolidays(
    exchangeCode: string,
    year?: number,
    activeOnly: boolean = true
  ): Promise<HolidayCalendar[]> {
    let query = `SELECT * FROM exchange_holidays WHERE exchange_code = ?`;
    const params: any[] = [exchangeCode];

    if (activeOnly) {
      query += ` AND is_active = 1`;
    }

    if (year) {
      query += ` AND holiday_date LIKE ?`;
      params.push(`${year}%`);
    }

    query += ` ORDER BY holiday_date`;

    const result = await this.db.prepare(query).bind(...params).all();
    return result.results as unknown as HolidayCalendar[];
  }

  /**
   * Delete a holiday
   */
  async deleteHoliday(exchangeCode: string, holidayDate: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE exchange_holidays SET is_active = 0, updated_at = datetime('now')
         WHERE exchange_code = ? AND holiday_date = ?`
      )
      .bind(exchangeCode, holidayDate)
      .run();
  }

  /**
   * Regenerate bid week schedules after holiday changes
   */
  async regenerateBidWeekSchedules(
    exchangeCode: string,
    year: number,
    monthsToGenerate: number = 12
  ): Promise<BidWeekSchedule[]> {
    return await this.generateBidWeekSchedules(
      exchangeCode,
      year,
      1,
      monthsToGenerate
    );
  }

  /**
   * Get bid week summary for all configured exchanges
   */
  async getAllExchangesBidWeekStatus(
    checkDate: Date = new Date()
  ): Promise<BidWeekResult[]> {
    const exchanges = ['ICE', 'CME', 'NYMEX'];
    const results: BidWeekResult[] = [];

    for (const exchange of exchanges) {
      try {
        const status = await this.getBidWeekStatus(exchange, checkDate);
        results.push(status);
      } catch (error) {
        console.error(`Error getting bid week status for ${exchange}:`, error);
      }
    }

    return results;
  }

  /**
   * Utility: Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Utility: Parse date string (YYYY-MM-DD) to Date
   */
  private parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Bulk import holidays from array
   */
  async bulkImportHolidays(holidays: Omit<HolidayCalendar, 'id'>[]): Promise<number> {
    let importCount = 0;

    for (const holiday of holidays) {
      try {
        await this.addHoliday(holiday);
        importCount++;
      } catch (error) {
        console.error(`Error importing holiday ${holiday.holiday_date}:`, error);
      }
    }

    return importCount;
  }

  /**
   * Check if schedules need regeneration (e.g., after holiday updates)
   */
  async needsRegeneration(exchangeCode: string): Promise<boolean> {
    const today = new Date();
    const threeMonthsAhead = new Date(today);
    threeMonthsAhead.setMonth(threeMonthsAhead.getMonth() + 3);

    const schedules = await this.getBidWeekSchedules(
      exchangeCode,
      this.formatDate(today),
      this.formatDate(threeMonthsAhead)
    );

    // Check if we have schedules for at least 3 months ahead
    return schedules.length < 3;
  }

  /**
   * Auto-generate schedules if needed
   */
  async autoGenerateSchedules(exchangeCode: string): Promise<void> {
    if (await this.needsRegeneration(exchangeCode)) {
      const today = new Date();
      await this.generateBidWeekSchedules(
        exchangeCode,
        today.getFullYear(),
        today.getMonth() + 1,
        12
      );
    }
  }
}

/**
 * Factory function to create BidWeekService instance
 */
export function createBidWeekService(db: D1Database): BidWeekService {
  return new BidWeekService(db);
}

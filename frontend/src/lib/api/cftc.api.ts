/**
 * CFTC-Specific API
 * Handles monthly schedules, bid week, and pre-trade validation
 */

import { apiFetch } from './client';

// Monthly Schedules API
export const monthlySchedulesApi = {
  getCalendar: () => {
    return apiFetch<{ success: boolean; data: any[]; count: number }>('/api/monthly-schedules');
  },

  getByDate: (date: string) => {
    return apiFetch<{ success: boolean; data: any }>(`/api/monthly-schedules/${date}`);
  },

  getUpcoming: (lookup?: string) => {
    const params = lookup ? `?lookup=${lookup}` : '';
    return apiFetch<{ success: boolean; data: any }>(`/api/monthly-schedules/upcoming${params}`);
  },
};

// Bid Week API (CFTC Phase 2)
export const bidWeekApi = {
  // Status endpoints
  getStatusAll: () => {
    return apiFetch<{ check_date: string; exchanges: any[]; total: number }>('/api/bid-week/status/all');
  },

  getStatus: (exchangeCode: string, checkDate?: string) => {
    const params = checkDate ? `?check_date=${checkDate}` : '';
    return apiFetch<any>(`/api/bid-week/status?exchange_code=${exchangeCode}${params}`);
  },

  getSpotMonth: (exchangeCode: string, checkDate?: string) => {
    const params = checkDate ? `&check_date=${checkDate}` : '';
    return apiFetch<any>(`/api/bid-week/spot-month?exchange_code=${exchangeCode}${params}`);
  },

  // Holiday endpoints
  getAllHolidays: (year?: number, activeOnly: boolean = true) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (!activeOnly) params.append('active_only', 'false');
    return apiFetch<{ holidays: any[]; total: number }>(`/api/bid-week/holidays?${params}`);
  },

  getHolidays: (exchangeCode: string, year?: number, activeOnly: boolean = true) => {
    const params = new URLSearchParams();
    params.append('exchange_code', exchangeCode);
    if (year) params.append('year', year.toString());
    if (!activeOnly) params.append('active_only', 'false');
    return apiFetch<{ exchange_code: string; holidays: any[]; total: number }>(
      `/api/bid-week/holidays?${params}`
    );
  },

  addHoliday: (data: { exchange_code: string; holiday_date: string; holiday_name: string; is_active?: number }) => {
    return apiFetch<{ message: string; holiday: any }>('/api/bid-week/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateHoliday: (exchangeCode: string, date: string, data: { holiday_name?: string; is_active?: number }) => {
    return apiFetch<{ message: string }>(`/api/bid-week/holidays/${exchangeCode}/${date}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteHoliday: (exchangeCode: string, date: string) => {
    return apiFetch<{ message: string }>(`/api/bid-week/holidays/${exchangeCode}/${date}`, {
      method: 'DELETE',
    });
  },

  bulkImportHolidays: (holidays: Array<{ exchange_code: string; holiday_date: string; holiday_name: string; is_active?: number }>) => {
    return apiFetch<{ message: string; imported_count: number; total_submitted: number }>('/api/bid-week/holidays/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ holidays }),
    });
  },

  // Schedule endpoints
  getSchedules: (exchangeCode: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    params.append('exchange_code', exchangeCode);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiFetch<{ exchange_code: string; schedules: any[]; total: number }>(`/api/bid-week/schedules?${params}`);
  },

  generateSchedules: (data: { exchange_code: string; year: number; month: number; months_ahead?: number }) => {
    return apiFetch<{ message: string; exchange_code: string; schedules_generated: number; schedules: any[] }>('/api/bid-week/schedules/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  regenerateSchedules: (data: { exchange_code: string; year: number; months_to_generate?: number }) => {
    return apiFetch<{ message: string; exchange_code: string; year: number; schedules_generated: number }>('/api/bid-week/schedules/regenerate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  autoGenerate: () => {
    return apiFetch<{ message: string; results: any[] }>('/api/bid-week/auto-generate', {
      method: 'POST',
    });
  },

  // Utility endpoints
  checkGoodBusinessDay: (exchangeCode: string, checkDate: string) => {
    const params = new URLSearchParams();
    params.append('exchange_code', exchangeCode);
    params.append('check_date', checkDate);
    return apiFetch<{ exchange_code: string; check_date: string; is_good_business_day: boolean; day_of_week: string }>(
      `/api/bid-week/gbd-check?${params}`
    );
  },
};

// Pre-Trade Validation API (CFTC Phase 8)
export const preTradeValidationApi = {
  validateTrade: (trade: {
    market_code: string;
    contract_month: string;
    quantity: number;
    deal_type?: string;
    counterparty?: string;
    trade_date?: string;
  }) => {
    return apiFetch<{
      success: boolean;
      validation: {
        is_valid: boolean;
        position_after_trade: number;
        limit: number;
        utilization_percent: number;
        utilization_status: 'COMPLIANT' | 'WARNING' | 'BREACH';
        warnings: string[];
        errors: string[];
        metadata: any;
      };
      timestamp: string;
    }>('/api/pre-trade-validation/validate', {
      method: 'POST',
      body: JSON.stringify(trade),
    });
  },

  validateBatch: (trades: Array<{
    market_code: string;
    contract_month: string;
    quantity: number;
    deal_type?: string;
    counterparty?: string;
    trade_date?: string;
  }>, simulateCumulative = false) => {
    return apiFetch<{
      success: boolean;
      validation: {
        overall_valid: boolean;
        results: any[];
        cumulative_impact?: {
          markets_affected: string[];
          total_trades: number;
          breaches_detected: number;
        };
      };
      timestamp: string;
    }>('/api/pre-trade-validation/batch', {
      method: 'POST',
      body: JSON.stringify({ trades, simulate_cumulative: simulateCumulative }),
    });
  },

  getValidationStats: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiFetch<{
      success: boolean;
      stats: {
        total_validations: number;
        approved: number;
        rejected: number;
        approval_rate: number;
        recent_rejections: any[];
      };
      date_range: { start: string; end: string };
    }>(`/api/pre-trade-validation/stats?${params}`);
  },
};

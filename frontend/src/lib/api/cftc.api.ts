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
  getStatusAll: () => {
    return apiFetch<{ check_date: string; exchanges: any[]; total: number }>('/api/bid-week/status/all');
  },

  getStatus: (exchangeCode: string, checkDate?: string) => {
    const params = checkDate ? `?check_date=${checkDate}` : '';
    return apiFetch<any>(`/api/bid-week/status?exchange_code=${exchangeCode}${params}`);
  },

  getHolidays: (exchangeCode: string, year?: number) => {
    const params = year ? `&year=${year}` : '';
    return apiFetch<{ exchange_code: string; holidays: any[]; total: number }>(
      `/api/bid-week/holidays?exchange_code=${exchangeCode}${params}`
    );
  },

  getSpotMonth: (exchangeCode: string, checkDate?: string) => {
    const params = checkDate ? `&check_date=${checkDate}` : '';
    return apiFetch<any>(`/api/bid-week/spot-month?exchange_code=${exchangeCode}${params}`);
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

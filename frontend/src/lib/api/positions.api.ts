/**
 * Position Limits & Trading API
 * Handles position limits, transactions, and market limits
 */

import { apiFetch } from './client';
import { ApiResponse } from './types';

// Position Limits API
export const positionLimitsApi = {
  getAll: (limitType: 'spot' | 'spot-plus' | 'one-month' | 'all-month' = 'spot', filters?: {
    prioritization?: string;
    search?: string;
    page?: number;
    page_size?: number;
    exchange_id?: number
  }) => {
    const params = new URLSearchParams({ limit_type: limitType });
    if (filters?.prioritization) params.append('prioritization', filters.prioritization);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.exchange_id) params.append('exchange_id', filters.exchange_id.toString());
    return apiFetch<ApiResponse<any[]>>(`/api/position-limits?${params}`);
  },

  getByMarket: (mktIndex: string) => {
    return apiFetch<any>(`/api/position-limits/${mktIndex}`);
  },

  getStatusCounts: (limitType: 'spot' | 'spot-plus' | 'one-month' | 'all-month' = 'spot') => {
    return apiFetch<{ monitor: number; validate: number; remediate: number; breached: number; total: number }>(
      `/api/position-limits/status/counts?limit_type=${limitType}`
    );
  },

  getCharts: (limitType: 'spot-month' | 'one-month' | 'all-month') => {
    return apiFetch<any[]>(`/api/position-limits/charts/${limitType}`);
  },

  getTimeSeries: (mktIndex: string, days: number = 30) => {
    return apiFetch<any[]>(`/api/position-limits/time-series/${mktIndex}?days=${days}`);
  },
};

// Transactions API
export const transactionsApi = {
  getAll: (filters?: { start_date?: string; end_date?: string; exchange_id?: number }) => {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.exchange_id) params.append('exchange_id', filters.exchange_id.toString());
    return apiFetch<ApiResponse<any[]>>(`/api/transactions?${params}`);
  },

  create: (transaction: {
    market_location: string;
    contract_month: string;
    base_delta_notnl_nd: number;
    trade_date: string;
    exchange_id: number;
    index_uom?: string;
    status?: number;
    frequency?: number;
    company_id?: number;
    trader_id?: number;
  }) => {
    return apiFetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  },
};

// Market Limits API
export const marketLimitsApi = {
  getAll: () => {
    return apiFetch<ApiResponse<any[]>>('/api/market-limits');
  },

  getByMarket: (mktIndex: string) => {
    return apiFetch<any>(`/api/market-limits/${mktIndex}`);
  },
};

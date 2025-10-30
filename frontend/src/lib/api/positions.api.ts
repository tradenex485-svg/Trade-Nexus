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

  getById: (id: number) => {
    return apiFetch<any>(`/api/transactions/${id}`);
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

  delete: (id: number) => {
    return apiFetch(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  },
};

// Market Limits API
export const marketLimitsApi = {
  getAll: (filters?: { is_active?: boolean; exchange_code?: string; commodity_code?: string }) => {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.exchange_code) params.append('exchange_code', filters.exchange_code);
    if (filters?.commodity_code) params.append('commodity_code', filters.commodity_code);
    const queryString = params.toString();
    return apiFetch<ApiResponse<any[]>>(`/api/market-limits${queryString ? '?' + queryString : ''}`);
  },

  getById: (id: number) => {
    return apiFetch<any>(`/api/market-limits/${id}`);
  },

  getByCommodity: (commodityCode: string) => {
    return apiFetch<any[]>(`/api/market-limits/commodity/${commodityCode}`);
  },

  create: (marketLimit: {
    exchange_code: string;
    commodity_code: string;
    limit_type: string;
    limit_value: number;
    limit_uom?: string;
    effective_date?: string;
    expiry_date?: string;
    is_active?: boolean;
    notes?: string;
  }) => {
    return apiFetch('/api/market-limits', {
      method: 'POST',
      body: JSON.stringify(marketLimit),
    });
  },

  update: (id: number, marketLimit: {
    exchange_code?: string;
    commodity_code?: string;
    limit_type?: string;
    limit_value?: number;
    limit_uom?: string;
    effective_date?: string;
    expiry_date?: string;
    is_active?: boolean;
    notes?: string;
  }) => {
    return apiFetch(`/api/market-limits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(marketLimit),
    });
  },

  delete: (id: number) => {
    return apiFetch(`/api/market-limits/${id}`, {
      method: 'DELETE',
    });
  },

  // Legacy method for backward compatibility
  getByMarket: (mktIndex: string) => {
    return apiFetch<any>(`/api/market-limits/${mktIndex}`);
  },
};

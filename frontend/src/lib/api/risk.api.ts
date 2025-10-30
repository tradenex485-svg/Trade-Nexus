/**
 * Risk Management API
 * Handles pre-trade validation, risk thresholds, scenarios, and metrics
 */

import { apiFetch } from './client';

// Pre-Trade Validation API
export const preTradeApi = {
  validate: (trade: {
    marketLocation: string;
    commodityCode: string;
    contractMonth: string;
    tradeSide: 'BUY' | 'SELL';
    quantity: number;
    limitType: number;
  }) => {
    return apiFetch<{ success: boolean; validation: any }>('/api/pre-trade/validate', {
      method: 'POST',
      body: JSON.stringify(trade),
    });
  },

  batchValidate: (trades: any[]) => {
    return apiFetch<{ success: boolean; validations: any[]; summary: any }>('/api/pre-trade/batch-validate', {
      method: 'POST',
      body: JSON.stringify({ trades }),
    });
  },

  getHistory: (params?: { status?: string; start_date?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/pre-trade/history?${queryParams}`);
  },

  getHistoryById: (id: number) => {
    return apiFetch<{ success: boolean; check: any }>(`/api/pre-trade/history/${id}`);
  },

  // Legacy method names for backward compatibility
  getChecks: (params?: { status?: string; start_date?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/pre-trade/history?${queryParams}`);
  },

  getCheck: (id: number) => {
    return apiFetch<{ success: boolean; check: any }>(`/api/pre-trade/history/${id}`);
  },

  getStats: (days: number = 7) => {
    return apiFetch<{ success: boolean; stats: any; period: any }>(`/api/pre-trade/stats?days=${days}`);
  },
};

// Risk Thresholds API
export const riskThresholdsApi = {
  getAll: () => {
    return apiFetch<{ success: boolean; data: any[]; count: number }>('/api/risk-thresholds');
  },

  getById: (id: number) => {
    return apiFetch<{ success: boolean; threshold: any }>(`/api/risk-thresholds/${id}`);
  },

  create: (threshold: {
    threshold_name: string;
    threshold_type: string;
    min_utilization_pct: number;
    max_utilization_pct: number;
    description?: string;
    is_active?: boolean;
  }) => {
    return apiFetch<{ success: boolean; message: string; id: number }>('/api/risk-thresholds', {
      method: 'POST',
      body: JSON.stringify(threshold),
    });
  },

  update: (id: number, threshold: any) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/risk-thresholds/${id}`, {
      method: 'PUT',
      body: JSON.stringify(threshold),
    });
  },

  delete: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/risk-thresholds/${id}`, {
      method: 'DELETE',
    });
  },
};

// Risk Scenarios API
export const riskScenariosApi = {
  getAll: (includeInactive: boolean = false) => {
    const params = includeInactive ? '?include_inactive=true' : '';
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/risk-scenarios${params}`);
  },

  getById: (id: number) => {
    return apiFetch<{ success: boolean; scenario: any }>(`/api/risk-scenarios/${id}`);
  },

  create: (scenario: {
    scenario_name: string;
    scenario_type: string;
    description?: string;
    parameters: any;
    severity?: string;
    is_active?: boolean;
  }) => {
    return apiFetch<{ success: boolean; message: string; id: number }>('/api/risk-scenarios', {
      method: 'POST',
      body: JSON.stringify(scenario),
    });
  },

  update: (id: number, scenario: any) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/risk-scenarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(scenario),
    });
  },

  delete: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/risk-scenarios/${id}`, {
      method: 'DELETE',
    });
  },

  run: (id: number) => {
    return apiFetch<{ success: boolean; result: any }>(`/api/risk-scenarios/${id}/run`, {
      method: 'POST',
    });
  },

  getResults: (id: number, limit: number = 10) => {
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/risk-scenarios/${id}/results?limit=${limit}`);
  },

  runAll: () => {
    return apiFetch<{ success: boolean; results: any[]; total_scenarios: number; successful: number; failed: number }>('/api/risk-scenarios/run-all', {
      method: 'POST',
    });
  },
};

// Risk Metrics API
export const riskMetricsApi = {
  getVaR: (params?: { method?: string; confidence?: number; lookback?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.method) queryParams.append('method', params.method);
    if (params?.confidence) queryParams.append('confidence', params.confidence.toString());
    if (params?.lookback) queryParams.append('lookback', params.lookback.toString());
    return apiFetch<{ success: boolean; var: any; parameters: any }>(`/api/risk-metrics/var?${queryParams}`);
  },

  getConcentration: () => {
    return apiFetch<{ success: boolean; concentration: any }>('/api/risk-metrics/concentration');
  },

  getCorrelations: (lookbackDays: number = 30) => {
    return apiFetch<{ success: boolean; correlations: any[]; lookback_days: number }>(`/api/risk-metrics/correlations?lookback=${lookbackDays}`);
  },

  getDashboard: () => {
    return apiFetch<{ success: boolean; dashboard: any }>('/api/risk-metrics/dashboard');
  },

  getVaRHistory: (days: number = 30) => {
    return apiFetch<{ success: boolean; history: any[]; count: number }>(`/api/risk-metrics/var-history?days=${days}`);
  },

  getTrends: () => {
    return apiFetch<{ success: boolean; trends: any }>('/api/risk-metrics/trends');
  },

  getRiskDecomposition: () => {
    return apiFetch<{ success: boolean; decomposition: any[]; total_exposure: number }>('/api/risk-metrics/risk-decomposition');
  },

  calculateAll: () => {
    return apiFetch<{ success: boolean; message: string; summary: any }>('/api/risk-metrics/calculate-all', {
      method: 'POST',
    });
  },
};

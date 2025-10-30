/**
 * Dashboard & Monitoring API
 * Handles dashboard data, performance metrics, and compliance monitoring
 */

import { apiFetch } from './client';

// Dashboard API
export const dashboardApi = {
  getOverview: (exchangeId?: number) => {
    const params = exchangeId ? `?exchange_id=${exchangeId}` : '';
    return apiFetch<{ success: boolean; overview: any }>(`/api/dashboard/overview${params}`);
  },

  getByCommodity: (limitType: number = 1, exchangeId?: number) => {
    const params = new URLSearchParams({ limit_type: limitType.toString() });
    if (exchangeId) params.append('exchange_id', exchangeId.toString());
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/dashboard/by-commodity?${params}`);
  },

  getTrending: (days: number = 7, commodityCode?: string, exchangeId?: number) => {
    const params = new URLSearchParams({ days: days.toString() });
    if (commodityCode) params.append('commodity_code', commodityCode);
    if (exchangeId) params.append('exchange_id', exchangeId.toString());
    return apiFetch<{ success: boolean; data: any[]; daily_summary: any[]; period: any }>(`/api/dashboard/trending?${params}`);
  },

  getHeatmap: (limitType: number = 1) => {
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/dashboard/heatmap?limit_type=${limitType}`);
  },

  getConcentration: () => {
    return apiFetch<{ success: boolean; concentration: any }>('/api/dashboard/concentration');
  },

  getCommodityDetail: (code: string) => {
    return apiFetch<{ success: boolean; commodity_code: string; positions: any[]; history: any[]; alerts: any[]; market_limit: any }>(`/api/dashboard/commodity/${code}`);
  },

  getIcePositions: (marketLocation?: string) => {
    const params = marketLocation ? `?market_location=${marketLocation}` : '';
    return apiFetch<{ success: boolean; positions: any[]; tableData: any[]; marketLocations: any[] }>(`/api/dashboard/ice-positions${params}`);
  },
};

// Performance Monitoring API
export const performanceApi = {
  getStats: (hours: number = 24) => {
    return apiFetch<any>(`/api/performance/stats?hours=${hours}`);
  },

  getRateLimitStats: (hours: number = 24) => {
    return apiFetch<any>(`/api/performance/rate-limits?hours=${hours}`);
  },
};

// Regulatory Compliance Monitoring API
export const monitoringApi = {
  getHistory: (limit: number = 24) => {
    return apiFetch<{ success: boolean; count: number; data: any[] }>(`/api/monitoring/history?limit=${limit}`);
  },

  getBreaches: (params?: { severity?: string; commodityCode?: string; exchangeId?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.severity) queryParams.append('severity', params.severity);
    if (params?.commodityCode) queryParams.append('commodityCode', params.commodityCode);
    if (params?.exchangeId) queryParams.append('exchangeId', params.exchangeId.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    return apiFetch<{ success: boolean; total: number; severity_counts: any; data: any[] }>(`/api/monitoring/breaches?${queryParams}`);
  },

  getBreachById: (id: number) => {
    return apiFetch<{ success: boolean; data: any }>(`/api/monitoring/breaches/${id}`);
  },

  updateBreach: (id: number, data: { status: 'acknowledged' | 'resolved'; resolution_notes?: string }) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/monitoring/breaches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  runMonitoring: () => {
    return apiFetch<{ success: boolean; message: string; data: any }>('/api/monitoring/run', {
      method: 'POST',
    });
  },

  getComplianceAudit: (params?: { startDate?: string; endDate?: string; exchangeId?: number; commodityCode?: string; days?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.exchangeId) queryParams.append('exchangeId', params.exchangeId.toString());
    if (params?.commodityCode) queryParams.append('commodityCode', params.commodityCode);
    if (params?.days) queryParams.append('days', params.days.toString());
    return apiFetch<{ success: boolean; data: any }>(`/api/monitoring/compliance/audit?${queryParams}`);
  },

  getDataQuality: () => {
    return apiFetch<{ success: boolean; healthy: boolean; issues_found: number; data: any[] }>('/api/monitoring/data-quality');
  },

  getStats: () => {
    return apiFetch<{ success: boolean; data: any }>('/api/monitoring/stats');
  },
};

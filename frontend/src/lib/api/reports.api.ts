/**
 * Reports API
 * Handles various report types and subset reports
 */

import { apiFetch, API_BASE_URL } from './client';

// Reports API
export const reportsApi = {
  getSummary: () => {
    return apiFetch<{ success: boolean; summary: any }>('/api/reports/summary');
  },

  getPosition: (limitType: number = 1) => {
    return apiFetch<{ success: boolean; report: any }>(`/api/reports/position?limit_type=${limitType}`);
  },

  getCompliance: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiFetch<{ success: boolean; report: any }>(`/api/reports/compliance?${params}`);
  },

  getBreaches: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiFetch<{ success: boolean; report: any }>(`/api/reports/breaches?${params}`);
  },

  getHistorical: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiFetch<{ success: boolean; report: any }>(`/api/reports/historical?${params}`);
  },

  getPreTrade: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiFetch<{ success: boolean; report: any }>(`/api/reports/pre-trade?${params}`);
  },

  getApprovals: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiFetch<{ success: boolean; report: any }>(`/api/reports/approvals?${params}`);
  },

  getAudit: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiFetch<{ success: boolean; report: any }>(`/api/reports/audit?${params}`);
  },

  exportReport: async (
    reportType: string,
    format: 'csv' | 'json',
    params?: { start_date?: string; end_date?: string; limit_type?: number }
  ) => {
    const response = await fetch(`${API_BASE_URL}/api/reports/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        report_type: reportType,
        format,
        ...params,
      }),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  },
};

// Subset Reports API (CFTC Phase 3)
export const subsetReportsApi = {
  getTopCounterparties: (startDate: string, endDate: string) => {
    return apiFetch<{ report_type: string; data: any[]; total_counterparties: number }>(
      `/api/subset-reports/top-counterparties?start_date=${startDate}&end_date=${endDate}`
    );
  },

  getNextDayFixed: (targetDate: string) => {
    return apiFetch<{ report_type: string; data: any[]; total_transactions: number }>(
      `/api/subset-reports/next-day-fixed?target_date=${targetDate}`
    );
  },

  getNextDayIndex: (targetDate: string) => {
    return apiFetch<{ report_type: string; data: any[]; total_transactions: number }>(
      `/api/subset-reports/next-day-index?target_date=${targetDate}`
    );
  },

  getNextDayExposure: (targetDate: string) => {
    return apiFetch<{ report_type: string; data: any[]; total_locations: number }>(
      `/api/subset-reports/next-day-exposure?target_date=${targetDate}`
    );
  },

  generateReport: (reportType: string, reportDate: string, params?: any) => {
    return apiFetch<{ message: string; report: any }>(
      '/api/subset-reports/generate',
      {
        method: 'POST',
        body: JSON.stringify({ report_type: reportType, report_date: reportDate, params }),
      }
    );
  },

  getReports: (filters?: { report_type?: string; start_date?: string; end_date?: string }) => {
    const params = new URLSearchParams(filters as any).toString();
    return apiFetch<{ reports: any[]; total: number }>(`/api/subset-reports?${params}`);
  },

  getReport: (id: number) => {
    return apiFetch<any>(`/api/subset-reports/${id}`);
  },
};

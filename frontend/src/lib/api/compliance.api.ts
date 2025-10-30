/**
 * Compliance & Data Quality API
 * Handles exemptions, regulatory filings, and data quality checks
 */

import { apiFetch } from './client';
import { useAuthStore } from '@/store/auth-store';
import { API_BASE_URL } from './client';

// Exemptions API
export const exemptionsApi = {
  getAll: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return apiFetch<{ success: boolean; data: any[] }>(`/api/exemptions${params}`);
  },

  create: (exemption: any) => {
    return apiFetch<{ success: boolean; message: string; data?: any }>('/api/exemptions', {
      method: 'POST',
      body: JSON.stringify(exemption),
    });
  },

  getStats: () => {
    return apiFetch<{ success: boolean; data: any }>('/api/exemptions/stats');
  },

  getById: (id: number) => {
    return apiFetch<{ success: boolean; data: any }>(`/api/exemptions/${id}`);
  },

  approve: (id: number, approvalNotes?: string) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/exemptions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approval_notes: approvalNotes || '' }),
    });
  },

  deny: (id: number, denialReason: string) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/exemptions/${id}/deny`, {
      method: 'POST',
      body: JSON.stringify({ denial_reason: denialReason }),
    });
  },

  delete: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/exemptions/${id}`, {
      method: 'DELETE',
    });
  },
};

// Hedge Exemptions API (Enhanced)
export const hedgeExemptionsApi = exemptionsApi;

// Regulatory Filings API
export const filingsApi = {
  getAll: (params?: { filing_type?: string; regulatory_body?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.filing_type) queryParams.append('filing_type', params.filing_type);
    if (params?.regulatory_body) queryParams.append('regulatory_body', params.regulatory_body);
    if (params?.status) queryParams.append('status', params.status);
    return apiFetch<{ success: boolean; data: any[] }>(`/api/regulatory-filings?${queryParams}`);
  },

  getById: (filingId: number) => {
    return apiFetch<{ success: boolean; data: any }>(`/api/regulatory-filings/${filingId}`);
  },

  getStats: () => {
    return apiFetch<{ success: boolean; data: any }>('/api/regulatory-filings/stats/summary');
  },

  generateCFTCLTRS: (data: { report_date: string }) => {
    return apiFetch<{ success: boolean; message: string; data: any; file_preview?: string }>('/api/regulatory-filings/generate/cftc-ltrs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  generateICEDaily: (data: { report_date: string; exchange_id: number }) => {
    return apiFetch<{ success: boolean; message: string; data: any; file_preview?: string }>('/api/regulatory-filings/generate/ice-daily', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  generateCME: (data: { report_date: string; exchange_id: number }) => {
    return apiFetch<{ success: boolean; message: string; data: any; file_preview?: string }>('/api/regulatory-filings/generate/cme', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  download: async (filingId: number) => {
    const token = useAuthStore.getState().token;
    const response = await fetch(`${API_BASE_URL}/api/regulatory-filings/${filingId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
  },

  submit: (filingId: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/regulatory-filings/${filingId}/submit`, {
      method: 'POST',
    });
  },
};

// Data Quality API
export const dataQualityApi = {
  getDashboard: () => {
    return apiFetch<{ success: boolean; dashboard: any }>('/api/data-quality/dashboard');
  },

  getIssues: (params?: { status?: string; severity?: string; issue_type?: string; table_name?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.severity) queryParams.append('severity', params.severity);
    if (params?.issue_type) queryParams.append('issue_type', params.issue_type);
    if (params?.table_name) queryParams.append('table_name', params.table_name);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    return apiFetch<{ success: boolean; issues: any[]; count: number }>(`/api/data-quality/issues?${queryParams}`);
  },

  getRules: (includeInactive: boolean = false) => {
    const params = includeInactive ? '?include_inactive=true' : '';
    return apiFetch<{ success: boolean; rules: any[]; count: number }>(`/api/data-quality/rules${params}`);
  },

  createRule: (rule: {
    rule_name: string;
    rule_type: string;
    target_table: string;
    target_field?: string;
    rule_config: any;
    severity?: string;
    description?: string;
  }) => {
    return apiFetch<{ success: boolean; message: string; id: number }>('/api/data-quality/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  },

  updateRule: (id: number, rule: any) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/data-quality/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    });
  },

  deleteRule: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/data-quality/rules/${id}`, {
      method: 'DELETE',
    });
  },

  runQualityChecks: () => {
    return apiFetch<{ success: boolean; message: string; result: any }>('/api/data-quality/run', {
      method: 'POST',
    });
  },

  getReconciliation: (limit: number = 20) => {
    return apiFetch<{ success: boolean; reconciliations: any[]; count: number }>(`/api/data-quality/reconciliation?limit=${limit}`);
  },

  runReconciliation: (data: {
    source_table: string;
    target_table: string;
    reconciliation_key: string;
  }) => {
    return apiFetch<{ success: boolean; message: string; result: any }>('/api/data-quality/reconciliation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getLineage: (table: string, id: number) => {
    return apiFetch<{ success: boolean; lineage: any }>(`/api/data-quality/lineage/${table}/${id}`);
  },

  updateIssue: (id: number, data: { status: string; resolution_notes?: string }) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/data-quality/issues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getUploads: (params?: { status?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    return apiFetch<{ success: boolean; uploads: any[]; count: number }>(`/api/data-quality/uploads?${queryParams}`);
  },

  getStats: () => {
    return apiFetch<{ success: boolean; stats: any }>('/api/data-quality/stats');
  },
};

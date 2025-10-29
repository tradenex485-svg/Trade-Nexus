/**
 * Approval Workflows API
 * Handles trade approvals and general approval workflows
 */

import { apiFetch } from './client';

// Trade Approvals API
export const approvalsApi = {
  getAll: (status: string = 'pending', limit: number = 100) => {
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/trade-approvals?status=${status}&limit=${limit}`);
  },

  getPendingCount: () => {
    return apiFetch<{ success: boolean; count: number }>('/api/trade-approvals/pending-count');
  },

  create: (data: {
    pre_trade_check_id: number;
    urgency?: 'low' | 'normal' | 'high' | 'critical';
  }) => {
    return apiFetch<{ success: boolean; message: string; approval_id: number }>('/api/trade-approvals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  approve: (id: number, notes?: string) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/trade-approvals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  reject: (id: number, rejection_reason: string) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/trade-approvals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason }),
    });
  },

  getHistory: (params?: { start_date?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/trade-approvals/history?${queryParams}`);
  },
};

// Approval Workflows API
export const approvalWorkflowsApi = {
  getAll: (status: string = 'pending', requestType?: string) => {
    const params = new URLSearchParams({ status });
    if (requestType) params.append('request_type', requestType);
    return apiFetch<{ success: boolean; data: any[] }>(`/api/approvals?${params}`);
  },

  create: (data: {
    request_type: string;
    title: string;
    description?: string;
    company_id?: number;
    user_id?: number;
    subscription_id?: number;
    limit_calculation_id?: number;
    request_data?: any;
    priority?: string;
  }) => {
    return apiFetch<{ success: boolean; data: { id: number } }>('/api/approvals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  approve: (id: number, approvalNotes?: string) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/approvals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approval_notes: approvalNotes }),
    });
  },

  reject: (id: number, rejectionReason: string) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/approvals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    });
  },

  getHistory: (id: number) => {
    return apiFetch<{ success: boolean; data: any[] }>(`/api/approvals/${id}/history`);
  },
};

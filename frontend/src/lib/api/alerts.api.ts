/**
 * Alerts API
 * Handles alert notifications and acknowledgments
 * Merged alertsApi + alertsApiEnhanced
 */

import { apiFetch } from './client';
import { ApiResponse } from './types';

export const alertsApi = {
  // Basic alerts
  getAll: (params?: { unread?: boolean; severity?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.unread) queryParams.append('unread', 'true');
    if (params?.severity) queryParams.append('severity', params.severity);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    return apiFetch<{ success: boolean; data: any[]; count: number; unread_count: number }>(`/api/alerts?${queryParams}`);
  },

  markAsRead: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/alerts/${id}/read`, { method: 'PATCH' });
  },

  getStats: () => {
    return apiFetch<{ success: boolean; stats: any }>('/api/alerts/stats');
  },

  acknowledge: (id: number, notes?: string) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/alerts/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },
};

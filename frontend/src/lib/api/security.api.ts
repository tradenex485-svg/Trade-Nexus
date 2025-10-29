/**
 * Security & Audit API
 * Handles security events, audit trails, and exception handling
 */

import { apiFetch } from './client';

// Security API
export const securityApi = {
  getEvents: (params?: { severity?: string; is_resolved?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.severity) queryParams.append('severity', params.severity);
    if (params?.is_resolved) queryParams.append('is_resolved', params.is_resolved);
    return apiFetch<{ success: boolean; data: any[]; count: number }>(
      `/api/security/events?${queryParams}`
    );
  },

  getEventsStats: () => {
    return apiFetch<{ success: boolean; data: any }>('/api/security/events/stats');
  },

  getFailedLogins: () => {
    return apiFetch<{ success: boolean; data: any[]; count: number }>('/api/security/failed-logins');
  },

  resolveEvent: (eventId: number, resolutionNotes?: string) => {
    return apiFetch<{ success: boolean; message: string }>(
      `/api/security/events/${eventId}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify({ resolution_notes: resolutionNotes }),
      }
    );
  },
};

// Audit Trail API (CFTC Phase 7)
export const auditTrailApi = {
  getAuditTrail: (filters?: {
    event_type?: string;
    entity_type?: string;
    entity_id?: number;
    user_id?: number;
    action?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.event_type) params.append('event_type', filters.event_type);
    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.entity_id) params.append('entity_id', filters.entity_id.toString());
    if (filters?.user_id) params.append('user_id', filters.user_id.toString());
    if (filters?.action) params.append('action', filters.action);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    return apiFetch<{ success: boolean; entries: any[]; count: number }>(`/api/audit-trail?${params}`);
  },

  getStats: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiFetch<{
      success: boolean;
      stats: {
        total_events: number;
        by_event_type: Record<string, number>;
        by_action: Record<string, number>;
        by_user: Record<number, number>;
        recent_activity_count: number;
      };
    }>(`/api/audit-trail/stats?${params}`);
  },

  getEntityHistory: (entityType: string, entityId: number, limit?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    return apiFetch<{ success: boolean; entity_type: string; entity_id: number; history: any[]; count: number }>(
      `/api/audit-trail/entity/${entityType}/${entityId}?${params}`
    );
  },

  getUserActivity: (userId: number, limit?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    return apiFetch<{ success: boolean; user_id: number; activity: any[]; count: number }>(
      `/api/audit-trail/user/${userId}?${params}`
    );
  },

  searchAuditTrail: (searchTerm: string, limit?: number) => {
    const params = new URLSearchParams({ q: searchTerm });
    if (limit) params.append('limit', limit.toString());
    return apiFetch<{ success: boolean; query: string; results: any[]; count: number }>(
      `/api/audit-trail/search?${params}`
    );
  },

  logAuditEntry: (entry: {
    event_type: string;
    entity_type: string;
    entity_id: number;
    action: string;
    changes?: any;
    metadata?: any;
  }) => {
    return apiFetch<{ success: boolean; audit_id: number; message: string }>(
      '/api/audit-trail',
      {
        method: 'POST',
        body: JSON.stringify(entry),
      }
    );
  },
};

// Exception Handling API (CFTC Phase 6)
export const exceptionsApi = {
  getExceptions: (filters?: { status?: string; severity?: string; limit?: number }) => {
    const params = new URLSearchParams(filters as any).toString();
    return apiFetch<{ exceptions: any[]; total: number }>(`/api/exceptions-handling?${params}`);
  },

  getStats: () => {
    return apiFetch<{ by_status: any; by_severity: any; total: number }>('/api/exceptions-handling/stats');
  },

  getException: (id: number) => {
    return apiFetch<any>(`/api/exceptions-handling/${id}`);
  },

  logException: (exception: {
    exception_type: string;
    exception_severity: string;
    entity_type: string;
    entity_id?: number;
    exception_message: string;
    exception_details?: string;
  }) => {
    return apiFetch<{ message: string; exception_id: number }>(
      '/api/exceptions-handling',
      {
        method: 'POST',
        body: JSON.stringify(exception),
      }
    );
  },

  updateStatus: (id: number, status: string, resolutionNotes?: string) => {
    return apiFetch<{ message: string }>(
      `/api/exceptions-handling/${id}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status, resolution_notes: resolutionNotes }),
      }
    );
  },

  assignException: (id: number, userId: number) => {
    return apiFetch<{ message: string }>(
      `/api/exceptions-handling/${id}/assign`,
      {
        method: 'PUT',
        body: JSON.stringify({ user_id: userId }),
      }
    );
  },
};

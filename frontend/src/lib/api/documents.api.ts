/**
 * Documents, Support & Subscriptions API
 * Handles document management, support tickets, and subscriptions
 */

import { apiFetch, API_BASE_URL } from './client';

// Documents API
export const documentsApi = {
  getAll: (params?: { document_type?: string; status?: string; company_id?: number; exchange_id?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.document_type) queryParams.append('document_type', params.document_type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.company_id) queryParams.append('company_id', params.company_id.toString());
    if (params?.exchange_id) queryParams.append('exchange_id', params.exchange_id.toString());
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/documents?${queryParams}`);
  },

  getById: (id: number) => {
    return apiFetch<{ success: boolean; document: any }>(`/api/documents/${id}`);
  },

  upload: (data: FormData, token: string) => {
    return fetch(`${API_BASE_URL}/api/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    }).then(res => res.json());
  },

  download: (id: number, token: string) => {
    return fetch(`${API_BASE_URL}/api/documents/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => res.blob());
  },

  getVersions: (id: number) => {
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/documents/${id}/versions`);
  },

  approve: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/documents/${id}/approve`, {
      method: 'POST',
    });
  },

  archive: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/documents/${id}/archive`, {
      method: 'POST',
    });
  },

  getAccessLog: (id: number) => {
    return apiFetch<{ success: boolean; log: any[] }>(`/api/documents/${id}/access-log`);
  },
};

// Subscriptions API
export const subscriptionsApi = {
  getPlans: () => {
    return apiFetch<{ success: boolean; data: any[] }>('/api/subscriptions/plans');
  },

  getCompanySubscription: (companyId: number) => {
    return apiFetch<{ success: boolean; data: any }>(`/api/subscriptions/company/${companyId}`);
  },

  requestSubscription: (data: {
    company_id: number;
    plan_id: number;
    billing_cycle?: string;
    start_date?: string;
    custom_terms?: string;
  }) => {
    return apiFetch<{ success: boolean; data: { id: number } }>('/api/subscriptions/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  approveSubscription: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/subscriptions/${id}/approve`, {
      method: 'POST',
    });
  },

  checkLimits: (companyId: number) => {
    return apiFetch<{ success: boolean; data: { within_limits: boolean; exceeded: string[] } }>(
      `/api/subscriptions/limits/${companyId}`
    );
  },
};

// Support & Tickets API
export const supportApi = {
  // Tickets
  getTickets: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return apiFetch<{ success: boolean; data: any[] }>(`/api/support/tickets${params}`);
  },

  createTicket: (data: {
    subject: string;
    description: string;
    category?: string;
    priority?: string;
  }) => {
    return apiFetch<{ success: boolean; data: { id: number; ticket_number: string } }>(
      '/api/support/tickets',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  getTicketMessages: (ticketId: number) => {
    return apiFetch<{ success: boolean; data: any[] }>(`/api/support/tickets/${ticketId}/messages`);
  },

  addTicketMessage: (ticketId: number, message: string, isInternal: boolean = false) => {
    return apiFetch<{ success: boolean; message: string }>(
      `/api/support/tickets/${ticketId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ message, is_internal: isInternal }),
      }
    );
  },

  updateTicketStatus: (ticketId: number, status: string, resolutionNotes?: string) => {
    return apiFetch<{ success: boolean; message: string }>(
      `/api/support/tickets/${ticketId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, resolution_notes: resolutionNotes }),
      }
    );
  },

  // Newsletters
  getNewsletters: (limit: number = 20) => {
    return apiFetch<{ success: boolean; data: any[] }>(`/api/support/newsletters?limit=${limit}`);
  },

  createNewsletter: (data: {
    title: string;
    content: string;
    category?: string;
    recipient_type: string;
    target_companies?: number[];
    target_exchanges?: number[];
  }) => {
    return apiFetch<{ success: boolean; data: { id: number } }>('/api/support/newsletters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  publishNewsletter: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/support/newsletters/${id}/publish`, {
      method: 'POST',
    });
  },

  markNewsletterAsRead: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/support/newsletters/${id}/read`, {
      method: 'POST',
    });
  },
};

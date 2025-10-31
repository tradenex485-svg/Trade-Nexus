/**
 * Admin & Master Data API
 * Handles exchanges, companies, traders, and API keys management
 */

import { apiFetch } from './client';

// Exchanges API
export const exchangesApi = {
  getAll: () => {
    return apiFetch<{ data: any[] }>('/api/exchanges');
  },

  create: (data: {
    exchange_code: string;
    exchange_name: string;
    regulatory_body?: string;
    country?: string;
    description?: string;
    website?: string;
    contact_email?: string;
    contact_phone?: string;
  }) => {
    return apiFetch<{ success: boolean; message: string; id: number }>('/api/exchanges', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: any) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/exchanges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/exchanges/${id}`, {
      method: 'DELETE',
    });
  },
};

// Companies API
export const companiesApi = {
  getAll: () => {
    return apiFetch<{ data: any[] }>('/api/companies');
  },

  getById: (id: number) => {
    return apiFetch<{ data: any }>(`/api/companies/${id}`);
  },

  create: (data: {
    exchange_id: number;
    company_code: string;
    company_name: string;
    legal_entity_name?: string;
    registration_number?: string;
    country?: string;
    contact_email?: string;
    contact_phone?: string;
    compliance_officer_name?: string;
    compliance_officer_email?: string;
    onboarding_date?: string;
  }) => {
    return apiFetch<{ success: boolean; message: string; id: number }>('/api/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: any) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/companies/${id}`, {
      method: 'DELETE',
    });
  },
};

// Traders API
export const tradersApi = {
  getAll: () => {
    return apiFetch<{ data: any[] }>('/api/traders');
  },

  getById: (id: number) => {
    return apiFetch<{ success: boolean; trader: any; assignments: any[] }>(`/api/traders/${id}`);
  },

  create: (data: {
    name: string;
    email: string;
    password: string;
    trader_code?: string;
    department?: string;
    desk_name?: string;
    company_id?: number;
  }) => {
    return apiFetch<{ success: boolean; message: string; id: number }>('/api/traders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: any) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/traders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/traders/${id}`, {
      method: 'DELETE',
    });
  },
};

// API Keys Management API
export const apiKeysApi = {
  getAll: () => {
    return apiFetch<{ success: boolean; data: any[] }>('/api/api-keys');
  },

  getStats: () => {
    return apiFetch<{ success: boolean; data: any }>('/api/api-keys/stats/summary');
  },

  create: (data: {
    key_name: string;
    description?: string;
    expires_in_days: number;
    rate_limit: number;
  }) => {
    return apiFetch<{ success: boolean; data: any }>('/api/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  revoke: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/api-keys/${id}`, {
      method: 'DELETE',
    });
  },
};

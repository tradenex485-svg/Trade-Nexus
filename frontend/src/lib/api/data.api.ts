/**
 * Data Import & Aggregation API
 * Handles ICE data import and position aggregation
 */

import { apiFetch } from './client';

// Data Import API
export const dataImportApi = {
  importICEData: () => {
    return apiFetch<{ success: boolean; message: string; effectiveDate?: string; rowsImported?: number }>('/api/data/import/ice', {
      method: 'POST',
    });
  },

  getStatus: () => {
    return apiFetch<{ success: boolean; marketLimits: any; calculations: any }>('/api/data/import/status');
  },

  calculateAll: () => {
    return apiFetch<{ success: boolean; message: string; calculations: any }>('/api/data/calculate/all', {
      method: 'POST',
    });
  },
};

// Position Aggregation API
export const aggregationApi = {
  getGroups: () => {
    return apiFetch<{ success: boolean; data: any[] }>('/api/aggregation/groups');
  },

  getPositions: () => {
    return apiFetch<{ success: boolean; data: any[] }>('/api/aggregation/positions');
  },

  getStats: () => {
    return apiFetch<{ success: boolean; data: any }>('/api/aggregation/stats');
  },

  calculate: (payload?: { calculation_type?: string; company_id?: number }) => {
    return apiFetch<{ success: boolean; data: any }>('/api/aggregation/calculate', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },
};

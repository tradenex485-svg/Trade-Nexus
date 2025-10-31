/**
 * Data Import & Aggregation API
 * Handles ICE data import, CSV import, and position aggregation
 */

import { apiFetch } from './client';
import { useAuthStore } from '@/store/auth-store';
import { API_BASE_URL } from './client';

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
    return apiFetch<{ success: boolean; data: any[]; count: number }>('/api/aggregation/groups');
  },

  getGroupMembers: (groupId: number) => {
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/aggregation/groups/${groupId}/members`);
  },

  getPositions: (params?: { group_code?: string; company_id?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.group_code) queryParams.append('group_code', params.group_code);
    if (params?.company_id) queryParams.append('company_id', params.company_id.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/aggregation/positions${query ? '?' + query : ''}`);
  },

  calculate: (payload?: { calculation_type?: string; company_id?: number }) => {
    return apiFetch<{ success: boolean; message: string; data: any }>('/api/aggregation/calculate', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  calculateEquivalence: (commodityA: string, commodityB: string, positionA: number) => {
    return apiFetch<{ success: boolean; data: any }>('/api/aggregation/equivalence', {
      method: 'POST',
      body: JSON.stringify({
        commodity_a: commodityA,
        commodity_b: commodityB,
        position_a: positionA,
      }),
    });
  },

  checkSpreadNetting: (commodityA: string, commodityB: string, positionA: number, positionB: number) => {
    return apiFetch<{ success: boolean; data: any }>('/api/aggregation/spread-netting', {
      method: 'POST',
      body: JSON.stringify({
        commodity_a: commodityA,
        commodity_b: commodityB,
        position_a: positionA,
        position_b: positionB,
      }),
    });
  },

  getCommodityRelationships: (commodityCode: string) => {
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/aggregation/relationships/${commodityCode}`);
  },

  getStats: () => {
    return apiFetch<{ success: boolean; data: any }>('/api/aggregation/stats');
  },
};

// CSV Import API
export const csvImportApi = {
  importTransactions: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = useAuthStore.getState().token;
    const response = await fetch(`${API_BASE_URL}/api/csv-import/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.message || error.error || 'Transaction import failed');
    }

    return response.json() as Promise<{
      success: boolean;
      message: string;
      inserted: number;
      skipped: number;
      upload_id: number;
      validation_errors: string[];
    }>;
  },

  importPowerData: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = useAuthStore.getState().token;
    const response = await fetch(`${API_BASE_URL}/api/csv-import/power-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.message || error.error || 'Power data import failed');
    }

    return response.json() as Promise<{
      success: boolean;
      message: string;
      inserted: number;
      skipped: number;
      upload_id: number;
      validation_errors: string[];
    }>;
  },
};

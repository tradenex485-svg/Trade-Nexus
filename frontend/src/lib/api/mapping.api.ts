/**
 * Mapping API
 * Handles market location to commodity code mappings
 */

import { apiFetch } from './client';

export interface Mapping {
  id: number;
  contract_name: string;
  market_location: string;
  commodity_code: string;
  unit_of_trading?: string;
  aggregate_1_positive_correlation?: string;
  aggregate_2_negative_correlation?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CreateMappingPayload {
  contract_name: string;
  market_location: string;
  commodity_code: string;
  unit_of_trading?: string;
  aggregate_1_positive_correlation?: string;
  aggregate_2_negative_correlation?: string;
}

export interface UpdateMappingPayload {
  contract_name: string;
  market_location: string;
  commodity_code: string;
  unit_of_trading?: string;
  aggregate_1_positive_correlation?: string;
  aggregate_2_negative_correlation?: string;
}

export const mappingApi = {
  /**
   * Get all mappings
   */
  getAll: () => {
    return apiFetch<{ success: boolean; data: Mapping[]; count: number }>('/api/mapping');
  },

  /**
   * Get single mapping by ID
   */
  getById: (id: number) => {
    return apiFetch<{ success: boolean; data: Mapping }>(`/api/mapping/${id}`);
  },

  /**
   * Create new mapping
   */
  create: (payload: CreateMappingPayload) => {
    return apiFetch<{ success: boolean; message: string; data: Mapping }>('/api/mapping', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update existing mapping
   */
  update: (id: number, payload: UpdateMappingPayload) => {
    return apiFetch<{ success: boolean; message: string; data: Mapping }>(`/api/mapping/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete mapping (soft delete)
   */
  delete: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/mapping/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get mappings by commodity code
   */
  getByCommodity: (code: string) => {
    return apiFetch<{ success: boolean; data: Mapping[]; count: number }>(`/api/mapping/commodity/${code}`);
  },

  /**
   * Get mappings by market location
   */
  getByMarket: (location: string) => {
    return apiFetch<{ success: boolean; data: Mapping[]; count: number }>(`/api/mapping/market/${location}`);
  },
};

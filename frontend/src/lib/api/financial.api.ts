/**
 * Financial & Bank Accounts API
 * Handles bank accounts and financial transactions
 */

import { apiFetch } from './client';

export const financialApi = {
  // Bank Accounts
  getAccounts: () => {
    return apiFetch<{ success: boolean; data: any[] }>('/api/financial/accounts');
  },

  createAccount: (data: {
    account_name: string;
    account_number: string;
    bank_name: string;
    bank_branch?: string;
    swift_code?: string;
    routing_number?: string;
    iban?: string;
    account_type?: string;
    currency?: string;
    is_primary?: boolean;
  }) => {
    return apiFetch<{ success: boolean; data: { id: number } }>('/api/financial/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Transactions
  getTransactions: (status?: string, limit: number = 50) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    return apiFetch<{ success: boolean; data: any[] }>(`/api/financial/transactions?${params}`);
  },

  createTransaction: (data: {
    transaction_type: string;
    amount: number;
    currency?: string;
    from_account_id?: number;
    to_account_id?: number;
    company_id?: number;
    subscription_id?: number;
    payment_method?: string;
    reference_number?: string;
    transaction_date?: string;
    description?: string;
  }) => {
    return apiFetch<{ success: boolean; data: { id: number; transaction_number: string } }>(
      '/api/financial/transactions',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  completeTransaction: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(
      `/api/financial/transactions/${id}/complete`,
      {
        method: 'POST',
      }
    );
  },
};

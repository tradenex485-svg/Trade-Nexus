import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exchangesApi } from '../api';

// Query keys
export const exchangesKeys = {
  all: ['exchanges'] as const,
  lists: () => [...exchangesKeys.all, 'list'] as const,
  list: (filters: string) => [...exchangesKeys.lists(), { filters }] as const,
  details: () => [...exchangesKeys.all, 'detail'] as const,
  detail: (id: number) => [...exchangesKeys.details(), id] as const,
};

// Fetch all exchanges
export function useExchanges() {
  return useQuery({
    queryKey: exchangesKeys.lists(),
    queryFn: () => exchangesApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes - matches backend cache
  });
}

// Create exchange
export function useCreateExchange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      exchange_code: string;
      exchange_name: string;
      regulatory_body?: string;
      country?: string;
      description?: string;
      website?: string;
      contact_email?: string;
      contact_phone?: string;
    }) => exchangesApi.create(data),
    onSuccess: () => {
      // Invalidate and refetch exchanges list
      queryClient.invalidateQueries({ queryKey: exchangesKeys.lists() });
    },
  });
}

// Update exchange
export function useUpdateExchange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      exchangesApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate both list and specific exchange detail
      queryClient.invalidateQueries({ queryKey: exchangesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: exchangesKeys.detail(variables.id) });
    },
  });
}

// Delete exchange
export function useDeleteExchange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => exchangesApi.delete(id),
    onSuccess: () => {
      // Invalidate exchanges list
      queryClient.invalidateQueries({ queryKey: exchangesKeys.lists() });
    },
  });
}

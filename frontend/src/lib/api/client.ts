/**
 * Shared API Client
 * Provides the base API fetch wrapper with authentication
 */

import * as Sentry from '@sentry/nextjs';
import { useAuthStore } from '@/store/auth-store';
import { logger } from '@/lib/logger';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

/**
 * Generic API fetch wrapper with automatic token injection
 * @param endpoint - API endpoint path (e.g., '/api/users')
 * @param options - Standard fetch options
 * @returns Promise with typed response
 */
export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      const errorMessage = error.error || `HTTP ${response.status}`;
      const apiError = new Error(errorMessage);

      // Track API errors in Sentry
      Sentry.captureException(apiError, {
        tags: {
          api_endpoint: endpoint,
          http_status: response.status,
          error_type: 'api_error',
        },
        contexts: {
          api: {
            endpoint,
            method: options?.method || 'GET',
            status: response.status,
          },
        },
        level: response.status >= 500 ? 'error' : 'warning',
      });

      throw apiError;
    }

    return response.json();
  } catch (error) {
    logger.error(`API Error (${endpoint}):`, error);

    // Track network errors in Sentry
    if (error instanceof TypeError && error.message.includes('fetch')) {
      Sentry.captureException(error, {
        tags: {
          api_endpoint: endpoint,
          error_type: 'network_error',
        },
        level: 'error',
      });
    }

    throw error;
  }
}

/**
 * Shared API Types
 * Common type definitions used across all API modules
 */

export interface ApiResponse<T> {
  data?: T;
  meta?: any;
  error?: string;
  message?: string;
  success?: boolean;
}

export interface ApiError {
  error: string;
  status?: number;
  details?: any;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  limit?: number;
  offset?: number;
}

export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
}

export interface FilterParams extends PaginationParams {
  search?: string;
  status?: string;
}

/**
 * Authentication & User Management API
 * Handles user authentication, registration, profile, and settings
 */

import { apiFetch } from './client';
import { ApiResponse } from './types';

// Auth API
export const authApi = {
  // Email-based authentication method detection for SSO
  detectAuthMethod: (email: string) => {
    return apiFetch<{
      success: boolean;
      auth_method: 'password' | 'saml' | 'oauth';
      provider_name: string | null;
      requires_password: boolean;
      sso_login_url?: string;
      message?: string;
    }>('/api/auth/detect-auth-method', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  login: (email: string, password: string) => {
    return apiFetch<{ token: string; refresh_token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: (data: { email: string; password: string; name: string }) => {
    return apiFetch<{ token: string; refresh_token: string; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  refresh: (refreshToken: string) => {
    return apiFetch<{ token: string; refresh_token: string }>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  getProfile: (token: string) => {
    return apiFetch<{ user: any }>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  logout: (token: string) => {
    return apiFetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  forgotPassword: (email: string) => {
    return apiFetch<{ success: boolean; message: string; reset_code?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: (data: { email: string; reset_code: string; new_password: string }) => {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Users API
export const usersApi = {
  getProfile: () => {
    return apiFetch<{ success: boolean; user: any }>('/api/users/profile');
  },

  updateProfile: (data: { name: string; trader_code?: string; department?: string; desk_name?: string }) => {
    return apiFetch<{ success: boolean; message: string; user: any }>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getSettings: () => {
    return apiFetch<{ success: boolean; settings: any }>('/api/users/settings');
  },

  updateSettings: (settings: {
    notifications_enabled?: number;
    email_alerts?: number;
    position_alerts?: number;
    breach_alerts?: number;
    daily_summary?: number;
    alert_email?: string;
    data_retention_days?: number;
    auto_import_enabled?: number;
    theme?: string;
  }) => {
    return apiFetch<{ success: boolean; message: string; settings: any }>('/api/users/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  changePassword: (data: { current_password: string; new_password: string }) => {
    return apiFetch<{ success: boolean; message: string }>('/api/users/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

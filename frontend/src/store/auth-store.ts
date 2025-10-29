import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';
import { authLogger } from '@/lib/logger';

interface User {
  id: number;
  email: string;
  name: string;
  role_name: string;
  role: string; // Alias for role_name for easier access
  permissions: string[];
  trader_code?: string;
  department?: string;
  desk_name?: string;
  company_name?: string;
  company_id?: number;
  auth_method?: 'password' | 'saml' | 'oauth';
  sso_provider?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithSSO: (token: string, refreshToken: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          authLogger.debug('Login successful', {
            hasToken: !!response.token,
            hasUser: !!response.user,
            userEmail: response.user?.email
          });

          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          authLogger.error('Login failed', error);
          set({
            error: error.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      loginWithSSO: async (token: string, refreshToken: string) => {
        set({ isLoading: true, error: null });
        try {
          authLogger.debug('SSO Login - fetching profile with token');

          // Fetch user profile using the SSO token
          const response = await authApi.getProfile(token);
          authLogger.debug('SSO Profile response received', {
            hasUser: !!response.user,
            userEmail: response.user?.email,
            authMethod: response.user?.auth_method,
            ssoProvider: response.user?.sso_provider
          });

          set({
            user: response.user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          authLogger.error('SSO login failed', error);
          set({
            error: error.message || 'SSO login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register({ email, password, name });
          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        const { token } = get();
        try {
          if (token) {
            await authApi.logout(token);
          }
        } catch (error) {
          authLogger.error('Logout failed', error);
        } finally {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      refreshSession: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const response = await authApi.refresh(refreshToken);
          set({
            token: response.token,
            refreshToken: response.refresh_token,
          });
        } catch (error) {
          authLogger.error('Token refresh failed', error);
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      fetchProfile: async () => {
        const { token } = get();
        if (!token) return;

        set({ isLoading: true });
        try {
          const response = await authApi.getProfile(token);
          set({
            user: response.user,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Failed to fetch profile',
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),

      setHasHydrated: (hasHydrated: boolean) => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: 'auth-storage',
      version: 1,
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Migrate function to handle version changes or data cleanup
      migrate: (persistedState: any, version: number) => {
        authLogger.debug('Migration check', { version, hasPersistedState: !!persistedState });

        // If we have persisted state, ensure all required fields exist
        if (persistedState && typeof persistedState === 'object') {
          // Ensure token and user are both present or both absent (consistency check)
          if (persistedState.user && !persistedState.token) {
            authLogger.warn('Migration: User exists but token missing - clearing state');
            return {
              token: null,
              refreshToken: null,
              user: null,
              isAuthenticated: false,
            };
          }

          // Ensure isAuthenticated matches token presence
          if (persistedState.token && !persistedState.isAuthenticated) {
            authLogger.debug('Migration: Fixing isAuthenticated flag');
            persistedState.isAuthenticated = true;
          } else if (!persistedState.token && persistedState.isAuthenticated) {
            authLogger.debug('Migration: Fixing isAuthenticated flag (no token)');
            persistedState.isAuthenticated = false;
          }
        }

        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        authLogger.debug('Rehydration started');

        // Check localStorage for consistency
        try {
          const stored = localStorage.getItem('auth-storage');
          if (stored) {
            const parsed = JSON.parse(stored);

            // Consistency check
            if (parsed.state?.user && !parsed.state?.token) {
              authLogger.warn('Inconsistent state detected: User exists but no token - clearing');
              localStorage.removeItem('auth-storage');
            }
          }
        } catch (e) {
          authLogger.error('Error reading localStorage during rehydration', e);
          // Clear corrupted localStorage
          try {
            localStorage.removeItem('auth-storage');
            authLogger.debug('Cleared corrupted localStorage');
          } catch {}
        }

        // The 'state' parameter is the rehydrated state from localStorage
        if (state) {
          authLogger.debug('Rehydration complete with persisted state', {
            hasToken: !!state.token,
            hasUser: !!state.user,
            isAuthenticated: state.isAuthenticated
          });

          // Final consistency check
          if (state.user && !state.token) {
            authLogger.warn('Rehydrated state is inconsistent - clearing');
            state.logout();
          }

          // Mark as hydrated
          state.setHasHydrated(true);
        } else {
          // No persisted state - mark as hydrated anyway so app can render
          authLogger.debug('Rehydration complete (no persisted state)');
          useAuthStore.getState().setHasHydrated(true);
        }
      },
    }
  )
);

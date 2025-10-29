import { create } from 'zustand';
import { alertsApiEnhanced } from '@/lib/api';

interface Alert {
  id: number;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  commodity_code?: string;
  utilization_pct?: number;
  read: number;
  acknowledged: number;
  created_at: string;
  reporting_limit_code?: string;
  pos_lots?: number;
  limit_lots?: number;
}

interface AlertStats {
  total: number;
  unread: number;
  by_severity: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
  recent_count: number;
}

interface AlertsState {
  alerts: Alert[];
  stats: AlertStats | null;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAlerts: (params?: { unread?: boolean; severity?: string; limit?: number }) => Promise<void>;
  fetchStats: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  acknowledge: (id: number, notes?: string) => Promise<void>;
  clearError: () => void;
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  stats: null,
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchAlerts: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await alertsApiEnhanced.getAll(params);
      set({
        alerts: response.data,
        unreadCount: response.unread_count,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch alerts',
        isLoading: false,
      });
    }
  },

  fetchStats: async () => {
    try {
      const response = await alertsApiEnhanced.getStats();
      set({ stats: response.stats });
    } catch (error: any) {
      console.error('Failed to fetch alert stats:', error);
    }
  },

  markAsRead: async (id) => {
    try {
      await alertsApiEnhanced.markAsRead(id);

      // Update local state
      set((state) => ({
        alerts: state.alerts.map((alert) =>
          alert.id === id ? { ...alert, read: 1 } : alert
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to mark alert as read' });
    }
  },

  acknowledge: async (id, notes) => {
    try {
      await alertsApiEnhanced.acknowledge(id, notes);

      // Update local state
      set((state) => ({
        alerts: state.alerts.map((alert) =>
          alert.id === id ? { ...alert, acknowledged: 1, read: 1 } : alert
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to acknowledge alert' });
    }
  },

  clearError: () => set({ error: null }),
}));

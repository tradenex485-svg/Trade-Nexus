import { create } from 'zustand';
import { dashboardApi } from '@/lib/api';

interface DashboardOverview {
  total_positions: number;
  by_prioritization: {
    Monitor: number;
    Validate: number;
    Remediate: number;
    Breached: number;
  };
  by_limit_type: any[];
  average_utilization: number;
  unread_alerts: number;
  top_risks: any[];
  recent_alerts: any[];
}

interface DashboardState {
  overview: DashboardOverview | null;
  byCommodity: any[];
  trending: any[];
  heatmap: any[];
  concentration: any;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchOverview: (exchangeId?: number) => Promise<void>;
  fetchByCommodity: (limitType?: number, exchangeId?: number) => Promise<void>;
  fetchTrending: (days?: number, exchangeId?: number, commodityCode?: string) => Promise<void>;
  fetchHeatmap: (limitType?: number) => Promise<void>;
  fetchConcentration: () => Promise<void>;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  overview: null,
  byCommodity: [],
  trending: [],
  heatmap: [],
  concentration: null,
  isLoading: false,
  error: null,

  fetchOverview: async (exchangeId?: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await dashboardApi.getOverview(exchangeId);
      set({
        overview: response.overview,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch overview',
        isLoading: false,
      });
    }
  },

  fetchByCommodity: async (limitType = 1, exchangeId?: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await dashboardApi.getByCommodity(limitType, exchangeId);
      set({
        byCommodity: response.data,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch commodity data',
        isLoading: false,
      });
    }
  },

  fetchTrending: async (days = 7, exchangeId?: number, commodityCode?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await dashboardApi.getTrending(days, commodityCode, exchangeId);
      set({
        trending: response.daily_summary,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch trending data',
        isLoading: false,
      });
    }
  },

  fetchHeatmap: async (limitType = 1) => {
    set({ isLoading: true, error: null });
    try {
      const response = await dashboardApi.getHeatmap(limitType);
      set({
        heatmap: response.data,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch heatmap data',
        isLoading: false,
      });
    }
  },

  fetchConcentration: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await dashboardApi.getConcentration();
      set({
        concentration: response.concentration,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch concentration data',
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));

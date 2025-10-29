'use client';

import { useEffect, useState } from 'react';
import { useDashboardStore } from '@/store/dashboard-store';
import { useAlertsStore } from '@/store/alerts-store';
import { useAuthStore } from '@/store/auth-store';
import { AuthGuard } from '@/components/auth/auth-guard';
import { SearchFilters, DashboardFilters } from '@/components/dashboard/search-filters';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { TopRisksTable } from '@/components/dashboard/top-risks-table';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { IcePositions } from '@/components/dashboard/ice-positions';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { dataImportApi } from '@/lib/api';

interface Exchange {
  id: number;
  exchange_code: string;
  exchange_name: string;
  is_active: boolean;
}

export default function DashboardPage() {
  const { overview, trending, byCommodity, isLoading, fetchOverview, fetchTrending, fetchByCommodity } =
    useDashboardStore();
  const { unreadCount, fetchAlerts } = useAlertsStore();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // State
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [filters, setFilters] = useState<DashboardFilters>({
    search: '',
    priorities: [],
    limitTypes: [],
    utilizationMin: 0,
    utilizationMax: 999999,
    sortBy: 'utilization',
    sortOrder: 'desc',
  });
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | '90d'>('7d');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<30 | 60 | 300>(60);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedExchange, setSelectedExchange] = useState<number | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  // Load exchanges
  const loadExchanges = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://trade-nexus-api.metabilityllc1.workers.dev'}/api/exchanges`);
      const data = await response.json();
      if (data.data) {
        setExchanges(data.data.filter((ex: Exchange) => ex.is_active));
      }
    } catch (error) {
      console.error('Failed to load exchanges:', error);
    }
  };

  // Load dashboard data
  const loadDashboardData = async () => {
    const days = dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    await Promise.all([
      fetchOverview(selectedExchange || undefined),
      fetchTrending(days, selectedExchange || undefined),
      fetchByCommodity(1, selectedExchange || undefined),
      fetchAlerts({ limit: 10 }),
    ]);
    setLastUpdated(new Date());
  };

  // Initial load
  useEffect(() => {
    if (!_hasHydrated) return;
    if (isAuthenticated) {
      loadDashboardData();
      loadExchanges();
    }
  }, [_hasHydrated, isAuthenticated, dateRange, selectedExchange]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !isAuthenticated) return;

    const interval = setInterval(() => {
      loadDashboardData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isAuthenticated, dateRange]);

  // Handlers
  const handleImportICE = async () => {
    setImporting(true);
    setImportStatus('');
    try {
      const result = await dataImportApi.importICEData();
      setImportStatus(result.message);
      setTimeout(() => {
        fetchOverview();
        fetchTrending(7);
        fetchByCommodity(1);
      }, 2000);
    } catch (error: any) {
      setImportStatus(`Error: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleAutoRefreshChange = (enabled: boolean, interval?: 30 | 60 | 300) => {
    setAutoRefresh(enabled);
    if (interval) {
      setRefreshInterval(interval);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      priorities: [],
      limitTypes: [],
      utilizationMin: 0,
      utilizationMax: 999999,
      sortBy: 'utilization',
      sortOrder: 'desc',
    });
  };

  // Loading state
  if (isLoading && !overview) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <DashboardHeader
              selectedExchange={selectedExchange}
              exchanges={exchanges}
              onExchangeChange={setSelectedExchange}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              autoRefresh={autoRefresh}
              refreshInterval={refreshInterval}
              onAutoRefreshChange={handleAutoRefreshChange}
              onManualRefresh={loadDashboardData}
              onImportICE={handleImportICE}
              importing={importing}
              importStatus={importStatus}
              lastUpdated={lastUpdated}
              isLoading={isLoading}
            />

            {/* Stats Cards */}
            <StatsCards overview={overview} trending={trending} />

            {/* Dashboard Charts */}
            <DashboardCharts
              overview={overview}
              trending={trending}
              byCommodity={byCommodity}
            />

            {/* ICE Positions */}
            <div className="mb-8">
              <IcePositions />
            </div>

            {/* Search and Filters */}
            <SearchFilters
              filters={filters}
              onChange={setFilters}
              onClear={handleClearFilters}
            />

            {/* Top Risks Table */}
            {overview && overview.top_risks && (
              <TopRisksTable
                risks={overview.top_risks}
                filters={filters}
              />
            )}

            {/* Quick Actions */}
            <QuickActions unreadCount={unreadCount} />
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
}

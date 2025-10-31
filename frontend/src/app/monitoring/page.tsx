'use client';

import { useState, useEffect } from 'react';
import { monitoringApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BidWeekStatus } from '@/components/cftc/bid-week-status';
import { ExceptionsDashboard } from '@/components/cftc/exceptions-dashboard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import {
  Eye,
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Scale,
  Building2,
  Activity,
  AlertCircle,
  Info,
} from 'lucide-react';

interface MonitoringStats {
  last_monitoring_cycle?: any;
  positions: {
    total_positions: number;
    breached: number;
    warning: number;
    caution: number;
    avg_utilization: number;
  };
  breaches: {
    total_open_breaches: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  alerts_24h: {
    total_alerts: number;
    unacknowledged: number;
  };
  timestamp: string;
}

interface Breach {
  id: number;
  commodity_code: string;
  market_location: string;
  breach_type: string;
  severity: string;
  status: string;
  position_lots: number;
  limit_value: number;
  utilization_pct: number;
  breach_amount: number;
  detected_at: string;
  exchange_code: string;
  rule_name: string;
  rule_code: string;
}

export default function MonitoringPage() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [breaches, setBreaches] = useState<Breach[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedExchange, setSelectedExchange] = useState<string>('all');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [processingBreach, setProcessingBreach] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [statsRes, breachesRes, historyRes] = await Promise.all([
        monitoringApi.getStats().catch(err => ({ success: false, error: err.message, data: null })),
        monitoringApi.getBreaches({ limit: 100 }).catch(err => ({ success: false, error: err.message, data: [] })),
        monitoringApi.getHistory(24).catch(err => ({ success: false, error: err.message, data: [] })),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      } else if (!statsRes.success) {
        console.warn('Stats API error:', 'error' in statsRes ? statsRes.error : 'Unknown error');
        // Set default empty stats
        setStats({
          positions: { total_positions: 0, breached: 0, warning: 0, caution: 0, avg_utilization: 0 },
          breaches: { total_open_breaches: 0, critical: 0, high: 0, medium: 0, low: 0 },
          alerts_24h: { total_alerts: 0, unacknowledged: 0 },
          timestamp: new Date().toISOString(),
        });
      }

      if (breachesRes.success && breachesRes.data) {
        setBreaches(breachesRes.data);
      } else if (!breachesRes.success) {
        console.warn('Breaches API error:', 'error' in breachesRes ? breachesRes.error : 'Unknown error');
      }

      if (historyRes.success && historyRes.data) {
        setHistory(historyRes.data);
      } else if (!historyRes.success) {
        console.warn('History API error:', 'error' in historyRes ? historyRes.error : 'Unknown error');
      }
    } catch (err: any) {
      console.error('Load data error:', err);
      setError(err.message || 'Failed to load monitoring data');
      // Set default empty stats even on error
      setStats({
        positions: { total_positions: 0, breached: 0, warning: 0, caution: 0, avg_utilization: 0 },
        breaches: { total_open_breaches: 0, critical: 0, high: 0, medium: 0, low: 0 },
        alerts_24h: { total_alerts: 0, unacknowledged: 0 },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRunMonitoring = async () => {
    try {
      setRefreshing(true);
      const result = await monitoringApi.runMonitoring();
      if (result.success) {
        // Reload data after monitoring cycle completes
        await loadData();
      } else {
        setError('Failed to run monitoring cycle');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run monitoring cycle');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAcknowledgeBreach = async (breachId: number) => {
    try {
      setProcessingBreach(breachId);
      const result = await monitoringApi.updateBreach(breachId, { status: 'acknowledged' });
      if (result.success) {
        // Reload data to reflect changes
        await loadData();
      } else {
        setError('Failed to acknowledge breach');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to acknowledge breach');
    } finally {
      setProcessingBreach(null);
    }
  };

  const handleResolveBreach = async (breachId: number) => {
    try {
      setProcessingBreach(breachId);
      const notes = prompt('Enter resolution notes (optional):');
      const result = await monitoringApi.updateBreach(breachId, {
        status: 'resolved',
        resolution_notes: notes || undefined
      });
      if (result.success) {
        // Reload data to reflect changes
        await loadData();
      } else {
        setError('Failed to resolve breach');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resolve breach');
    } finally {
      setProcessingBreach(null);
    }
  };

  useEffect(() => {
    // Wait for token to be available before loading data
    if (!token) {
      setLoading(false);
      return;
    }

    loadData();

    // Auto-refresh every 30 seconds
    if (autoRefresh) {
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, token]);

  const filteredBreaches = breaches.filter(breach => {
    if (selectedSeverity !== 'all' && breach.severity !== selectedSeverity) return false;
    if (selectedExchange !== 'all' && breach.exchange_code !== selectedExchange) return false;
    if (selectedCommodity !== 'all' && breach.commodity_code !== selectedCommodity) return false;
    return true;
  });

  // Get unique exchanges and commodities for filter dropdowns
  const uniqueExchanges = Array.from(new Set(breaches.map(b => b.exchange_code))).sort();
  const uniqueCommodities = Array.from(new Set(breaches.map(b => b.commodity_code))).sort();

  const complianceScore = stats?.positions?.total_positions
    ? ((stats.positions.total_positions - stats.positions.breached) / stats.positions.total_positions) * 100
    : 100;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/30';
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading monitoring data...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Eye className="h-8 w-8 text-blue-500" />
            Compliance Monitoring
          </h1>
          <p className="text-slate-400 mt-1">
            Real-time regulatory compliance tracking and breach management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRunMonitoring}
            disabled={refreshing}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Activity className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Run Monitoring
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="border-slate-700"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            className={cn(!autoRefresh && "border-slate-700")}
          >
            <Clock className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {/* Data Quality Warning */}
      {stats?.positions && stats.positions.breached > 100 && (
        <Card className="p-4 bg-yellow-500/10 border-yellow-500/30 border">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-500">Data Quality Alert</h3>
              <p className="text-xs text-yellow-400/80 mt-1">
                {stats.positions.breached} positions show utilization ≥100%. This may indicate incorrect limit values or position data that needs review.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Overview */}
      <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Score */}
        <Card className="p-6 bg-slate-900/50 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <Shield className="h-8 w-8 text-green-500" />
            <div className={cn(
              "text-3xl font-bold",
              complianceScore >= 95 ? "text-green-500" :
              complianceScore >= 85 ? "text-yellow-500" : "text-red-500"
            )}>
              {complianceScore.toFixed(1)}%
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-slate-400">Compliance Score</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-slate-400 hover:text-slate-300 transition-colors">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs space-y-2">
                  <p className="font-semibold text-white">Compliance Score</p>
                  <p>Overall compliance percentage across all monitored positions.</p>
                  <p className="text-xs text-slate-300 mt-2">
                    <strong>Calculation:</strong> ((total_positions - breached) / total_positions) × 100
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    ≥95% = Good, 85-94% = Warning, &lt;85% = Critical
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-slate-500">
            {stats?.positions.total_positions || 0} total positions monitored
          </p>
          {stats?.positions && stats.positions.breached > 0 && (
            <p className="text-xs text-red-400 mt-1">
              {stats.positions.breached} positions breached
            </p>
          )}
        </Card>

        {/* Critical Breaches */}
        <Card className="p-6 bg-slate-900/50 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div className="text-3xl font-bold text-red-500">
              {stats?.breaches.critical || 0}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-slate-400">Critical Breaches</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-slate-400 hover:text-slate-300 transition-colors">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs space-y-2">
                  <p className="font-semibold text-white">Critical Breach Events</p>
                  <p>Number of critical severity regulatory breach events in the compliance_breaches table.</p>
                  <p className="text-xs text-slate-300 mt-2">
                    <strong>Calculation:</strong> COUNT of compliance_breaches where severity = 'critical' and status = 'open'
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    These are historical breach event records tracked for compliance auditing. Each breach event is logged separately.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-slate-500">
            {stats?.breaches.total_open_breaches || 0} total open breaches
          </p>
        </Card>

        {/* Warning Positions */}
        <Card className="p-6 bg-slate-900/50 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-8 w-8 text-yellow-500" />
            <div className="text-3xl font-bold text-yellow-500">
              {stats?.positions.warning || 0}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-slate-400">Warning Level</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-slate-400 hover:text-slate-300 transition-colors">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs space-y-2">
                  <p className="font-semibold text-white">Warning Level Positions</p>
                  <p>Number of positions approaching their regulatory limits.</p>
                  <p className="text-xs text-slate-300 mt-2">
                    <strong>Calculation:</strong> COUNT of positions where 85% ≤ pos_pct &lt; 100%
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    These positions require close monitoring as they may breach soon.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-slate-500">
            Positions at 85-99% utilization
          </p>
        </Card>

        {/* Recent Alerts */}
        <Card className="p-6 bg-slate-900/50 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <Activity className="h-8 w-8 text-blue-500" />
            <div className="text-3xl font-bold text-blue-500">
              {stats?.alerts_24h.total_alerts || 0}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-slate-400">Alerts (24h)</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-slate-400 hover:text-slate-300 transition-colors">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs space-y-2">
                  <p className="font-semibold text-white">24-Hour Alerts</p>
                  <p>Total number of system alerts generated in the last 24 hours.</p>
                  <p className="text-xs text-slate-300 mt-2">
                    <strong>Calculation:</strong> COUNT of alerts where created_at ≥ NOW() - 24 hours
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Includes threshold alerts, breach notifications, and system warnings.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-slate-500">
            {stats?.alerts_24h.unacknowledged || 0} unacknowledged
          </p>
        </Card>
      </div>
      </TooltipProvider>

      {/* Breach Severity Summary */}
      <Card className="p-6 bg-slate-900/50 border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Scale className="h-5 w-5 text-blue-500" />
          Breach Severity Distribution
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="text-2xl font-bold text-red-500">{stats?.breaches.critical || 0}</div>
            <div className="text-sm text-red-400">Critical</div>
          </div>
          <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <div className="text-2xl font-bold text-orange-500">{stats?.breaches.high || 0}</div>
            <div className="text-sm text-orange-400">High</div>
          </div>
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-500">{stats?.breaches.medium || 0}</div>
            <div className="text-sm text-yellow-400">Medium</div>
          </div>
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-500">{stats?.breaches.low || 0}</div>
            <div className="text-sm text-blue-400">Low</div>
          </div>
        </div>
      </Card>

      {/* Utilization Trend Chart */}
      {history.length > 0 && (
        <Card className="p-6 bg-slate-900/50 border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            24-Hour Utilization Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="timestamp"
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                }}
              />
              <YAxis
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
                label={{ value: 'Avg Utilization %', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '12px',
                }}
                labelFormatter={(value) => new Date(value).toLocaleString()}
                formatter={(value: any) => [`${value.toFixed(2)}%`, 'Avg Utilization']}
              />
              <Line
                type="monotone"
                dataKey="avg_utilization"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Breach Distribution by Exchange */}
      {breaches.length > 0 && (
        <Card className="p-6 bg-slate-900/50 border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Breach Distribution by Exchange
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={Object.entries(
                breaches.reduce((acc, breach) => {
                  acc[breach.exchange_code] = (acc[breach.exchange_code] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([exchange, count]) => ({ exchange, count }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="exchange"
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
                label={{ value: 'Breach Count', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '12px',
                }}
                formatter={(value: any) => [value, 'Breaches']}
              />
              <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Last Monitoring Cycle */}
      {stats?.last_monitoring_cycle && (
        <Card className="p-6 bg-slate-900/50 border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Last Monitoring Cycle
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-slate-400">Timestamp</div>
              <div className="text-white font-mono text-sm mt-1">
                {new Date(stats.last_monitoring_cycle.timestamp).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Calculations</div>
              <div className="text-white font-semibold mt-1">
                {stats.last_monitoring_cycle.calculations_updated || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400">New Breaches</div>
              <div className="text-white font-semibold mt-1">
                {stats.last_monitoring_cycle.new_breaches || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Alerts Generated</div>
              <div className="text-white font-semibold mt-1">
                {stats.last_monitoring_cycle.alerts_generated || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Compliance</div>
              <div className={cn(
                "font-semibold mt-1",
                (stats.last_monitoring_cycle.compliance_score || 0) >= 95 ? "text-green-500" :
                (stats.last_monitoring_cycle.compliance_score || 0) >= 85 ? "text-yellow-500" : "text-red-500"
              )}>
                {(stats.last_monitoring_cycle.compliance_score || 0).toFixed(2)}%
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Breaches Table */}
      <Card className="p-6 bg-slate-900/50 border-slate-700">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Open Regulatory Breaches
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={() => setSelectedSeverity('all')}
                variant={selectedSeverity === 'all' ? 'default' : 'outline'}
                size="sm"
                className={cn(selectedSeverity !== 'all' && "border-slate-700")}
              >
                All ({breaches.length})
              </Button>
              <Button
                onClick={() => setSelectedSeverity('critical')}
                variant={selectedSeverity === 'critical' ? 'default' : 'outline'}
                size="sm"
                className={cn(selectedSeverity !== 'critical' && "border-slate-700")}
              >
                Critical ({breaches.filter(b => b.severity === 'critical').length})
              </Button>
              <Button
                onClick={() => setSelectedSeverity('high')}
                variant={selectedSeverity === 'high' ? 'default' : 'outline'}
                size="sm"
                className={cn(selectedSeverity !== 'high' && "border-slate-700")}
              >
                High ({breaches.filter(b => b.severity === 'high').length})
              </Button>
            </div>
          </div>

          {/* Additional Filters */}
          <div className="flex gap-3">
            <select
              value={selectedExchange}
              onChange={(e) => setSelectedExchange(e.target.value)}
              className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="all">All Exchanges</option>
              {uniqueExchanges.map(exchange => (
                <option key={exchange} value={exchange}>{exchange}</option>
              ))}
            </select>

            <select
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="all">All Commodities</option>
              {uniqueCommodities.map(commodity => (
                <option key={commodity} value={commodity}>{commodity}</option>
              ))}
            </select>

            <div className="flex-1"></div>

            <div className="text-sm text-slate-400 flex items-center">
              Showing {filteredBreaches.length} of {breaches.length} breaches
            </div>
          </div>
        </div>

        {filteredBreaches.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Breaches Found</h3>
            <p className="text-slate-400">
              {selectedSeverity === 'all'
                ? 'All positions are within regulatory limits'
                : `No ${selectedSeverity} severity breaches`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-sm font-medium text-slate-400 pb-3">Severity</th>
                  <th className="text-left text-sm font-medium text-slate-400 pb-3">Exchange</th>
                  <th className="text-left text-sm font-medium text-slate-400 pb-3">Commodity</th>
                  <th className="text-left text-sm font-medium text-slate-400 pb-3">Market</th>
                  <th className="text-right text-sm font-medium text-slate-400 pb-3">Position</th>
                  <th className="text-right text-sm font-medium text-slate-400 pb-3">Limit</th>
                  <th className="text-right text-sm font-medium text-slate-400 pb-3">Excess</th>
                  <th className="text-right text-sm font-medium text-slate-400 pb-3">Utilization</th>
                  <th className="text-left text-sm font-medium text-slate-400 pb-3">Detected</th>
                  <th className="text-left text-sm font-medium text-slate-400 pb-3">Rule</th>
                  <th className="text-center text-sm font-medium text-slate-400 pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBreaches.map((breach) => (
                  <tr key={breach.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="py-3">
                      <Badge className={getSeverityColor(breach.severity)}>
                        {breach.severity}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 text-white">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {breach.exchange_code}
                      </div>
                    </td>
                    <td className="py-3 text-white font-mono">{breach.commodity_code}</td>
                    <td className="py-3 text-slate-300 text-sm">{breach.market_location}</td>
                    <td className="py-3 text-right text-white font-semibold">
                      {breach.position_lots.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-400">
                      {breach.limit_value.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-red-400 font-semibold">
                      +{breach.breach_amount.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <Badge className={cn(
                        breach.utilization_pct >= 120 ? "bg-red-500/20 text-red-400 border-red-500/30" :
                        breach.utilization_pct >= 110 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                        "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      )}>
                        {breach.utilization_pct.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-3 text-slate-400 text-xs font-mono">
                      {new Date(breach.detected_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-slate-300 text-sm max-w-xs truncate" title={breach.rule_name}>
                      {breach.rule_code}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledgeBreach(breach.id)}
                          disabled={processingBreach === breach.id}
                          className="text-xs px-2 py-1 h-7 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30"
                        >
                          {processingBreach === breach.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            'Acknowledge'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveBreach(breach.id)}
                          disabled={processingBreach === breach.id}
                          className="text-xs px-2 py-1 h-7 bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30"
                        >
                          {processingBreach === breach.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            'Resolve'
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* System Info */}
      <Card className="p-4 bg-slate-900/50 border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-400">
            <span className="font-semibold">Monitoring Frequency:</span> Every 15 minutes
          </div>
          <div className="text-slate-400">
            <span className="font-semibold">Last Updated:</span> {new Date(stats?.timestamp || '').toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400 font-semibold">System Operational</span>
          </div>
        </div>
      </Card>

      {/* CFTC Compliance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BidWeekStatus />
        <ExceptionsDashboard />
      </div>
    </div>
    </AuthGuard>
  );
}

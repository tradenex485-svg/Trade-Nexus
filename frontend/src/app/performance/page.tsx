'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth-store';
import { performanceApi } from '@/lib/api';
import { Gauge, Clock, Activity, TrendingUp, Zap, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PerformancePage() {
  const { token } = useAuthStore();
  const [timeRange, setTimeRange] = useState(24);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [rateLimitStats, setRateLimitStats] = useState<any>(null);

  useEffect(() => {
    // Wait for token before loading data
    if (!token) {
      setLoading(false);
      return;
    }

    loadData();
  }, [timeRange, token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [perfStats, rateStats] = await Promise.all([
        performanceApi.getStats(timeRange),
        performanceApi.getRateLimitStats(timeRange),
      ]);
      // Extract data from API response wrapper
      setStats(perfStats?.data || perfStats);
      setRateLimitStats(rateStats?.data || rateStats);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const overall = stats?.overall || {};
  const slowestEndpoints = stats?.slowestEndpoints || [];
  const statusDistribution = stats?.statusDistribution || [];
  const requestsPerHour = stats?.requestsPerHour || [];

  const topLimited = rateLimitStats?.topLimited || [];
  const topEndpoints = rateLimitStats?.topEndpoints || [];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Performance Monitoring</h1>
              <p className="text-slate-400">API performance metrics, caching, and rate limiting statistics</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant={timeRange === 1 ? 'cyber' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(1)}
              >
                1 Hour
              </Button>
              <Button
                variant={timeRange === 24 ? 'cyber' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(24)}
              >
                24 Hours
              </Button>
              <Button
                variant={timeRange === 168 ? 'cyber' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(168)}
              >
                7 Days
              </Button>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-400 text-sm">Total Requests</p>
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {overall.total_requests?.toLocaleString() || '0'}
              </p>
            </div>

            <div className="glass border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-400 text-sm">Avg Response Time</p>
                <Clock className="h-5 w-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {overall.avg_response_time ? Math.round(overall.avg_response_time) : '0'}ms
              </p>
            </div>

            <div className="glass border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-400 text-sm">Cache Hit Rate</p>
                <Zap className="h-5 w-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {overall.cache_hit_rate ? Math.round(overall.cache_hit_rate) : '0'}%
              </p>
            </div>

            <div className="glass border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-400 text-sm">Avg Queries/Request</p>
                <Database className="h-5 w-5 text-orange-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {overall.avg_query_count ? overall.avg_query_count.toFixed(2) : '0'}
              </p>
            </div>
          </div>

          {/* Slowest Endpoints */}
          <div className="glass border border-white/10 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingUp className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Slowest Endpoints</h2>
            </div>

            {slowestEndpoints.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-sm font-medium text-slate-400 pb-3">Endpoint</th>
                      <th className="text-left text-sm font-medium text-slate-400 pb-3">Method</th>
                      <th className="text-right text-sm font-medium text-slate-400 pb-3">Avg Time (ms)</th>
                      <th className="text-right text-sm font-medium text-slate-400 pb-3">Max Time (ms)</th>
                      <th className="text-right text-sm font-medium text-slate-400 pb-3">Requests</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {slowestEndpoints.map((endpoint: any, index: number) => (
                      <tr key={index}>
                        <td className="py-3 text-white font-mono text-sm">{endpoint.endpoint}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            endpoint.method === 'GET' ? 'bg-blue-500/20 text-blue-300' :
                            endpoint.method === 'POST' ? 'bg-green-500/20 text-green-300' :
                            endpoint.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-300' :
                            endpoint.method === 'DELETE' ? 'bg-red-500/20 text-red-300' :
                            'bg-slate-500/20 text-slate-300'
                          }`}>
                            {endpoint.method}
                          </span>
                        </td>
                        <td className="py-3 text-right text-white">
                          {Math.round(endpoint.avg_response_time)}
                        </td>
                        <td className="py-3 text-right text-white">
                          {Math.round(endpoint.max_response_time)}
                        </td>
                        <td className="py-3 text-right text-slate-400">
                          {endpoint.request_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No data available</p>
            )}
          </div>

          {/* Status Code Distribution */}
          <div className="glass border border-white/10 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Gauge className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Status Code Distribution</h2>
            </div>

            {statusDistribution.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statusDistribution.map((status: any, index: number) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-2xl font-bold ${
                        status.status_code >= 200 && status.status_code < 300 ? 'text-green-400' :
                        status.status_code >= 300 && status.status_code < 400 ? 'text-blue-400' :
                        status.status_code >= 400 && status.status_code < 500 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {status.status_code}
                      </span>
                      <span className="text-slate-400 text-sm">{status.percentage}%</span>
                    </div>
                    <p className="text-white text-sm">{status.count} requests</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No data available</p>
            )}
          </div>

          {/* Rate Limiting Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Rate Limited Users */}
            <div className="glass border border-white/10 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Activity className="w-5 h-5 text-yellow-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Top Rate Limited</h2>
              </div>

              {topLimited.length > 0 ? (
                <div className="space-y-3">
                  {topLimited.slice(0, 5).map((item: any, index: number) => (
                    <div key={index} className="bg-white/5 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-white font-mono text-sm truncate flex-1">
                          {item.identifier}
                        </p>
                        <span className="text-yellow-400 font-bold ml-2">
                          {item.total_requests}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs">{item.endpoint}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No data available</p>
              )}
            </div>

            {/* Most Hit Endpoints */}
            <div className="glass border border-white/10 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Most Hit Endpoints</h2>
              </div>

              {topEndpoints.length > 0 ? (
                <div className="space-y-3">
                  {topEndpoints.slice(0, 5).map((item: any, index: number) => (
                    <div key={index} className="bg-white/5 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-white font-mono text-sm truncate flex-1">
                          {item.endpoint}
                        </p>
                        <span className="text-green-400 font-bold ml-2">
                          {item.total_requests}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs">{item.unique_users} unique users</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No data available</p>
              )}
            </div>
          </div>

          {/* Requests Per Hour Chart (Simple visualization) */}
          {requestsPerHour.length > 0 && (
            <div className="glass border border-white/10 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Clock className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Request Volume Over Time</h2>
              </div>

              <div className="space-y-2">
                {requestsPerHour.slice(-12).map((item: any, index: number) => {
                  const maxRequests = Math.max(...requestsPerHour.map((r: any) => r.request_count));
                  const width = (item.request_count / maxRequests) * 100;

                  return (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-slate-400 text-xs w-32 font-mono">
                        {item.hour}
                      </span>
                      <div className="flex-1 bg-white/5 rounded-full h-6 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-full flex items-center px-2 transition-all"
                          style={{ width: `${width}%` }}
                        >
                          <span className="text-white text-xs font-medium">
                            {item.request_count} ({Math.round(item.avg_response_time)}ms)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

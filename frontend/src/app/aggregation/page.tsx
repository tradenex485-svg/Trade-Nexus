'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { AuthGuard } from '@/components/auth/auth-guard';
import { aggregationApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GitMerge,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Network,
  Layers,
  BarChart3,
  ArrowRightLeft,
  Loader2,
} from 'lucide-react';

interface AggregationGroup {
  id: number;
  group_code: string;
  group_name: string;
  group_type: string;
  aggregation_method: string;
  member_count: number;
}

interface AggregatedPosition {
  id: number;
  group_code: string;
  group_name: string;
  group_type: string;
  total_position: number;
  total_contracts: number;
  applicable_limit: number;
  utilization_pct: number;
  component_count: number;
  status: string;
}

interface CommodityRelationship {
  id: number;
  commodity_a: string;
  commodity_a_name: string;
  commodity_b: string;
  commodity_b_name: string;
  relationship_type: string;
  correlation_coefficient: number;
  netting_allowed: number;
  exemption_eligible: number;
}

export default function AggregationPage() {
  const { token, _hasHydrated } = useAuthStore();
  const [groups, setGroups] = useState<AggregationGroup[]>([]);
  const [positions, setPositions] = useState<AggregatedPosition[]>([]);
  const [relationships, setRelationships] = useState<CommodityRelationship[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  useEffect(() => {
    if (!_hasHydrated || !token) {
      setLoading(false);
      return;
    }
    loadData();
  }, [token, _hasHydrated]);

  async function loadData() {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [groupsRes, positionsRes, statsRes] = await Promise.all([
        aggregationApi.getGroups(),
        aggregationApi.getPositions(),
        aggregationApi.getStats(),
      ]);

      if (groupsRes.success) setGroups(groupsRes.data);
      if (positionsRes.success) setPositions(positionsRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load aggregation data');
    } finally {
      setLoading(false);
    }
  }

  async function triggerCalculation() {
    if (!token) return;

    try {
      const response = await aggregationApi.calculate();

      if (response.success) {
        alert(`Successfully calculated ${response.data.positions_calculated} aggregated positions`);
        loadData();
      } else {
        alert('Failed to trigger calculation');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  async function recalculateLimits() {
    if (!token) return;

    try {
      setLoading(true);
      const response = await aggregationApi.calculate({ calculation_type: 'all' });

      if (response.success) {
        alert(`Successfully recalculated ${response.data.calculations_created} limit calculations with fixed logic!`);
        // Reload monitoring data
        window.location.href = '/monitoring';
      } else {
        alert('Failed to recalculate limits');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, string> = {
      'breached': 'bg-red-500/10 text-red-600 border-red-500/20',
      'warning': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      'caution': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      'normal': 'bg-green-500/10 text-green-600 border-green-500/20',
    };

    return (
      <Badge variant="outline" className={variants[status] || 'bg-gray-500/10 text-gray-600'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  }

  function getGroupIcon(groupType: string) {
    switch (groupType) {
      case 'product_family':
        return <Layers className="h-5 w-5 text-blue-400" />;
      case 'economic_equivalent':
        return <ArrowRightLeft className="h-5 w-5 text-purple-400" />;
      case 'spread':
        return <GitMerge className="h-5 w-5 text-green-400" />;
      default:
        return <Network className="h-5 w-5 text-slate-400" />;
    }
  }

  // Show loading during hydration or initial data fetch
  if (!_hasHydrated || loading) {
    return (
      <AuthGuard>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading aggregation data...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
            <GitMerge className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            Position Aggregation
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1">
            Cross-commodity position aggregation and economic equivalence
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button onClick={() => loadData()} variant="outline" size="sm" className="flex-1 sm:flex-none">
            <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button onClick={() => recalculateLimits()} variant="default" size="sm" className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none">
            <TrendingUp className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Recalculate Limits</span>
            <span className="sm:hidden">Limits</span>
          </Button>
          <Button onClick={() => triggerCalculation()} variant="default" size="sm" className="flex-1 sm:flex-none">
            <BarChart3 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Calculate</span>
            <span className="sm:hidden">Calc</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Layers className="h-5 w-5 text-blue-400" />
              <div className="text-2xl font-bold text-white">
                {stats?.total_groups || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Aggregation Groups</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Network className="h-5 w-5 text-purple-400" />
              <div className="text-2xl font-bold text-white">
                {stats?.total_commodities || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Commodities Tracked</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <GitMerge className="h-5 w-5 text-green-400" />
              <div className="text-2xl font-bold text-white">
                {stats?.total_relationships || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Relationships</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="text-2xl font-bold text-red-400">
                {stats?.breached_aggregations || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Breached Aggregations</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="positions">Aggregated Positions</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white">Aggregated Positions</CardTitle>
              <CardDescription>Combined positions across commodity groups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Group</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Type</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">Position</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">Contracts</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">Components</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">Utilization</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos) => (
                      <tr key={pos.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getGroupIcon(pos.group_type)}
                            <div>
                              <div className="text-white font-medium">{pos.group_name}</div>
                              <div className="text-xs text-slate-400">{pos.group_code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                            {pos.group_type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-white font-mono font-semibold">
                          {pos.total_position.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {pos.total_contracts.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {pos.component_count}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Badge className={
                            pos.utilization_pct >= 100 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            pos.utilization_pct >= 85 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            pos.utilization_pct >= 75 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                            'bg-green-500/20 text-green-400 border-green-500/30'
                          }>
                            {pos.utilization_pct?.toFixed(1) || '0.0'}%
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(pos.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {positions.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Network className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No aggregated positions found</p>
                    <Button onClick={() => triggerCalculation()} variant="outline" size="sm" className="mt-4">
                      Calculate Aggregations
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Card key={group.id} className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/30 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    {getGroupIcon(group.group_type)}
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                      {group.member_count} members
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-white">{group.group_name}</CardTitle>
                  <CardDescription className="text-slate-400">{group.group_code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Type:</span>
                      <span className="text-white font-medium">
                        {group.group_type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Method:</span>
                      <span className="text-white font-medium">
                        {group.aggregation_method.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {groups.length === 0 && (
            <Card className="border-slate-700 bg-slate-800/50">
              <CardContent className="text-center py-12 text-slate-400">
                <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No aggregation groups configured</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </AuthGuard>
  );
}

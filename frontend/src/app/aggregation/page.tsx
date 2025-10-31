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
  ChevronDown,
  ChevronUp,
  Calculator,
  Percent,
} from 'lucide-react';

interface AggregationGroup {
  id: number;
  group_code: string;
  group_name: string;
  group_type: string;
  aggregation_method: string;
  member_count: number;
}

interface GroupMember {
  id: number;
  commodity_code: string;
  conversion_factor: number;
  conversion_unit: string;
  weight: number;
  is_primary: number;
  contract_name: string | null;
  spot_month_limit: number | null;
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
  conversion_ratio: number | null;
  netting_allowed: number;
  exemption_eligible: number;
  description: string;
}

export default function AggregationPage() {
  const { token, _hasHydrated } = useAuthStore();
  const [groups, setGroups] = useState<AggregationGroup[]>([]);
  const [positions, setPositions] = useState<AggregatedPosition[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Group members state
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [groupMembers, setGroupMembers] = useState<Record<number, GroupMember[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<number | null>(null);

  // Relationships state
  const [selectedCommodity, setSelectedCommodity] = useState<string>('');
  const [relationships, setRelationships] = useState<CommodityRelationship[]>([]);
  const [loadingRelationships, setLoadingRelationships] = useState(false);

  // Equivalence calculator state
  const [eqCommodityA, setEqCommodityA] = useState('');
  const [eqCommodityB, setEqCommodityB] = useState('');
  const [eqPositionA, setEqPositionA] = useState('');
  const [eqResult, setEqResult] = useState<any>(null);
  const [calculatingEq, setCalculatingEq] = useState(false);

  // Spread netting state
  const [snCommodityA, setSnCommodityA] = useState('');
  const [snCommodityB, setSnCommodityB] = useState('');
  const [snPositionA, setSnPositionA] = useState('');
  const [snPositionB, setSnPositionB] = useState('');
  const [snResult, setSnResult] = useState<any>(null);
  const [calculatingSn, setCalculatingSn] = useState(false);

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

  async function loadGroupMembers(groupId: number) {
    if (groupMembers[groupId]) {
      // Already loaded, just toggle
      setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
      return;
    }

    setLoadingMembers(groupId);
    try {
      const response = await aggregationApi.getGroupMembers(groupId);
      if (response.success) {
        setGroupMembers(prev => ({ ...prev, [groupId]: response.data }));
        setExpandedGroupId(groupId);
      }
    } catch (err: any) {
      alert('Error loading members: ' + err.message);
    } finally {
      setLoadingMembers(null);
    }
  }

  async function loadRelationships(commodityCode: string) {
    if (!commodityCode.trim()) return;

    setLoadingRelationships(true);
    try {
      const response = await aggregationApi.getCommodityRelationships(commodityCode);
      if (response.success) {
        setRelationships(response.data);
      }
    } catch (err: any) {
      alert('Error loading relationships: ' + err.message);
    } finally {
      setLoadingRelationships(false);
    }
  }

  async function calculateEquivalence() {
    if (!eqCommodityA || !eqCommodityB || !eqPositionA) {
      alert('Please fill in all fields');
      return;
    }

    setCalculatingEq(true);
    try {
      const response = await aggregationApi.calculateEquivalence(
        eqCommodityA.toUpperCase(),
        eqCommodityB.toUpperCase(),
        parseFloat(eqPositionA)
      );
      if (response.success) {
        setEqResult(response.data);
      }
    } catch (err: any) {
      alert('Error calculating equivalence: ' + err.message);
    } finally {
      setCalculatingEq(false);
    }
  }

  async function checkSpreadNetting() {
    if (!snCommodityA || !snCommodityB || !snPositionA || !snPositionB) {
      alert('Please fill in all fields');
      return;
    }

    setCalculatingSn(true);
    try {
      const response = await aggregationApi.checkSpreadNetting(
        snCommodityA.toUpperCase(),
        snCommodityB.toUpperCase(),
        parseFloat(snPositionA),
        parseFloat(snPositionB)
      );
      if (response.success) {
        setSnResult(response.data);
      }
    } catch (err: any) {
      alert('Error checking spread netting: ' + err.message);
    } finally {
      setCalculatingSn(false);
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
        alert(`Successfully recalculated ${response.data.calculations_created} limit calculations!`);
        loadData();
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

  function getRelationshipBadge(type: string) {
    const variants: Record<string, string> = {
      'spread': 'bg-green-500/10 text-green-400 border-green-500/20',
      'substitute': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'hedge': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'correlated': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    };

    return (
      <Badge variant="outline" className={variants[type] || 'bg-slate-500/10 text-slate-400'}>
        {type}
      </Badge>
    );
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
        <TabsList className="bg-slate-800 border-slate-700 flex-wrap h-auto">
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        {/* Positions Tab */}
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

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {groups.map((group) => (
              <Card key={group.id} className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getGroupIcon(group.group_type)}
                      <div>
                        <CardTitle className="text-lg text-white">{group.group_name}</CardTitle>
                        <CardDescription className="text-slate-400">{group.group_code}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                        {group.member_count} members
                      </Badge>
                      <Button
                        onClick={() => loadGroupMembers(group.id)}
                        variant="outline"
                        size="sm"
                        disabled={loadingMembers === group.id}
                      >
                        {loadingMembers === group.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : expandedGroupId === group.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
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

                    {/* Group Members Expandable Section */}
                    {expandedGroupId === group.id && groupMembers[group.id] && (
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <h4 className="text-sm font-semibold text-slate-300 mb-3">Group Members</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-700">
                                <th className="text-left py-2 px-3 text-slate-400 font-medium">Commodity</th>
                                <th className="text-right py-2 px-3 text-slate-400 font-medium">Conversion</th>
                                <th className="text-right py-2 px-3 text-slate-400 font-medium">Weight</th>
                                <th className="text-center py-2 px-3 text-slate-400 font-medium">Primary</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupMembers[group.id].map((member) => (
                                <tr key={member.id} className="border-b border-slate-700/50">
                                  <td className="py-2 px-3 text-white font-mono font-semibold">
                                    {member.commodity_code}
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-300">
                                    {member.conversion_factor}x {member.conversion_unit || ''}
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-300">
                                    {member.weight}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {member.is_primary ? (
                                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                                        Primary
                                      </Badge>
                                    ) : (
                                      <span className="text-slate-500 text-xs">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
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

        {/* Relationships Tab */}
        <TabsContent value="relationships" className="space-y-4">
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white">Commodity Relationships</CardTitle>
              <CardDescription>View spreads, substitutes, hedges, and correlations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter commodity code (e.g., CL, NG, GC)"
                    value={selectedCommodity}
                    onChange={(e) => setSelectedCommodity(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={() => loadRelationships(selectedCommodity)}
                    disabled={loadingRelationships || !selectedCommodity}
                  >
                    {loadingRelationships ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Network className="h-4 w-4 mr-2" />
                        Search
                      </>
                    )}
                  </Button>
                </div>

                {relationships.length > 0 && (
                  <div className="space-y-3">
                    {relationships.map((rel) => (
                      <div key={rel.id} className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-white font-mono font-semibold">{rel.commodity_a}</span>
                            <ArrowRightLeft className="h-4 w-4 text-slate-500" />
                            <span className="text-white font-mono font-semibold">{rel.commodity_b}</span>
                          </div>
                          {getRelationshipBadge(rel.relationship_type)}
                        </div>
                        <p className="text-sm text-slate-400 mb-3">{rel.description}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          {rel.correlation_coefficient && (
                            <div>
                              <span className="text-slate-500">Correlation:</span>
                              <span className="text-white ml-2 font-semibold">
                                {(rel.correlation_coefficient * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                          {rel.conversion_ratio && (
                            <div>
                              <span className="text-slate-500">Conversion:</span>
                              <span className="text-white ml-2 font-semibold">{rel.conversion_ratio}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-500">Netting:</span>
                            <span className={`ml-2 font-semibold ${rel.netting_allowed ? 'text-green-400' : 'text-red-400'}`}>
                              {rel.netting_allowed ? 'Allowed' : 'Not Allowed'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Exemption:</span>
                            <span className={`ml-2 font-semibold ${rel.exemption_eligible ? 'text-green-400' : 'text-slate-400'}`}>
                              {rel.exemption_eligible ? 'Eligible' : 'Not Eligible'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {relationships.length === 0 && selectedCommodity && !loadingRelationships && (
                  <div className="text-center py-8 text-slate-400">
                    <Network className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No relationships found for {selectedCommodity}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Economic Equivalence Calculator */}
            <Card className="border-slate-700 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-400" />
                  Economic Equivalence Calculator
                </CardTitle>
                <CardDescription>Calculate equivalent positions between commodities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Commodity A</label>
                  <input
                    type="text"
                    placeholder="e.g., CL"
                    value={eqCommodityA}
                    onChange={(e) => setEqCommodityA(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Commodity B</label>
                  <input
                    type="text"
                    placeholder="e.g., RB"
                    value={eqCommodityB}
                    onChange={(e) => setEqCommodityB(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Position in A</label>
                  <input
                    type="number"
                    placeholder="e.g., 1000"
                    value={eqPositionA}
                    onChange={(e) => setEqPositionA(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  onClick={calculateEquivalence}
                  disabled={calculatingEq}
                  className="w-full"
                >
                  {calculatingEq ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-2" />
                  )}
                  Calculate
                </Button>

                {eqResult && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">Equivalent Position in {eqResult.commodity_b}</div>
                    <div className="text-2xl font-bold text-white mb-2">
                      {eqResult.position_b_equivalent.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-400">
                      Conversion Rate: {eqResult.conversion_rate.toFixed(4)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Spread Netting Checker */}
            <Card className="border-slate-700 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Percent className="h-5 w-5 text-green-400" />
                  Spread Netting Checker
                </CardTitle>
                <CardDescription>Check if positions qualify for spread netting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Commodity A</label>
                    <input
                      type="text"
                      placeholder="e.g., CL"
                      value={snCommodityA}
                      onChange={(e) => setSnCommodityA(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Position A</label>
                    <input
                      type="number"
                      placeholder="e.g., 1000"
                      value={snPositionA}
                      onChange={(e) => setSnPositionA(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Commodity B</label>
                    <input
                      type="text"
                      placeholder="e.g., RB"
                      value={snCommodityB}
                      onChange={(e) => setSnCommodityB(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Position B</label>
                    <input
                      type="number"
                      placeholder="e.g., -800"
                      value={snPositionB}
                      onChange={(e) => setSnPositionB(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <Button
                  onClick={checkSpreadNetting}
                  disabled={calculatingSn}
                  className="w-full"
                >
                  {calculatingSn ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Percent className="h-4 w-4 mr-2" />
                  )}
                  Check Netting
                </Button>

                {snResult && (
                  <div className={`p-4 border rounded-lg ${
                    snResult.eligible
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Netting Eligible</span>
                      <Badge variant="outline" className={
                        snResult.eligible
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }>
                        {snResult.eligible ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-400 mb-1">Netted Position</div>
                    <div className="text-2xl font-bold text-white mb-2">
                      {snResult.nettedPosition.toLocaleString()}
                    </div>
                    {snResult.relationship && (
                      <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-700">
                        {snResult.relationship.description}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </AuthGuard>
  );
}

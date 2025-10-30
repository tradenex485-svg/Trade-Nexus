'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth-store';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { riskThresholdsApi, preTradeApi, riskMetricsApi, riskScenariosApi } from '@/lib/api';
import {
  Shield,
  Settings,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Activity,
  Target,
  Zap,
  Play,
  LineChart,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  approved: '#22c55e',
  requires_approval: '#eab308',
  blocked: '#ef4444',
};

export default function RiskManagementPage() {
  const { token } = useAuthStore();
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    threshold_name: '',
    threshold_type: 'approved',
    min_utilization_pct: 0,
    max_utilization_pct: 0,
    description: '',
    is_active: true,
  });

  // Portfolio Risk state
  const [portfolioRisk, setPortfolioRisk] = useState<any>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  // Scenario Analysis state
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [runningScenario, setRunningScenario] = useState<number | null>(null);
  const [scenarioResults, setScenarioResults] = useState<Map<number, any>>(new Map());

  // Risk Trends state
  const [riskTrends, setRiskTrends] = useState<any>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [varHistory, setVarHistory] = useState<any[]>([]);

  useEffect(() => {
    // Wait for token before loading data
    if (!token) return;

    loadThresholds();
    loadStats();
    loadPortfolioRisk();
    loadScenarios();
    loadRiskTrends();
  }, [token]);

  const loadThresholds = async () => {
    setLoading(true);
    try {
      const response = await riskThresholdsApi.getAll();
      setThresholds(response.data || []);
    } catch (error) {
      console.error('Failed to load thresholds:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await preTradeApi.getStats(30);
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadPortfolioRisk = async () => {
    setRiskLoading(true);
    try {
      const response = await riskMetricsApi.getDashboard();
      setPortfolioRisk(response.dashboard);
    } catch (error) {
      console.error('Failed to load portfolio risk:', error);
    } finally {
      setRiskLoading(false);
    }
  };

  const loadScenarios = async () => {
    setScenarioLoading(true);
    try {
      const response = await riskScenariosApi.getAll();
      setScenarios(response.data || []);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setScenarioLoading(false);
    }
  };

  const runScenario = async (scenarioId: number) => {
    setRunningScenario(scenarioId);
    try {
      const response = await riskScenariosApi.run(scenarioId);
      const newResults = new Map(scenarioResults);
      newResults.set(scenarioId, response.result);
      setScenarioResults(newResults);
      alert('Scenario test completed successfully');
    } catch (error: any) {
      alert(`Failed to run scenario: ${error.message}`);
    } finally {
      setRunningScenario(null);
    }
  };

  const loadRiskTrends = async () => {
    setTrendsLoading(true);
    try {
      const [trendsResponse, historyResponse] = await Promise.all([
        riskMetricsApi.getTrends(),
        riskMetricsApi.getVaRHistory(30),
      ]);
      setRiskTrends(trendsResponse.trends);
      setVarHistory(historyResponse.history || []);
    } catch (error) {
      console.error('Failed to load risk trends:', error);
    } finally {
      setTrendsLoading(false);
    }
  };

  const handleCreateThreshold = async () => {
    if (
      !formData.threshold_name ||
      formData.min_utilization_pct < 0 ||
      formData.max_utilization_pct <= formData.min_utilization_pct
    ) {
      alert('Please fill in all fields correctly');
      return;
    }

    setLoading(true);
    try {
      await riskThresholdsApi.create(formData);
      alert('Threshold created successfully');
      setShowAddForm(false);
      resetForm();
      loadThresholds();
    } catch (error: any) {
      alert(`Failed to create threshold: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateThreshold = async () => {
    if (!editingThreshold) return;

    setLoading(true);
    try {
      await riskThresholdsApi.update(editingThreshold.id, formData);
      alert('Threshold updated successfully');
      setEditingThreshold(null);
      resetForm();
      loadThresholds();
    } catch (error: any) {
      alert(`Failed to update threshold: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteThreshold = async (id: number) => {
    if (!confirm('Are you sure you want to delete this threshold?')) return;

    setLoading(true);
    try {
      await riskThresholdsApi.delete(id);
      alert('Threshold deleted successfully');
      loadThresholds();
    } catch (error: any) {
      alert(`Failed to delete threshold: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (threshold: any) => {
    setEditingThreshold(threshold);
    setFormData({
      threshold_name: threshold.threshold_name,
      threshold_type: threshold.threshold_type,
      min_utilization_pct: threshold.min_utilization_pct,
      max_utilization_pct: threshold.max_utilization_pct,
      description: threshold.description || '',
      is_active: threshold.is_active === 1,
    });
  };

  const resetForm = () => {
    setFormData({
      threshold_name: '',
      threshold_type: 'approved',
      min_utilization_pct: 0,
      max_utilization_pct: 0,
      description: '',
      is_active: true,
    });
  };

  const validationData = stats
    ? [
        {
          name: 'Auto Approved',
          value: stats.auto_approved || 0,
          color: STATUS_COLORS.approved,
        },
        {
          name: 'Requires Approval',
          value: stats.requires_approval || 0,
          color: STATUS_COLORS.requires_approval,
        },
        {
          name: 'Blocked',
          value: stats.blocked || 0,
          color: STATUS_COLORS.blocked,
        },
      ]
    : [];

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
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                <Shield className="h-8 w-8 text-blue-500" />
                Risk Management
              </h1>
              <p className="text-slate-400">
                Configure risk thresholds and monitor validation statistics
              </p>
            </div>

            {/* Stats Overview */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Total Checks</p>
                        <p className="text-3xl font-bold text-white">
                          {stats.total_checks || 0}
                        </p>
                      </div>
                      <BarChart3 className="h-10 w-10 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Auto Approved</p>
                        <p className="text-3xl font-bold text-green-400">
                          {stats.auto_approved || 0}
                        </p>
                      </div>
                      <CheckCircle2 className="h-10 w-10 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Needs Approval</p>
                        <p className="text-3xl font-bold text-yellow-400">
                          {stats.requires_approval || 0}
                        </p>
                      </div>
                      <AlertTriangle className="h-10 w-10 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Blocked</p>
                        <p className="text-3xl font-bold text-red-400">
                          {stats.blocked || 0}
                        </p>
                      </div>
                      <XCircle className="h-10 w-10 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="stats" className="w-full">
              <TabsList className="bg-slate-800 border border-slate-700 mb-6">
                <TabsTrigger value="stats" className="data-[state=active]:bg-slate-700">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Statistics
                </TabsTrigger>
                <TabsTrigger value="thresholds" className="data-[state=active]:bg-slate-700">
                  <Settings className="h-4 w-4 mr-2" />
                  Thresholds
                </TabsTrigger>
                <TabsTrigger value="portfolio-risk" className="data-[state=active]:bg-slate-700">
                  <Activity className="h-4 w-4 mr-2" />
                  Portfolio Risk
                </TabsTrigger>
                <TabsTrigger value="scenarios" className="data-[state=active]:bg-slate-700">
                  <Zap className="h-4 w-4 mr-2" />
                  Scenario Analysis
                </TabsTrigger>
                <TabsTrigger value="trends" className="data-[state=active]:bg-slate-700">
                  <LineChart className="h-4 w-4 mr-2" />
                  Risk Trends
                </TabsTrigger>
              </TabsList>

              {/* Statistics Tab */}
              <TabsContent value="stats">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Validation Distribution Pie Chart */}
                  <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-white">Validation Distribution</CardTitle>
                      <CardDescription className="text-slate-400">
                        Last 30 days breakdown
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={validationData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {validationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Average Utilization */}
                  <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-white">Average Utilization</CardTitle>
                      <CardDescription className="text-slate-400">
                        Projected utilization metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center p-12">
                      <div className="text-center">
                        <p className="text-6xl font-bold text-blue-400">
                          {stats?.avg_projected_utilization
                            ? stats.avg_projected_utilization.toFixed(1)
                            : '0.0'}
                          %
                        </p>
                        <p className="text-slate-400 mt-2">Avg Projected Utilization</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Thresholds Configuration Tab */}
              <TabsContent value="thresholds">
                <div className="space-y-6">
                  {/* Add Button */}
                  {!showAddForm && !editingThreshold && (
                    <Button
                      onClick={() => setShowAddForm(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Threshold
                    </Button>
                  )}

                  {/* Add/Edit Form */}
                  {(showAddForm || editingThreshold) && (
                    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                      <CardHeader>
                        <CardTitle className="text-white">
                          {editingThreshold ? 'Edit Threshold' : 'Add New Threshold'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-slate-300">Threshold Name</Label>
                          <Input
                            value={formData.threshold_name}
                            onChange={(e) =>
                              setFormData({ ...formData, threshold_name: e.target.value })
                            }
                            placeholder="e.g., Auto Approve"
                            className="bg-slate-900 border-slate-700 text-white mt-2"
                          />
                        </div>

                        <div>
                          <Label className="text-slate-300">Threshold Type</Label>
                          <div className="flex gap-2 mt-2">
                            {[
                              { value: 'approved', label: 'Auto Approve', color: 'green' },
                              { value: 'requires_approval', label: 'Require Approval', color: 'yellow' },
                              { value: 'blocked', label: 'Block', color: 'red' },
                            ].map((type) => (
                              <Button
                                key={type.value}
                                variant={formData.threshold_type === type.value ? 'default' : 'outline'}
                                className={cn(
                                  'flex-1',
                                  formData.threshold_type === type.value
                                    ? `bg-${type.color}-600 text-white border-${type.color}-600`
                                    : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                                )}
                                onClick={() =>
                                  setFormData({ ...formData, threshold_type: type.value })
                                }
                              >
                                {type.label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-slate-300">Min Utilization %</Label>
                            <Input
                              type="number"
                              value={formData.min_utilization_pct}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  min_utilization_pct: parseFloat(e.target.value),
                                })
                              }
                              className="bg-slate-900 border-slate-700 text-white mt-2"
                            />
                          </div>
                          <div>
                            <Label className="text-slate-300">Max Utilization %</Label>
                            <Input
                              type="number"
                              value={formData.max_utilization_pct}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  max_utilization_pct: parseFloat(e.target.value),
                                })
                              }
                              className="bg-slate-900 border-slate-700 text-white mt-2"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-slate-300">Description (Optional)</Label>
                          <Input
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({ ...formData, description: e.target.value })
                            }
                            placeholder="Description..."
                            className="bg-slate-900 border-slate-700 text-white mt-2"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) =>
                              setFormData({ ...formData, is_active: e.target.checked })
                            }
                            className="rounded"
                          />
                          <Label className="text-slate-300">Active</Label>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={
                              editingThreshold ? handleUpdateThreshold : handleCreateThreshold
                            }
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : editingThreshold ? (
                              'Update'
                            ) : (
                              'Create'
                            )}
                          </Button>
                          <Button
                            onClick={() => {
                              setShowAddForm(false);
                              setEditingThreshold(null);
                              resetForm();
                            }}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Thresholds List */}
                  <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-white">Configured Thresholds</CardTitle>
                      <CardDescription className="text-slate-400">
                        Active risk threshold rules
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading && thresholds.length === 0 ? (
                        <div className="flex items-center justify-center p-12">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                      ) : thresholds.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">
                          No thresholds configured
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {thresholds.map((threshold) => (
                            <motion.div
                              key={threshold.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-slate-600 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-white font-semibold">
                                      {threshold.threshold_name}
                                    </h4>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        threshold.threshold_type === 'approved' &&
                                          'border-green-500 text-green-400',
                                        threshold.threshold_type === 'requires_approval' &&
                                          'border-yellow-500 text-yellow-400',
                                        threshold.threshold_type === 'blocked' &&
                                          'border-red-500 text-red-400'
                                      )}
                                    >
                                      {threshold.threshold_type.replace('_', ' ')}
                                    </Badge>
                                    {threshold.is_active === 0 && (
                                      <Badge
                                        variant="outline"
                                        className="border-slate-500 text-slate-400"
                                      >
                                        Inactive
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-400">
                                    {threshold.min_utilization_pct}% -{' '}
                                    {threshold.max_utilization_pct}% utilization
                                  </p>
                                  {threshold.description && (
                                    <p className="text-xs text-slate-500 mt-1">
                                      {threshold.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => startEdit(threshold)}
                                    variant="outline"
                                    size="sm"
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteThreshold(threshold.id)}
                                    variant="outline"
                                    size="sm"
                                    className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Portfolio Risk Tab */}
              <TabsContent value="portfolio-risk">
                {riskLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : portfolioRisk ? (
                  <div className="space-y-6">
                    {/* VaR Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Historical VaR */}
                      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-500" />
                            Historical VaR
                          </CardTitle>
                          <CardDescription className="text-slate-400">
                            Historical Simulation Method
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-slate-400 mb-1">95% Confidence</p>
                              <p className="text-3xl font-bold text-blue-400">
                                {portfolioRisk.var?.historical_95?.toFixed(2) || '0.00'}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-400 mb-1">99% Confidence</p>
                              <p className="text-2xl font-semibold text-blue-300">
                                {portfolioRisk.var?.historical_99?.toFixed(2) || '0.00'}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Parametric VaR */}
                      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Target className="h-5 w-5 text-green-500" />
                            Parametric VaR
                          </CardTitle>
                          <CardDescription className="text-slate-400">
                            Variance-Covariance Method
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-slate-400 mb-1">95% Confidence</p>
                              <p className="text-3xl font-bold text-green-400">
                                {portfolioRisk.var?.parametric_95?.toFixed(2) || '0.00'}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-400 mb-1">99% Confidence</p>
                              <p className="text-2xl font-semibold text-green-300">
                                {portfolioRisk.var?.parametric_99?.toFixed(2) || '0.00'}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Monte Carlo VaR */}
                      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Target className="h-5 w-5 text-purple-500" />
                            Monte Carlo VaR
                          </CardTitle>
                          <CardDescription className="text-slate-400">
                            Monte Carlo Simulation
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-slate-400 mb-1">95% Confidence</p>
                              <p className="text-3xl font-bold text-purple-400">
                                {portfolioRisk.var?.monte_carlo_95?.toFixed(2) || '0.00'}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-400 mb-1">99% Confidence</p>
                              <p className="text-2xl font-semibold text-purple-300">
                                {portfolioRisk.var?.monte_carlo_99?.toFixed(2) || '0.00'}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Concentration & Portfolio Metrics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Concentration Metrics */}
                      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="text-white">Concentration Risk</CardTitle>
                          <CardDescription className="text-slate-400">
                            Portfolio diversification metrics
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                              <span className="text-slate-300">Herfindahl Index</span>
                              <span className="text-xl font-bold text-white">
                                {portfolioRisk.concentration?.herfindahl_index?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                              <span className="text-slate-300">Top 5 Concentration</span>
                              <span className="text-xl font-bold text-white">
                                {portfolioRisk.concentration?.top_5_concentration_pct?.toFixed(2) || '0.00'}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                              <span className="text-slate-300">Top 10 Concentration</span>
                              <span className="text-xl font-bold text-white">
                                {portfolioRisk.concentration?.top_10_concentration_pct?.toFixed(2) || '0.00'}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                              <span className="text-slate-300">Largest Position</span>
                              <span className="text-xl font-bold text-white">
                                {portfolioRisk.concentration?.largest_position_pct?.toFixed(2) || '0.00'}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                              <span className="text-slate-300">Diversification Ratio</span>
                              <span className="text-xl font-bold text-white">
                                {portfolioRisk.concentration?.diversification_ratio?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Portfolio Overview */}
                      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="text-white">Portfolio Overview</CardTitle>
                          <CardDescription className="text-slate-400">
                            Current exposure and limit status
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                              <span className="text-slate-300">Total Exposure</span>
                              <span className="text-xl font-bold text-blue-400">
                                {portfolioRisk.portfolio?.total_exposure?.toLocaleString() || '0'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                              <span className="text-slate-300">Total Limit</span>
                              <span className="text-xl font-bold text-white">
                                {portfolioRisk.portfolio?.total_limit?.toLocaleString() || '0'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                              <span className="text-slate-300">Avg Utilization</span>
                              <span className="text-xl font-bold text-green-400">
                                {portfolioRisk.portfolio?.avg_utilization?.toFixed(2) || '0.00'}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                              <span className="text-slate-300">Total Positions</span>
                              <span className="text-xl font-bold text-white">
                                {portfolioRisk.portfolio?.total_positions || 0}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                              <span className="text-slate-300">Breached</span>
                              <span className="text-xl font-bold text-red-400">
                                {portfolioRisk.portfolio?.breached || 0}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                              <span className="text-slate-300">Near Breach</span>
                              <span className="text-xl font-bold text-yellow-400">
                                {portfolioRisk.portfolio?.near_breach || 0}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Concentration by Commodity */}
                    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                      <CardHeader>
                        <CardTitle className="text-white">Concentration by Commodity</CardTitle>
                        <CardDescription className="text-slate-400">
                          Top commodity exposures
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {portfolioRisk.concentration_breakdown?.by_commodity?.slice(0, 10).map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                              <span className="text-slate-300">{item.commodity}</span>
                              <span className="text-white font-semibold">{item.concentration_pct?.toFixed(2)}%</span>
                            </div>
                          )) || (
                            <p className="text-slate-400 text-center py-4">No data available</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                    <p className="text-slate-400">Failed to load portfolio risk data</p>
                    <Button
                      onClick={loadPortfolioRisk}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Scenario Analysis Tab */}
              <TabsContent value="scenarios">
                {scenarioLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : scenarios.length > 0 ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {scenarios.map((scenario) => {
                        const result = scenarioResults.get(scenario.id);
                        const getSeverityColor = (severity: string) => {
                          switch (severity) {
                            case 'low': return 'text-green-400 border-green-500';
                            case 'medium': return 'text-yellow-400 border-yellow-500';
                            case 'high': return 'text-orange-400 border-orange-500';
                            case 'extreme': return 'text-red-400 border-red-500';
                            default: return 'text-slate-400 border-slate-500';
                          }
                        };

                        return (
                          <Card key={scenario.id} className="border-slate-700 bg-slate-800/50 backdrop-blur">
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-white text-lg mb-2">
                                    {scenario.scenario_name}
                                  </CardTitle>
                                  <div className="flex gap-2 flex-wrap">
                                    <Badge
                                      variant="outline"
                                      className={getSeverityColor(scenario.severity)}
                                    >
                                      {scenario.severity}
                                    </Badge>
                                    {scenario.is_system_scenario === 1 && (
                                      <Badge variant="outline" className="text-blue-400 border-blue-500">
                                        System
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  onClick={() => runScenario(scenario.id)}
                                  disabled={runningScenario !== null}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  {runningScenario === scenario.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-slate-400 mb-4">
                                {scenario.description || 'No description available'}
                              </p>

                              {result && (
                                <div className="mt-4 p-4 bg-slate-900/50 rounded-lg space-y-3">
                                  <h4 className="text-white font-semibold text-sm mb-2">Test Results:</h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <p className="text-slate-400">Pre-Shock Utilization:</p>
                                      <p className="text-white font-semibold">
                                        {result.pre_shock?.avg_utilization?.toFixed(2) || '0.00'}%
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-slate-400">Post-Shock Utilization:</p>
                                      <p className="text-white font-semibold">
                                        {result.post_shock?.avg_utilization?.toFixed(2) || '0.00'}%
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-slate-400">Utilization Change:</p>
                                      <p className={cn(
                                        "font-semibold",
                                        (result.impact?.utilization_change_pct || 0) > 0 ? "text-red-400" : "text-green-400"
                                      )}>
                                        {(result.impact?.utilization_change_pct || 0) > 0 ? '+' : ''}{result.impact?.utilization_change_pct?.toFixed(2) || '0.00'}%
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-slate-400">Breached Positions:</p>
                                      <p className={cn(
                                        "font-semibold",
                                        (result.post_shock?.breached_positions || 0) > 0 ? "text-red-400" : "text-green-400"
                                      )}>
                                        {result.post_shock?.breached_positions || 0}
                                      </p>
                                    </div>
                                  </div>
                                  {result.impact?.worst_affected && result.impact.worst_affected.length > 0 && (
                                    <div>
                                      <p className="text-slate-400 text-xs mb-1">Most Affected:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {result.impact.worst_affected.slice(0, 3).map((item: any, idx: number) => (
                                          <Badge
                                            key={idx}
                                            variant="outline"
                                            className="text-xs text-orange-400 border-orange-500"
                                          >
                                            {item.commodity} ({item.impact})
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                    <p className="text-slate-400">No scenarios available</p>
                    <Button
                      onClick={loadScenarios}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Risk Trends Tab */}
              <TabsContent value="trends">
                {trendsLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : riskTrends ? (
                  <div className="space-y-6">
                    {/* Rolling Metrics Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="text-white text-lg">30-Day Average</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Avg VaR 95:</span>
                            <span className="text-white font-semibold">
                              {riskTrends.rolling_30d?.avg_var_95?.toFixed(2) || '0.00'}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Avg Utilization:</span>
                            <span className="text-white font-semibold">
                              {riskTrends.rolling_30d?.avg_utilization?.toFixed(2) || '0.00'}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Concentration:</span>
                            <span className="text-white font-semibold">
                              {riskTrends.rolling_30d?.avg_concentration?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="text-white text-lg">60-Day Average</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Avg VaR 95:</span>
                            <span className="text-white font-semibold">
                              {riskTrends.rolling_60d?.avg_var_95?.toFixed(2) || '0.00'}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Avg Utilization:</span>
                            <span className="text-white font-semibold">
                              {riskTrends.rolling_60d?.avg_utilization?.toFixed(2) || '0.00'}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Concentration:</span>
                            <span className="text-white font-semibold">
                              {riskTrends.rolling_60d?.avg_concentration?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="text-white text-lg">90-Day Average</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Avg VaR 95:</span>
                            <span className="text-white font-semibold">
                              {riskTrends.rolling_90d?.avg_var_95?.toFixed(2) || '0.00'}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Avg Utilization:</span>
                            <span className="text-white font-semibold">
                              {riskTrends.rolling_90d?.avg_utilization?.toFixed(2) || '0.00'}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Concentration:</span>
                            <span className="text-white font-semibold">
                              {riskTrends.rolling_90d?.avg_concentration?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* VaR Historical Chart */}
                    {varHistory.length > 0 && (
                      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="text-white">VaR History (30 Days)</CardTitle>
                          <CardDescription className="text-slate-400">
                            Historical and Parametric VaR at 95% confidence
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={350}>
                            <RechartsLineChart data={varHistory}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis
                                dataKey="as_of_date"
                                stroke="#94a3b8"
                                tick={{ fill: '#94a3b8' }}
                                tickFormatter={(value) => {
                                  const date = new Date(value);
                                  return `${date.getMonth() + 1}/${date.getDate()}`;
                                }}
                              />
                              <YAxis
                                stroke="#94a3b8"
                                tick={{ fill: '#94a3b8' }}
                                label={{ value: 'VaR %', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#1e293b',
                                  border: '1px solid #334155',
                                  borderRadius: '8px',
                                  color: '#fff',
                                }}
                              />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="var_95_historical"
                                stroke="#60a5fa"
                                strokeWidth={2}
                                name="Historical VaR 95%"
                                dot={{ r: 3 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="var_95_parametric"
                                stroke="#34d399"
                                strokeWidth={2}
                                name="Parametric VaR 95%"
                                dot={{ r: 3 }}
                              />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {/* Concentration & Utilization Trends */}
                    {varHistory.length > 0 && (
                      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="text-white">Concentration & Utilization Trends</CardTitle>
                          <CardDescription className="text-slate-400">
                            Portfolio concentration score and utilization over time
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={350}>
                            <RechartsLineChart data={varHistory}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis
                                dataKey="as_of_date"
                                stroke="#94a3b8"
                                tick={{ fill: '#94a3b8' }}
                                tickFormatter={(value) => {
                                  const date = new Date(value);
                                  return `${date.getMonth() + 1}/${date.getDate()}`;
                                }}
                              />
                              <YAxis
                                stroke="#94a3b8"
                                tick={{ fill: '#94a3b8' }}
                                label={{ value: 'Value', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#1e293b',
                                  border: '1px solid #334155',
                                  borderRadius: '8px',
                                  color: '#fff',
                                }}
                              />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="concentration_score"
                                stroke="#a78bfa"
                                strokeWidth={2}
                                name="Concentration Score"
                                dot={{ r: 3 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="portfolio_utilization_pct"
                                stroke="#fb923c"
                                strokeWidth={2}
                                name="Utilization %"
                                dot={{ r: 3 }}
                              />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {/* Current Metrics */}
                    {riskTrends.current && (
                      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="text-white">Latest Risk Snapshot</CardTitle>
                          <CardDescription className="text-slate-400">
                            Most recent risk metrics recorded: {new Date(riskTrends.current.as_of_date).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-900/50 rounded-lg">
                              <p className="text-slate-400 text-sm mb-1">Historical VaR 95%</p>
                              <p className="text-2xl font-bold text-blue-400">
                                {riskTrends.current.var_95_historical?.toFixed(2) || '0.00'}%
                              </p>
                            </div>
                            <div className="p-4 bg-slate-900/50 rounded-lg">
                              <p className="text-slate-400 text-sm mb-1">Parametric VaR 95%</p>
                              <p className="text-2xl font-bold text-green-400">
                                {riskTrends.current.var_95_parametric?.toFixed(2) || '0.00'}%
                              </p>
                            </div>
                            <div className="p-4 bg-slate-900/50 rounded-lg">
                              <p className="text-slate-400 text-sm mb-1">Concentration</p>
                              <p className="text-2xl font-bold text-purple-400">
                                {riskTrends.current.concentration_score?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                            <div className="p-4 bg-slate-900/50 rounded-lg">
                              <p className="text-slate-400 text-sm mb-1">Utilization</p>
                              <p className="text-2xl font-bold text-orange-400">
                                {riskTrends.current.portfolio_utilization_pct?.toFixed(2) || '0.00'}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                    <p className="text-slate-400">Failed to load risk trends</p>
                    <Button
                      onClick={loadRiskTrends}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
}

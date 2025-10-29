'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth-store';
import { dataQualityApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Database,
  Shield,
  FileText,
  Upload,
  RefreshCw,
  Loader2,
  Play,
  Eye,
  Check,
  X,
} from 'lucide-react';

interface DashboardData {
  latest_check: any;
  issues_by_severity: any[];
  issues_by_type: any[];
  quality_trend: any[];
  recent_checks: any[];
}

interface Stats {
  total_issues: number;
  open_issues: number;
  total_checks: number;
  avg_quality_score: number;
}

export default function DataQualityPage() {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // Filters
  const [issueFilter, setIssueFilter] = useState({ status: 'open', severity: '', issue_type: '' });

  useEffect(() => {
    // Wait for token before loading data
    if (!token) {
      setLoading(false);
      return;
    }

    loadData();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'issues') {
      loadIssues();
    } else if (activeTab === 'rules') {
      loadRules();
    } else if (activeTab === 'uploads') {
      loadUploads();
    } else if (activeTab === 'reconciliation') {
      loadReconciliations();
    }
  }, [activeTab, issueFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashboardRes, statsRes] = await Promise.all([
        dataQualityApi.getDashboard(),
        dataQualityApi.getStats(),
      ]);
      setDashboard(dashboardRes.dashboard);
      setStats(statsRes.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadIssues = async () => {
    try {
      const response = await dataQualityApi.getIssues({
        ...issueFilter,
        limit: 100,
      });
      setIssues(response.issues);
    } catch (err: any) {
      setError(err.message || 'Failed to load issues');
    }
  };

  const loadRules = async () => {
    try {
      const response = await dataQualityApi.getRules();
      setRules(response.rules);
    } catch (err: any) {
      setError(err.message || 'Failed to load rules');
    }
  };

  const loadUploads = async () => {
    try {
      const response = await dataQualityApi.getUploads({ limit: 50 });
      setUploads(response.uploads);
    } catch (err: any) {
      setError(err.message || 'Failed to load uploads');
    }
  };

  const loadReconciliations = async () => {
    try {
      const response = await dataQualityApi.getReconciliation(30);
      setReconciliations(response.reconciliations);
    } catch (err: any) {
      setError(err.message || 'Failed to load reconciliations');
    }
  };

  const runQualityChecks = async () => {
    try {
      setRunning(true);
      await dataQualityApi.runQualityChecks();
      await loadData();
      if (activeTab === 'issues') {
        await loadIssues();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run quality checks');
    } finally {
      setRunning(false);
    }
  };

  const resolveIssue = async (id: number) => {
    try {
      await dataQualityApi.updateIssue(id, { status: 'resolved' });
      await loadIssues();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve issue');
    }
  };

  const ignoreIssue = async (id: number) => {
    try {
      await dataQualityApi.updateIssue(id, { status: 'ignored' });
      await loadIssues();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to ignore issue');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-500 bg-green-500/10';
      case 'processing': return 'text-blue-500 bg-blue-500/10';
      case 'failed': return 'text-red-500 bg-red-500/10';
      case 'partial': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading data quality dashboard...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Data Quality & Validation</h1>
              <p className="text-slate-400">Monitor data quality metrics, issues, and validation rules</p>
            </div>
            <Button
              onClick={runQualityChecks}
              disabled={running}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Quality Checks
            </Button>
          </div>

          {error && (
            <Alert className="bg-red-900/20 border-red-500/50">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription className="text-slate-400">Quality Score</CardDescription>
                  <CardTitle className={`text-3xl ${getQualityScoreColor(stats.avg_quality_score || 0)}`}>
                    {(stats.avg_quality_score || 0).toFixed(1)}
                    <span className="text-sm text-slate-400 ml-1">/100</span>
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription className="text-slate-400">Open Issues</CardDescription>
                  <CardTitle className="text-3xl text-orange-400">
                    {stats.open_issues || 0}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription className="text-slate-400">Total Issues</CardDescription>
                  <CardTitle className="text-3xl text-white">
                    {stats.total_issues || 0}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription className="text-slate-400">Checks Run</CardDescription>
                  <CardTitle className="text-3xl text-white">
                    {stats.total_checks || 0}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-900/50 border border-slate-700 flex-wrap h-auto">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="rules">Quality Rules</TabsTrigger>
              <TabsTrigger value="uploads">File Uploads</TabsTrigger>
              <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              {dashboard?.latest_check && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Latest Quality Check</CardTitle>
                    <CardDescription className="text-slate-400">
                      {new Date(dashboard.latest_check.check_date).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-slate-400">Records Checked</p>
                        <p className="text-2xl font-bold text-white">{dashboard.latest_check.total_records}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Issues Found</p>
                        <p className="text-2xl font-bold text-orange-400">{dashboard.latest_check.issues_found}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Quality Score</p>
                        <p className={`text-2xl font-bold ${getQualityScoreColor(dashboard.latest_check.quality_score)}`}>
                          {dashboard.latest_check.quality_score?.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Duration</p>
                        <p className="text-2xl font-bold text-white">{dashboard.latest_check.check_duration_ms}ms</p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-slate-800/50 p-3 rounded">
                        <p className="text-xs text-slate-400">Completeness</p>
                        <p className="text-lg font-semibold text-white">{dashboard.latest_check.completeness_score?.toFixed(1)}%</p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded">
                        <p className="text-xs text-slate-400">Accuracy</p>
                        <p className="text-lg font-semibold text-white">{dashboard.latest_check.accuracy_score?.toFixed(1)}%</p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded">
                        <p className="text-xs text-slate-400">Consistency</p>
                        <p className="text-lg font-semibold text-white">{dashboard.latest_check.consistency_score?.toFixed(1)}%</p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded">
                        <p className="text-xs text-slate-400">Timeliness</p>
                        <p className="text-lg font-semibold text-white">{dashboard.latest_check.timeliness_score?.toFixed(1)}%</p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded">
                        <p className="text-xs text-slate-400">Uniqueness</p>
                        <p className="text-lg font-semibold text-white">{dashboard.latest_check.uniqueness_score?.toFixed(1)}%</p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded">
                        <p className="text-xs text-slate-400">Integrity</p>
                        <p className="text-lg font-semibold text-white">{dashboard.latest_check.integrity_score?.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Issues by Severity */}
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Issues by Severity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard?.issues_by_severity?.map((item: any) => (
                        <div key={item.severity} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(item.severity)}>
                              {item.severity}
                            </Badge>
                          </div>
                          <span className="text-2xl font-bold text-white">{item.count}</span>
                        </div>
                      ))}
                      {(!dashboard?.issues_by_severity || dashboard.issues_by_severity.length === 0) && (
                        <p className="text-slate-400 text-center py-4">No issues found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Issues by Type */}
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Issues by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard?.issues_by_type?.map((item: any) => (
                        <div key={item.issue_type} className="flex items-center justify-between">
                          <span className="text-slate-300">{item.issue_type}</span>
                          <span className="text-xl font-bold text-white">{item.count}</span>
                        </div>
                      ))}
                      {(!dashboard?.issues_by_type || dashboard.issues_by_type.length === 0) && (
                        <p className="text-slate-400 text-center py-4">No issues found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Issues Tab */}
            <TabsContent value="issues" className="space-y-6">
              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-white">Data Quality Issues</CardTitle>
                      <CardDescription className="text-slate-400">
                        {issues.length} issue{issues.length !== 1 ? 's' : ''} found
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={issueFilter.status}
                        onChange={(e) => setIssueFilter({ ...issueFilter, status: e.target.value })}
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                      >
                        <option value="">All Status</option>
                        <option value="open">Open</option>
                        <option value="resolved">Resolved</option>
                        <option value="ignored">Ignored</option>
                      </select>
                      <select
                        value={issueFilter.severity}
                        onChange={(e) => setIssueFilter({ ...issueFilter, severity: e.target.value })}
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                      >
                        <option value="">All Severity</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {issues.map((issue) => (
                      <div
                        key={issue.id}
                        className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getSeverityColor(issue.severity)}>
                                {issue.severity}
                              </Badge>
                              <Badge variant="outline" className="text-slate-300">
                                {issue.issue_type}
                              </Badge>
                              <span className="text-xs text-slate-400">{issue.table_name}</span>
                            </div>
                            <p className="text-white mb-1">{issue.issue_description}</p>
                            {issue.current_value && (
                              <p className="text-sm text-slate-400">Value: {issue.current_value}</p>
                            )}
                            {issue.suggested_fix && (
                              <p className="text-sm text-blue-400">Suggested: {issue.suggested_fix}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-2">
                              {new Date(issue.created_at).toLocaleString()}
                            </p>
                          </div>
                          {issue.status === 'open' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveIssue(issue.id)}
                                className="bg-green-900/20 border-green-500/30 hover:bg-green-900/30 text-green-400"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Resolve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => ignoreIssue(issue.id)}
                                className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Ignore
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {issues.length === 0 && (
                      <div className="text-center py-12">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <p className="text-white font-semibold mb-1">No Issues Found</p>
                        <p className="text-slate-400 text-sm">All data quality checks passed</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rules Tab */}
            <TabsContent value="rules" className="space-y-6">
              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Quality Validation Rules</CardTitle>
                  <CardDescription className="text-slate-400">
                    {rules.length} rule{rules.length !== 1 ? 's' : ''} configured
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="bg-slate-800/50 p-4 rounded-lg border border-slate-700"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-white font-semibold">{rule.rule_name}</h3>
                              <Badge className={getSeverityColor(rule.severity)}>
                                {rule.severity}
                              </Badge>
                              {rule.is_active ? (
                                <Badge className="bg-green-500/10 text-green-400 border-green-500/30">Active</Badge>
                              ) : (
                                <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/30">Inactive</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mb-2">{rule.description}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                              <span>Type: {rule.rule_type}</span>
                              <span>•</span>
                              <span>Table: {rule.target_table}</span>
                              {rule.target_field && (
                                <>
                                  <span>•</span>
                                  <span>Field: {rule.target_field}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {rules.length === 0 && (
                      <p className="text-slate-400 text-center py-8">No rules configured</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Uploads Tab */}
            <TabsContent value="uploads" className="space-y-6">
              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">File Upload History</CardTitle>
                  <CardDescription className="text-slate-400">
                    {uploads.length} upload{uploads.length !== 1 ? 's' : ''} tracked
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {uploads.map((upload) => (
                      <div
                        key={upload.id}
                        className="bg-slate-800/50 p-4 rounded-lg border border-slate-700"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4 text-slate-400" />
                              <h3 className="text-white font-semibold">{upload.file_name}</h3>
                              <Badge className={getStatusColor(upload.upload_status)}>
                                {upload.upload_status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                              <div>
                                <p className="text-xs text-slate-400">Total Rows</p>
                                <p className="text-sm font-semibold text-white">{upload.total_rows || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">Valid</p>
                                <p className="text-sm font-semibold text-green-400">{upload.valid_rows || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">Invalid</p>
                                <p className="text-sm font-semibold text-red-400">{upload.invalid_rows || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">Time</p>
                                <p className="text-sm font-semibold text-white">{upload.processing_time_ms}ms</p>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                              {new Date(upload.created_at).toLocaleString()} → {upload.target_table}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {uploads.length === 0 && (
                      <p className="text-slate-400 text-center py-8">No file uploads yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reconciliation Tab */}
            <TabsContent value="reconciliation" className="space-y-6">
              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Data Reconciliation History</CardTitle>
                  <CardDescription className="text-slate-400">
                    {reconciliations.length} reconciliation{reconciliations.length !== 1 ? 's' : ''} performed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reconciliations.map((recon) => (
                      <div
                        key={recon.id}
                        className="bg-slate-800/50 p-4 rounded-lg border border-slate-700"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-white font-semibold">
                              {recon.source_table} ↔ {recon.target_table}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Key: {recon.reconciliation_key}</p>
                          </div>
                          <Badge className={getStatusColor(recon.status)}>
                            {recon.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div>
                            <p className="text-xs text-slate-400">Source Count</p>
                            <p className="text-lg font-semibold text-white">{recon.source_count}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Target Count</p>
                            <p className="text-lg font-semibold text-white">{recon.target_count}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Matched</p>
                            <p className="text-lg font-semibold text-green-400">{recon.matched_count}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Unmatched Src</p>
                            <p className="text-lg font-semibold text-orange-400">{recon.unmatched_source}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Unmatched Tgt</p>
                            <p className="text-lg font-semibold text-red-400">{recon.unmatched_target}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                          {new Date(recon.reconciliation_date).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    {reconciliations.length === 0 && (
                      <p className="text-slate-400 text-center py-8">No reconciliations performed yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
}

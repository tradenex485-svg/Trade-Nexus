'use client';

import { useState, useEffect, useRef } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth-store';
import { dataQualityApi, csvImportApi } from '@/lib/api';
import { mappingApi, type Mapping, type CreateMappingPayload } from '@/lib/api/mapping.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  MapPin,
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
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

  // CSV Import state
  const [importType, setImportType] = useState<'transactions' | 'power-data'>('transactions');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [issueFilter, setIssueFilter] = useState({ status: 'open', severity: '', issue_type: '' });

  // Mapping state
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [filteredMappings, setFilteredMappings] = useState<Mapping[]>([]);
  const [mappingSearchTerm, setMappingSearchTerm] = useState('');
  const [mappingViewMode, setMappingViewMode] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<Mapping | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateMappingPayload>({
    contract_name: '',
    market_location: '',
    commodity_code: '',
    unit_of_trading: '',
    aggregate_1_positive_correlation: '',
    aggregate_2_negative_correlation: '',
  });

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
    } else if (activeTab === 'mapping') {
      loadMappings();
    }
  }, [activeTab, issueFilter]);

  useEffect(() => {
    filterMappings();
  }, [mappingSearchTerm, mappings]);

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

  const loadMappings = async () => {
    try {
      const response = await mappingApi.getAll();
      setMappings(response.data);
      setFilteredMappings(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load mappings');
    }
  };

  const filterMappings = () => {
    if (!mappingSearchTerm) {
      setFilteredMappings(mappings);
      return;
    }

    const term = mappingSearchTerm.toLowerCase();
    const filtered = mappings.filter(
      (mapping) =>
        mapping.contract_name.toLowerCase().includes(term) ||
        mapping.market_location.toLowerCase().includes(term) ||
        mapping.commodity_code.toLowerCase().includes(term)
    );
    setFilteredMappings(filtered);
  };

  const handleCreateMapping = async () => {
    try {
      setSaving(true);
      await mappingApi.create(formData);
      await loadMappings();
      setIsCreateOpen(false);
      resetMappingForm();
    } catch (err: any) {
      setError(err.message || 'Failed to create mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMapping = async () => {
    if (!selectedMapping) return;

    try {
      setSaving(true);
      await mappingApi.update(selectedMapping.id, formData);
      await loadMappings();
      setIsEditOpen(false);
      resetMappingForm();
    } catch (err: any) {
      setError(err.message || 'Failed to update mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapping = async () => {
    if (!selectedMapping) return;

    try {
      setSaving(true);
      await mappingApi.delete(selectedMapping.id);
      await loadMappings();
      setIsDeleteOpen(false);
      setSelectedMapping(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete mapping');
    } finally {
      setSaving(false);
    }
  };

  const openCreateDialog = () => {
    resetMappingForm();
    setIsCreateOpen(true);
  };

  const openEditDialog = (mapping: Mapping) => {
    setSelectedMapping(mapping);
    setFormData({
      contract_name: mapping.contract_name,
      market_location: mapping.market_location,
      commodity_code: mapping.commodity_code,
      unit_of_trading: mapping.unit_of_trading || '',
      aggregate_1_positive_correlation: mapping.aggregate_1_positive_correlation || '',
      aggregate_2_negative_correlation: mapping.aggregate_2_negative_correlation || '',
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (mapping: Mapping) => {
    setSelectedMapping(mapping);
    setIsDeleteOpen(true);
  };

  const resetMappingForm = () => {
    setFormData({
      contract_name: '',
      market_location: '',
      commodity_code: '',
      unit_of_trading: '',
      aggregate_1_positive_correlation: '',
      aggregate_2_negative_correlation: '',
    });
    setSelectedMapping(null);
  };

  const groupByMarket = () => {
    const grouped: Record<string, Mapping[]> = {};
    filteredMappings.forEach((mapping) => {
      if (!grouped[mapping.market_location]) {
        grouped[mapping.market_location] = [];
      }
      grouped[mapping.market_location].push(mapping);
    });
    return grouped;
  };

  const groupByCommodity = () => {
    const grouped: Record<string, Mapping[]> = {};
    filteredMappings.forEach((mapping) => {
      if (!grouped[mapping.commodity_code]) {
        grouped[mapping.commodity_code] = [];
      }
      grouped[mapping.commodity_code].push(mapping);
    });
    return grouped;
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setSelectedFile(file);
      setImportSuccess(null);
      setError(null);
    }
  };

  const handleCsvImport = async () => {
    if (!selectedFile) {
      setError('Please select a file to import');
      return;
    }

    try {
      setImporting(true);
      setError(null);
      setImportSuccess(null);

      let result;
      if (importType === 'transactions') {
        result = await csvImportApi.importTransactions(selectedFile);
      } else {
        result = await csvImportApi.importPowerData(selectedFile);
      }

      setImportSuccess(result.message);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh uploads list
      if (activeTab === 'uploads') {
        await loadUploads();
      }

      // Switch to uploads tab to show result
      setActiveTab('uploads');
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
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
              <TabsTrigger value="csv-import">CSV Import</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="rules">Quality Rules</TabsTrigger>
              <TabsTrigger value="uploads">File Uploads</TabsTrigger>
              <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
              <TabsTrigger value="mapping">Mapping</TabsTrigger>
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

            {/* CSV Import Tab */}
            <TabsContent value="csv-import" className="space-y-6">
              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">CSV Data Import</CardTitle>
                  <CardDescription className="text-slate-400">
                    Import transaction or power data from CSV files
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Import Type Selection */}
                  <div>
                    <Label className="text-slate-300 mb-3 block">Select Import Type</Label>
                    <div className="flex gap-4">
                      <Button
                        variant={importType === 'transactions' ? 'default' : 'outline'}
                        onClick={() => setImportType('transactions')}
                        className={importType === 'transactions' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 border-slate-600'}
                      >
                        Transactions
                      </Button>
                      <Button
                        variant={importType === 'power-data' ? 'default' : 'outline'}
                        onClick={() => setImportType('power-data')}
                        className={importType === 'power-data' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 border-slate-600'}
                      >
                        Power Data
                      </Button>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div>
                    <Label htmlFor="csv-file" className="text-slate-300 mb-2 block">
                      Select CSV File
                    </Label>
                    <input
                      ref={fileInputRef}
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-slate-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-600 file:text-white
                        hover:file:bg-blue-700
                        file:cursor-pointer cursor-pointer"
                    />
                    {selectedFile && (
                      <p className="mt-2 text-sm text-green-400">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                  </div>

                  {/* Expected Format Info */}
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <h4 className="text-white font-semibold mb-2">
                      {importType === 'transactions' ? 'Transaction CSV Format' : 'Power Data CSV Format'}
                    </h4>
                    <p className="text-sm text-slate-400 mb-2">Required columns:</p>
                    {importType === 'transactions' ? (
                      <ul className="text-sm text-slate-300 space-y-1">
                        <li>• <strong>market_location</strong> (required)</li>
                        <li>• <strong>contract_month</strong> (required)</li>
                        <li>• <strong>base_delta_notnl_nd</strong> (required)</li>
                        <li>• <strong>trade_date</strong> (required)</li>
                        <li>• index_uom (optional)</li>
                        <li>• status (optional)</li>
                        <li>• frequency (optional)</li>
                        <li>• exchange (optional)</li>
                      </ul>
                    ) : (
                      <ul className="text-sm text-slate-300 space-y-1">
                        <li>• <strong>exchange_product_code</strong> (required)</li>
                        <li>• <strong>contract_month</strong> (required)</li>
                        <li>• net_position (optional)</li>
                        <li>• base_delta_notnl_nd (optional)</li>
                        <li>• base_delta_notnl (optional)</li>
                        <li>• product_description (optional)</li>
                        <li>• commodity (optional)</li>
                        <li>• index_uom (optional)</li>
                        <li>• trading_date (optional)</li>
                        <li>• status (optional)</li>
                        <li>• trans_type (optional)</li>
                      </ul>
                    )}
                  </div>

                  {/* Import Button */}
                  <Button
                    onClick={handleCsvImport}
                    disabled={!selectedFile || importing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import {importType === 'transactions' ? 'Transactions' : 'Power Data'}
                      </>
                    )}
                  </Button>

                  {/* Success/Error Messages */}
                  {importSuccess && (
                    <Alert className="bg-green-900/20 border-green-500/50">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-200">{importSuccess}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
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

            {/* Mapping Tab */}
            <TabsContent value="mapping" className="space-y-6">
              {/* Mapping Header with Actions */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Market Mapping</h2>
                  <p className="text-slate-400">Manage commodity code to market location mappings</p>
                </div>
                <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Mapping
                </Button>
              </div>

              {/* Mapping Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-slate-400">Total Mappings</CardDescription>
                    <CardTitle className="text-3xl text-white">{mappings.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-slate-400">Market Locations</CardDescription>
                    <CardTitle className="text-3xl text-white">
                      {new Set(mappings.map((m) => m.market_location)).size}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-slate-400">Commodity Codes</CardDescription>
                    <CardTitle className="text-3xl text-white">
                      {new Set(mappings.map((m) => m.commodity_code)).size}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Search */}
              <Card className="bg-slate-900/50 border-slate-700">
                <CardContent className="pt-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search by contract name, market location, or commodity code..."
                      value={mappingSearchTerm}
                      onChange={(e) => setMappingSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Mapping List with View Modes */}
              <Tabs value={mappingViewMode} onValueChange={setMappingViewMode} className="space-y-4">
                <TabsList className="bg-slate-900/50 border border-slate-700">
                  <TabsTrigger value="all">All Mappings</TabsTrigger>
                  <TabsTrigger value="by-market">By Market</TabsTrigger>
                  <TabsTrigger value="by-commodity">By Commodity</TabsTrigger>
                </TabsList>

                {/* All Mappings View */}
                <TabsContent value="all">
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">All Mappings</CardTitle>
                      <CardDescription className="text-slate-400">
                        {filteredMappings.length} mapping{filteredMappings.length !== 1 ? 's' : ''} found
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {filteredMappings.map((mapping) => (
                          <div
                            key={mapping.id}
                            className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                          >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h3 className="text-white font-semibold">{mapping.contract_name}</h3>
                                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {mapping.market_location}
                                  </Badge>
                                  <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                                    <Package className="h-3 w-3 mr-1" />
                                    {mapping.commodity_code}
                                  </Badge>
                                </div>
                                {mapping.unit_of_trading && (
                                  <p className="text-sm text-slate-400">Unit: {mapping.unit_of_trading}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(mapping)}
                                  className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDeleteDialog(mapping)}
                                  className="bg-red-900/20 border-red-500/30 hover:bg-red-900/30 text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredMappings.length === 0 && (
                          <div className="text-center py-12">
                            <MapPin className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-white font-semibold mb-1">No Mappings Found</p>
                            <p className="text-slate-400 text-sm">
                              {mappingSearchTerm ? 'Try a different search term' : 'Create your first mapping to get started'}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* By Market View */}
                <TabsContent value="by-market" className="space-y-4">
                  {Object.entries(groupByMarket()).map(([market, marketMappings]) => (
                    <Card key={market} className="bg-slate-900/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-blue-400" />
                          {market}
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          {marketMappings.length} mapping{marketMappings.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {marketMappings.map((mapping) => (
                            <div
                              key={mapping.id}
                              className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                            >
                              <div className="flex-1">
                                <p className="text-white font-medium">{mapping.contract_name}</p>
                                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 mt-1">
                                  {mapping.commodity_code}
                                </Badge>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(mapping)}
                                  className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDeleteDialog(mapping)}
                                  className="bg-red-900/20 border-red-500/30 hover:bg-red-900/30 text-red-400"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {Object.keys(groupByMarket()).length === 0 && (
                    <Card className="bg-slate-900/50 border-slate-700">
                      <CardContent className="py-12">
                        <div className="text-center">
                          <MapPin className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                          <p className="text-white font-semibold mb-1">No Markets Found</p>
                          <p className="text-slate-400 text-sm">
                            {mappingSearchTerm ? 'Try a different search term' : 'Create your first mapping to get started'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* By Commodity View */}
                <TabsContent value="by-commodity" className="space-y-4">
                  {Object.entries(groupByCommodity()).map(([commodity, commodityMappings]) => (
                    <Card key={commodity} className="bg-slate-900/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Package className="h-5 w-5 text-purple-400" />
                          {commodity}
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          {commodityMappings.length} mapping{commodityMappings.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {commodityMappings.map((mapping) => (
                            <div
                              key={mapping.id}
                              className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                            >
                              <div className="flex-1">
                                <p className="text-white font-medium">{mapping.contract_name}</p>
                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 mt-1">
                                  {mapping.market_location}
                                </Badge>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(mapping)}
                                  className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDeleteDialog(mapping)}
                                  className="bg-red-900/20 border-red-500/30 hover:bg-red-900/30 text-red-400"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {Object.keys(groupByCommodity()).length === 0 && (
                    <Card className="bg-slate-900/50 border-slate-700">
                      <CardContent className="py-12">
                        <div className="text-center">
                          <Package className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                          <p className="text-white font-semibold mb-1">No Commodities Found</p>
                          <p className="text-slate-400 text-sm">
                            {mappingSearchTerm ? 'Try a different search term' : 'Create your first mapping to get started'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Mapping Dialogs */}
      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Mapping</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a new market location to commodity code mapping
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contract_name">Contract Name *</Label>
              <Input
                id="contract_name"
                value={formData.contract_name}
                onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="market_location">Market Location *</Label>
              <Input
                id="market_location"
                value={formData.market_location}
                onChange={(e) => setFormData({ ...formData, market_location: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="commodity_code">Commodity Code *</Label>
              <Input
                id="commodity_code"
                value={formData.commodity_code}
                onChange={(e) => setFormData({ ...formData, commodity_code: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="unit_of_trading">Unit of Trading</Label>
              <Input
                id="unit_of_trading"
                value={formData.unit_of_trading}
                onChange={(e) => setFormData({ ...formData, unit_of_trading: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="bg-slate-800 border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleCreateMapping} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Mapping</DialogTitle>
            <DialogDescription className="text-slate-400">Update mapping details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_contract_name">Contract Name *</Label>
              <Input
                id="edit_contract_name"
                value={formData.contract_name}
                onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit_market_location">Market Location *</Label>
              <Input
                id="edit_market_location"
                value={formData.market_location}
                onChange={(e) => setFormData({ ...formData, market_location: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit_commodity_code">Commodity Code *</Label>
              <Input
                id="edit_commodity_code"
                value={formData.commodity_code}
                onChange={(e) => setFormData({ ...formData, commodity_code: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit_unit_of_trading">Unit of Trading</Label>
              <Input
                id="edit_unit_of_trading"
                value={formData.unit_of_trading}
                onChange={(e) => setFormData({ ...formData, unit_of_trading: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="bg-slate-800 border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleUpdateMapping} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Mapping</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this mapping? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedMapping && (
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <p className="text-white font-semibold">{selectedMapping.contract_name}</p>
              <p className="text-sm text-slate-400 mt-1">
                {selectedMapping.market_location} → {selectedMapping.commodity_code}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="bg-slate-800 border-slate-600">
              Cancel
            </Button>
            <Button
              onClick={handleDeleteMapping}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}

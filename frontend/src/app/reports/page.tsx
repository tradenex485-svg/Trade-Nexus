'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth-store';
import { reportsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SubsetReports } from '@/components/cftc/subset-reports';
import { AuditTrailViewer } from '@/components/cftc/audit-trail-viewer';
import { PreTradeValidator } from '@/components/cftc/pre-trade-validator';
import {
  FileText,
  Download,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Shield,
  CheckCircle,
  FileBarChart,
  Activity,
  Loader2,
} from 'lucide-react';

interface ReportSummary {
  total_positions?: number;
  breached?: number;
  remediate?: number;
  validate?: number;
  monitor?: number;
  avg_utilization?: number;
  compliance_score?: number;
  recent_breaches?: number;
  generated_at?: string;
}

const reportTypes = [
  {
    id: 'position',
    name: 'Position Report',
    description: 'Current position limits and utilization across all markets',
    icon: Activity,
    color: 'blue',
  },
  {
    id: 'compliance',
    name: 'Compliance Report',
    description: 'Compliance score, breaches, and exemptions analysis',
    icon: CheckCircle,
    color: 'green',
  },
  {
    id: 'breaches',
    name: 'Breach Analysis',
    description: 'Detailed analysis of limit breaches and patterns',
    icon: AlertTriangle,
    color: 'red',
  },
  {
    id: 'historical',
    name: 'Historical Trends',
    description: 'Time-series position data and trending analysis',
    icon: TrendingUp,
    color: 'purple',
  },
  {
    id: 'pre-trade',
    name: 'Pre-Trade Report',
    description: 'Pre-trade validation statistics and results',
    icon: Shield,
    color: 'orange',
  },
  {
    id: 'approvals',
    name: 'Approval Workflow',
    description: 'Trade approval metrics and workflow analysis',
    icon: FileBarChart,
    color: 'cyan',
  },
  {
    id: 'audit',
    name: 'Audit Trail',
    description: 'Complete system activity and change log',
    icon: FileText,
    color: 'slate',
  },
];

export default function ReportsPage() {
  const { token } = useAuthStore();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Custom report builder state
  const [selectedReport, setSelectedReport] = useState('position');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');

  useEffect(() => {
    // Wait for token before loading data
    if (!token) {
      setLoading(false);
      return;
    }

    loadSummary();
  }, [token]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsApi.getSummary();
      setSummary(response.summary);
    } catch (err: any) {
      setError(err.message || 'Failed to load report summary');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDownload = async (reportType: string, downloadFormat: 'csv' | 'json') => {
    try {
      setDownloading(reportType);
      const blob = await reportsApi.exportReport(reportType, downloadFormat, {
        start_date: startDate,
        end_date: endDate,
      });

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.${downloadFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to download report');
    } finally {
      setDownloading(null);
    }
  };

  const handleCustomReport = async () => {
    await handleQuickDownload(selectedReport, format);
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading reports...</p>
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
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Compliance Reports</h1>
            <p className="text-slate-400">Generate and download position limit reports</p>
          </div>

          {error && (
            <Alert className="bg-red-900/20 border-red-500/50">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription className="text-slate-400">Total Positions</CardDescription>
                  <CardTitle className="text-2xl text-white">
                    {summary.total_positions || 0}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription className="text-slate-400">Compliance Score</CardDescription>
                  <CardTitle className="text-2xl text-white">
                    {summary.compliance_score || 0}
                    <span className="text-sm text-slate-400 ml-1">/100</span>
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription className="text-slate-400">Breached</CardDescription>
                  <CardTitle className="text-2xl text-red-400">
                    {summary.breached || 0}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription className="text-slate-400">Avg Utilization</CardDescription>
                  <CardTitle className="text-2xl text-white">
                    {summary.avg_utilization?.toFixed(1) || 0}
                    <span className="text-sm text-slate-400 ml-1">%</span>
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          <Tabs defaultValue="quick" className="space-y-6">
            <TabsList className="bg-slate-900/50 border border-slate-700">
              <TabsTrigger value="quick">Quick Reports</TabsTrigger>
              <TabsTrigger value="custom">Custom Report Builder</TabsTrigger>
              <TabsTrigger value="cftc">CFTC Subset Reports</TabsTrigger>
              <TabsTrigger value="audit">Audit Trail</TabsTrigger>
              <TabsTrigger value="validation">Pre-Trade Validation</TabsTrigger>
            </TabsList>

            {/* Quick Reports Tab */}
            <TabsContent value="quick" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportTypes.map((report) => {
                  const Icon = report.icon;
                  const isDownloading = downloading === report.id;

                  return (
                    <Card
                      key={report.id}
                      className={`bg-slate-900/50 border-${report.color}-500/30 hover:border-${report.color}-500/50 transition-all`}
                    >
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-${report.color}-500/10`}>
                            <Icon className={`h-5 w-5 text-${report.color}-400`} />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-white text-lg">{report.name}</CardTitle>
                            <CardDescription className="text-slate-400 text-sm mt-1">
                              {report.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700"
                            onClick={() => handleQuickDownload(report.id, 'csv')}
                            disabled={isDownloading}
                          >
                            {isDownloading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            CSV
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700"
                            onClick={() => handleQuickDownload(report.id, 'json')}
                            disabled={isDownloading}
                          >
                            {isDownloading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            JSON
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Custom Report Builder Tab */}
            <TabsContent value="custom">
              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Custom Report Generator</CardTitle>
                  <CardDescription className="text-slate-400">
                    Configure date range and format for your report
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        Report Type
                      </label>
                      <select
                        value={selectedReport}
                        onChange={(e) => setSelectedReport(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      >
                        {reportTypes.map((report) => (
                          <option key={report.id} value={report.id}>
                            {report.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Export Format
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="format"
                          value="csv"
                          checked={format === 'csv'}
                          onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
                          className="text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-white">CSV</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="format"
                          value="json"
                          checked={format === 'json'}
                          onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
                          className="text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-white">JSON</span>
                      </label>
                    </div>
                  </div>

                  <Button
                    onClick={handleCustomReport}
                    disabled={!!downloading}
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {downloading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Generate & Download Report
                  </Button>

                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-sm text-slate-400">
                      <strong>Note:</strong> Reports include data from{' '}
                      <Badge variant="outline" className="text-slate-300">
                        {startDate}
                      </Badge>{' '}
                      to{' '}
                      <Badge variant="outline" className="text-slate-300">
                        {endDate}
                      </Badge>
                      . Adjust the date range above to customize your report period.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CFTC Subset Reports Tab */}
            <TabsContent value="cftc">
              <SubsetReports />
            </TabsContent>

            {/* Audit Trail Tab */}
            <TabsContent value="audit">
              <AuditTrailViewer />
            </TabsContent>

            {/* Pre-Trade Validation Tab */}
            <TabsContent value="validation">
              <PreTradeValidator />
            </TabsContent>
          </Tabs>

          {/* Additional Info */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Report Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-400">
              <p>
                <strong className="text-white">Position Report:</strong> Shows current positions
                vs limits with utilization percentages
              </p>
              <p>
                <strong className="text-white">Compliance Report:</strong> Includes compliance
                score calculation, breaches, and exemptions
              </p>
              <p>
                <strong className="text-white">Breach Analysis:</strong> Detailed breakdown of
                limit breaches with patterns and timelines
              </p>
              <p>
                <strong className="text-white">Historical Trends:</strong> Time-series position
                data showing utilization trends over time
              </p>
              <p>
                <strong className="text-white">Pre-Trade Report:</strong> Statistics on pre-trade
                validation checks and results
              </p>
              <p>
                <strong className="text-white">Approval Workflow:</strong> Metrics on trade
                approvals, rejections, and processing times
              </p>
              <p>
                <strong className="text-white">Audit Trail:</strong> Complete log of market limit
                changes and system activities
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { AuthGuard } from '@/components/auth/auth-guard';
import { filingsApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  FileCheck,
  Building2,
  Loader2,
} from 'lucide-react';

interface Filing {
  id: number;
  filing_type: string;
  filing_period: string;
  report_date: string;
  regulatory_body: string;
  exchange_name: string | null;
  status: string;
  submission_method: string | null;
  generated_at: string | null;
  submitted_at: string | null;
  acknowledged_at: string | null;
  confirmation_number: string | null;
  error_message: string | null;
  line_item_count: number;
  created_by_email: string | null;
}

interface FilingStats {
  filing_type: string;
  regulatory_body: string;
  total_filings: number;
  pending: number;
  generated: number;
  submitted: number;
  accepted: number;
  rejected: number;
  last_submission: string | null;
}

export default function FilingsPage() {
  const { token, _hasHydrated } = useAuthStore();
  const [filings, setFilings] = useState<Filing[]>([]);
  const [stats, setStats] = useState<FilingStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterBody, setFilterBody] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!_hasHydrated || !token) {
      setLoading(false);
      return;
    }
    loadData();
  }, [filterType, filterBody, filterStatus, token, _hasHydrated]);

  async function loadData() {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: any = {};
      if (filterType !== 'all') params.filing_type = filterType;
      if (filterBody !== 'all') params.regulatory_body = filterBody;
      if (filterStatus !== 'all') params.status = filterStatus;

      const [filingsRes, statsRes] = await Promise.all([
        filingsApi.getAll(params),
        filingsApi.getStats(),
      ]);

      if (filingsRes.success) {
        setFilings(filingsRes.data);
      }

      if (statsRes.success) {
        setStats(statsRes.data.by_type);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load filings');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(filingId: number, filingType: string, reportDate: string) {
    if (!token) return;

    try {
      const blob = await filingsApi.download(filingId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filingType}_${reportDate}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Failed to download filing: ' + err.message);
    }
  }

  async function handleSubmit(filingId: number) {
    if (!confirm('Are you sure you want to submit this filing to the regulatory body?')) {
      return;
    }

    if (!token) return;

    try {
      const response = await filingsApi.submit(filingId);

      if (response.success) {
        alert('Filing submitted successfully');
        loadData();
      } else {
        alert('Failed to submit filing');
      }
    } catch (err: any) {
      alert('Failed to submit filing: ' + err.message);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'submitted':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'generated':
        return <FileCheck className="h-4 w-4 text-purple-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, string> = {
      'pending': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      'generated': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'submitted': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'accepted': 'bg-green-500/10 text-green-600 border-green-500/20',
      'rejected': 'bg-red-500/10 text-red-600 border-red-500/20',
      'failed': 'bg-red-500/10 text-red-600 border-red-500/20',
    };

    return (
      <Badge variant="outline" className={variants[status] || 'bg-gray-500/10 text-gray-600'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  }

  function formatFilingType(type: string): string {
    const names: Record<string, string> = {
      'cftc_ltrs': 'CFTC LTRS',
      'ice_daily_position': 'ICE Daily Position',
      'cme_position_report': 'CME Position Report',
      'cftc_form_40': 'CFTC Form 40',
    };
    return names[type] || type;
  }

  // Show loading during hydration or initial data fetch
  if (!_hasHydrated || (loading && filings.length === 0)) {
    return (
      <AuthGuard>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading filings...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Regulatory Filings</h1>
          <p className="text-slate-400 mt-1">
            Automated regulatory submissions and compliance reporting
          </p>
        </div>
        <Button onClick={() => loadData()} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={`${stat.filing_type}-${stat.regulatory_body}`} className="border-slate-700 bg-slate-800/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Building2 className="h-5 w-5 text-blue-400" />
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                  {stat.regulatory_body}
                </Badge>
              </div>
              <CardTitle className="text-lg text-white mt-2">
                {formatFilingType(stat.filing_type)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-slate-400">Total</div>
                  <div className="text-white font-semibold">{stat.total_filings}</div>
                </div>
                <div>
                  <div className="text-slate-400">Submitted</div>
                  <div className="text-green-400 font-semibold">{stat.submitted}</div>
                </div>
                <div>
                  <div className="text-slate-400">Pending</div>
                  <div className="text-yellow-400 font-semibold">{stat.pending}</div>
                </div>
                <div>
                  <div className="text-slate-400">Accepted</div>
                  <div className="text-blue-400 font-semibold">{stat.accepted}</div>
                </div>
              </div>
              {stat.last_submission && (
                <div className="mt-3 text-xs text-slate-400">
                  Last: {new Date(stat.last_submission).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Filing Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="cftc_ltrs">CFTC LTRS</option>
                <option value="ice_daily_position">ICE Daily Position</option>
                <option value="cme_position_report">CME Position Report</option>
                <option value="cftc_form_40">CFTC Form 40</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Regulatory Body</label>
              <select
                value={filterBody}
                onChange={(e) => setFilterBody(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Bodies</option>
                <option value="CFTC">CFTC</option>
                <option value="ICE">ICE</option>
                <option value="CME">CME</option>
                <option value="NYMEX">NYMEX</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="generated">Generated</option>
                <option value="submitted">Submitted</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filings Table */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Recent Filings</CardTitle>
          <CardDescription>Last 50 regulatory submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Regulatory Body</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Report Date</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Positions</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Generated</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filings.map((filing) => (
                  <tr key={filing.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(filing.status)}
                        <span className="text-white font-medium">
                          {formatFilingType(filing.filing_type)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {filing.regulatory_body}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-white">
                      {new Date(filing.report_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(filing.status)}</td>
                    <td className="py-3 px-4 text-slate-300">{filing.line_item_count}</td>
                    <td className="py-3 px-4 text-slate-400 text-sm">
                      {filing.generated_at
                        ? new Date(filing.generated_at).toLocaleString()
                        : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {filing.status === 'generated' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSubmit(filing.id)}
                            className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Submit
                          </Button>
                        )}
                        {(filing.status === 'generated' || filing.status === 'submitted' || filing.status === 'accepted') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(filing.id, filing.filing_type, filing.report_date)}
                            className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filings.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No filings found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </AuthGuard>
  );
}

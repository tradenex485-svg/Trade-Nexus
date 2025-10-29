'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { AuthGuard } from '@/components/auth/auth-guard';
import { hedgeExemptionsApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Plus,
  Download,
  Eye,
  Loader2,
  History,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HedgeExemption {
  id: number;
  commodity_code: string;
  company_id: number;
  company_name: string;
  exemption_type: string;
  requested_amount: number;
  current_position: number;
  business_justification: string;
  status: string;
  requested_by: number;
  requested_by_name: string;
  requested_at: string;
  reviewed_by?: number;
  reviewed_by_name?: string;
  reviewed_at?: string;
  approval_notes?: string;
  effective_from?: string;
  effective_to?: string;
  supporting_documents?: string;
}

interface ExemptionStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  denied_requests: number;
  active_exemptions: number;
}

export default function ExemptionsPage() {
  const router = useRouter();
  const { user, token, _hasHydrated } = useAuthStore();
  const [exemptions, setExemptions] = useState<HedgeExemption[]>([]);
  const [stats, setStats] = useState<ExemptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedExemption, setSelectedExemption] = useState<HedgeExemption | null>(null);
  const hasApprovePermission = user?.permissions?.includes('exemptions.approve');

  useEffect(() => {
    if (!_hasHydrated || !token) {
      setLoading(false);
      return;
    }
    loadData();
  }, [filterStatus, token, _hasHydrated]);

  async function loadData() {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const statusParam = filterStatus !== 'all' ? filterStatus : undefined;

      const [exemptionsRes, statsRes] = await Promise.all([
        hedgeExemptionsApi.getAll(statusParam),
        hedgeExemptionsApi.getStats(),
      ]);

      if (exemptionsRes.success) setExemptions(exemptionsRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load exemptions');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(exemptionId: number) {
    const notes = prompt('Enter approval notes (optional):');

    if (!token) return;

    try {
      const response = await hedgeExemptionsApi.approve(exemptionId, notes || undefined);

      if (response.success) {
        alert('Exemption approved successfully');
        loadData();
      } else {
        alert('Failed to approve exemption');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  async function handleDeny(exemptionId: number) {
    const notes = prompt('Enter denial reason (required):');
    if (!notes) {
      alert('Denial reason is required');
      return;
    }

    if (!token) return;

    try {
      const response = await hedgeExemptionsApi.deny(exemptionId, notes);

      if (response.success) {
        alert('Exemption denied');
        loadData();
      } else {
        alert('Failed to deny exemption');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, string> = {
      'pending': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      'approved': 'bg-green-500/10 text-green-600 border-green-500/20',
      'denied': 'bg-red-500/10 text-red-600 border-red-500/20',
      'expired': 'bg-gray-500/10 text-gray-600 border-gray-500/20',
      'active': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    };

    const icons: Record<string, any> = {
      'pending': Clock,
      'approved': CheckCircle,
      'denied': XCircle,
      'expired': AlertCircle,
      'active': Shield,
    };

    const Icon = icons[status] || Clock;

    return (
      <Badge variant="outline" className={variants[status] || 'bg-gray-500/10 text-gray-600'}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  }

  function getExemptionTypeBadge(type: string) {
    const variants: Record<string, string> = {
      'hedge': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'bona_fide': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'financial_distress': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'spread': 'bg-green-500/10 text-green-400 border-green-500/20',
    };

    return (
      <Badge variant="outline" className={variants[type] || 'bg-gray-500/10 text-gray-400'}>
        {type.replace('_', ' ').toUpperCase()}
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
            <p className="text-slate-400">Loading exemptions...</p>
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
            <Shield className="h-8 w-8 text-blue-500" />
            Hedge Exemptions
          </h1>
          <p className="text-slate-400 mt-1">
            Request and manage regulatory position limit exemptions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => loadData()} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => router.push('/exemptions/request')} variant="default" size="sm">
            <Plus className="h-4 h-4 mr-2" />
            Request Exemption
          </Button>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cyber-border border-blue-500/30 hover:border-blue-500/50 transition-all cursor-pointer group"
          onClick={() => router.push('/exemptions/request')}
        >
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-blue-400">
              <Plus className="w-4 h-4" />
              Request New Exemption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Submit a new position limit exemption request for compliance review</p>
            <div className="mt-3 flex items-center text-xs text-blue-400 group-hover:text-blue-300">
              Go to request form
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </CardContent>
        </Card>

        {hasApprovePermission && (
          <Card
            className="cyber-border border-orange-500/30 hover:border-orange-500/50 transition-all cursor-pointer group"
            onClick={() => router.push('/exemptions/pending')}
          >
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-orange-400">
                <Clock className="w-4 h-4" />
                Pending Approvals
                {stats && stats.pending_requests > 0 && (
                  <Badge variant="outline" className="border-orange-500/50 text-orange-400 bg-orange-500/10 ml-auto">
                    {stats.pending_requests}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Review and approve or deny pending exemption requests</p>
              <div className="mt-3 flex items-center text-xs text-orange-400 group-hover:text-orange-300">
                Go to approval queue
                <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card
          className="cyber-border border-purple-500/30 hover:border-purple-500/50 transition-all cursor-pointer group"
          onClick={() => router.push('/exemptions/history')}
        >
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-purple-400">
              <History className="w-4 h-4" />
              History & Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">View complete history and audit trail of all exemption decisions</p>
            <div className="mt-3 flex items-center text-xs text-purple-400 group-hover:text-purple-300">
              Go to history
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-blue-400" />
              <div className="text-2xl font-bold text-white">
                {stats?.total_requests || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Total Requests</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-yellow-400" />
              <div className="text-2xl font-bold text-yellow-400">
                {stats?.pending_requests || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Pending Review</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="text-2xl font-bold text-green-400">
                {stats?.approved_requests || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Approved</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <XCircle className="h-5 w-5 text-red-400" />
              <div className="text-2xl font-bold text-red-400">
                {stats?.denied_requests || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Denied</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Shield className="h-5 w-5 text-purple-400" />
              <div className="text-2xl font-bold text-purple-400">
                {stats?.active_exemptions || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Active Exemptions</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exemptions Table */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Exemption Requests</CardTitle>
          <CardDescription>Review and manage hedge exemption requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">ID</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Commodity</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Company</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Type</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Requested By</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exemptions.map((ex) => (
                  <tr key={ex.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4 text-slate-300 font-mono">#{ex.id}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {ex.commodity_code}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-white">{ex.company_name}</td>
                    <td className="py-3 px-4">{getExemptionTypeBadge(ex.exemption_type)}</td>
                    <td className="py-3 px-4 text-right text-white font-mono font-semibold">
                      {ex.requested_amount.toLocaleString()} lots
                    </td>
                    <td className="py-3 px-4 text-slate-300">{ex.requested_by_name}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {new Date(ex.requested_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(ex.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setSelectedExemption(ex)}
                          variant="outline"
                          size="sm"
                          className="bg-slate-700/50 hover:bg-slate-700 border-slate-600"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {ex.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => handleApprove(ex.id)}
                              variant="outline"
                              size="sm"
                              className="bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-400"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleDeny(ex.id)}
                              variant="outline"
                              size="sm"
                              className="bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400"
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {exemptions.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No exemption requests found</p>
                <Button onClick={() => setShowRequestModal(true)} variant="outline" size="sm" className="mt-4">
                  Request New Exemption
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedExemption && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <Card className="border-slate-700 bg-slate-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Exemption Request #{selectedExemption.id}</CardTitle>
                <Button
                  onClick={() => setSelectedExemption(null)}
                  variant="outline"
                  size="sm"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-400">Commodity</div>
                  <div className="text-white font-medium">{selectedExemption.commodity_code}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Company</div>
                  <div className="text-white font-medium">{selectedExemption.company_name}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Exemption Type</div>
                  <div className="mt-1">{getExemptionTypeBadge(selectedExemption.exemption_type)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Status</div>
                  <div className="mt-1">{getStatusBadge(selectedExemption.status)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Requested Amount</div>
                  <div className="text-white font-mono font-semibold">
                    {selectedExemption.requested_amount.toLocaleString()} lots
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Current Position</div>
                  <div className="text-white font-mono">
                    {selectedExemption.current_position.toLocaleString()} lots
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-400 mb-2">Business Justification</div>
                <div className="bg-slate-700/50 rounded-lg p-4 text-white text-sm">
                  {selectedExemption.business_justification}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-400">Requested By</div>
                  <div className="text-white">{selectedExemption.requested_by_name}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(selectedExemption.requested_at).toLocaleString()}
                  </div>
                </div>
                {selectedExemption.reviewed_by && (
                  <div>
                    <div className="text-sm text-slate-400">Reviewed By</div>
                    <div className="text-white">{selectedExemption.reviewed_by_name}</div>
                    <div className="text-xs text-slate-500">
                      {selectedExemption.reviewed_at && new Date(selectedExemption.reviewed_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {selectedExemption.approval_notes && (
                <div>
                  <div className="text-sm text-slate-400 mb-2">Review Notes</div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-white text-sm">
                    {selectedExemption.approval_notes}
                  </div>
                </div>
              )}

              {selectedExemption.effective_from && selectedExemption.effective_to && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-400">Effective From</div>
                    <div className="text-white">
                      {new Date(selectedExemption.effective_from).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Effective To</div>
                    <div className="text-white">
                      {new Date(selectedExemption.effective_to).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}

              {selectedExemption.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-slate-700">
                  <Button
                    onClick={() => {
                      handleApprove(selectedExemption.id);
                      setSelectedExemption(null);
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      handleDeny(selectedExemption.id);
                      setSelectedExemption(null);
                    }}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Deny
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </AuthGuard>
  );
}

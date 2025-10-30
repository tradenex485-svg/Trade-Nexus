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
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HedgeExemption {
  id: number;
  commodity_code: string;
  company_id: number;
  company_name: string;
  exemption_type: string;
  position_size: number;
  requested_amount: number;
  current_position: number;
  business_justification: string;
  hedge_rationale: string;
  status: string;
  user_id: number;
  requested_by: number;
  requested_by_name: string;
  requested_at: string;
  submitted_at: string;
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
  const [success, setSuccess] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMyRequests, setFilterMyRequests] = useState(false);
  const [selectedExemption, setSelectedExemption] = useState<HedgeExemption | null>(null);

  // Modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDenialModal, setShowDenialModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'deny' | 'delete' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [approvalNotes, setApprovalNotes] = useState('');
  const [denialReason, setDenialReason] = useState('');

  const hasApprovePermission = user?.permissions?.includes('exemptions.approve');
  const hasDeletePermission = user?.permissions?.includes('exemptions.delete');

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

  function openApprovalModal(exemption: HedgeExemption) {
    setSelectedExemption(exemption);
    setApprovalNotes('');
    setShowApprovalModal(true);
  }

  function openDenialModal(exemption: HedgeExemption) {
    setSelectedExemption(exemption);
    setDenialReason('');
    setShowDenialModal(true);
  }

  function openDeleteModal(exemption: HedgeExemption) {
    setSelectedExemption(exemption);
    setShowDeleteModal(true);
  }

  async function handleApprove() {
    if (!selectedExemption || !token) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await hedgeExemptionsApi.approve(
        selectedExemption.id,
        approvalNotes || undefined
      );

      if (response.success) {
        setSuccess('Exemption approved successfully');
        setShowApprovalModal(false);
        setApprovalNotes('');
        setSelectedExemption(null);
        await loadData();
      } else {
        setError(response.message || 'Failed to approve exemption');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to approve exemption');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeny() {
    if (!selectedExemption || !denialReason.trim() || !token) {
      setError('Denial reason is required');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await hedgeExemptionsApi.deny(selectedExemption.id, denialReason);

      if (response.success) {
        setSuccess('Exemption denied');
        setShowDenialModal(false);
        setDenialReason('');
        setSelectedExemption(null);
        await loadData();
      } else {
        setError(response.message || 'Failed to deny exemption');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to deny exemption');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedExemption || !token) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await hedgeExemptionsApi.delete(selectedExemption.id);

      if (response.success) {
        setSuccess('Exemption request deleted successfully');
        setShowDeleteModal(false);
        setSelectedExemption(null);
        await loadData();
      } else {
        setError(response.message || 'Failed to delete exemption');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete exemption');
    } finally {
      setActionLoading(false);
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
      'bona_fide_hedge': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'financial_distress': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'spread': 'bg-green-500/10 text-green-400 border-green-500/20',
      'spread_exemption': 'bg-green-500/10 text-green-400 border-green-500/20',
      'risk_management': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      'swap_dealer': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    };

    return (
      <Badge variant="outline" className={variants[type] || 'bg-gray-500/10 text-gray-400'}>
        {type.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  }

  function canDeleteExemption(exemption: HedgeExemption): boolean {
    // Only allow deleting pending exemptions
    if (exemption.status !== 'pending') return false;

    // Super admin can delete any pending request
    if (user?.role_id === 5) return true;

    // Users can delete their own pending requests
    return exemption.user_id === user?.userId;
  }

  // Filter exemptions based on "My Requests" toggle
  const filteredExemptions = filterMyRequests
    ? exemptions.filter(ex => ex.user_id === user?.userId)
    : exemptions;

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
          <Button onClick={() => loadData()} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => router.push('/exemptions/request')} variant="default" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Request Exemption
          </Button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <AlertDescription className="text-green-400">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                View
              </label>
              <div className="flex items-center h-10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterMyRequests}
                    onChange={(e) => setFilterMyRequests(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700/50 text-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-white text-sm">Show only my requests</span>
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exemptions Table */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">
            Exemption Requests {filterMyRequests && '(My Requests)'}
          </CardTitle>
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
                {filteredExemptions.map((ex) => (
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
                      {(ex.position_size || ex.requested_amount).toLocaleString()} lots
                    </td>
                    <td className="py-3 px-4 text-slate-300">{ex.requested_by_name}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {new Date(ex.submitted_at || ex.requested_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(ex.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setSelectedExemption(ex)}
                          variant="outline"
                          size="sm"
                          className="bg-slate-700/50 hover:bg-slate-700 border-slate-600"
                          title="View details"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {ex.status === 'pending' && hasApprovePermission && (
                          <>
                            <Button
                              onClick={() => openApprovalModal(ex)}
                              variant="outline"
                              size="sm"
                              className="bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-400"
                              title="Approve"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => openDenialModal(ex)}
                              variant="outline"
                              size="sm"
                              className="bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400"
                              title="Deny"
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {canDeleteExemption(ex) && (
                          <Button
                            onClick={() => openDeleteModal(ex)}
                            variant="outline"
                            size="sm"
                            className="bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredExemptions.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>
                  {filterMyRequests
                    ? 'You have no exemption requests'
                    : 'No exemption requests found'}
                </p>
                <Button
                  onClick={() => router.push('/exemptions/request')}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  Request New Exemption
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedExemption && !showApprovalModal && !showDenialModal && !showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setSelectedExemption(null)}>
          <Card className="border-slate-700 bg-slate-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                    {(selectedExemption.position_size || selectedExemption.requested_amount).toLocaleString()} lots
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Current Position</div>
                  <div className="text-white font-mono">
                    {selectedExemption.current_position?.toLocaleString() || 0} lots
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-400 mb-2">Business Justification</div>
                <div className="bg-slate-700/50 rounded-lg p-4 text-white text-sm max-h-40 overflow-y-auto">
                  {selectedExemption.business_justification || selectedExemption.hedge_rationale}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-400">Requested By</div>
                  <div className="text-white">{selectedExemption.requested_by_name}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(selectedExemption.submitted_at || selectedExemption.requested_at).toLocaleString()}
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

              <div className="flex gap-3 pt-4 border-t border-slate-700">
                {selectedExemption.status === 'pending' && hasApprovePermission && (
                  <>
                    <Button
                      onClick={() => {
                        setShowApprovalModal(true);
                      }}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => {
                        setShowDenialModal(true);
                      }}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Deny
                    </Button>
                  </>
                )}
                {canDeleteExemption(selectedExemption) && (
                  <Button
                    onClick={() => {
                      setShowDeleteModal(true);
                    }}
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedExemption && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowApprovalModal(false);
            if (!showDeleteModal) setSelectedExemption(null);
          }
        }}>
          <Card className="w-full max-w-2xl border-green-500/30" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-green-400">Approve Exemption Request</CardTitle>
              <CardDescription>
                {selectedExemption.commodity_code} - {selectedExemption.company_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  rows={3}
                  className="w-full px-4 py-2.5 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
                />
              </div>

              <Alert className="border-blue-500/50 bg-blue-500/10">
                <AlertCircle className="h-5 w-5 text-blue-400" />
                <AlertDescription className="text-blue-400 text-sm">
                  This exemption will be approved with a validity period of 90 days from today
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Approval
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalNotes('');
                    if (!showDeleteModal) setSelectedExemption(null);
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Denial Modal */}
      {showDenialModal && selectedExemption && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowDenialModal(false);
            if (!showDeleteModal) setSelectedExemption(null);
          }
        }}>
          <Card className="w-full max-w-2xl border-red-500/30" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-red-400">Deny Exemption Request</CardTitle>
              <CardDescription>
                {selectedExemption.commodity_code} - {selectedExemption.company_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Denial Reason * (Required)
                </label>
                <textarea
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  placeholder="Provide a clear reason for denial..."
                  rows={4}
                  required
                  className="w-full px-4 py-2.5 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  This reason will be communicated to the requester
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  onClick={handleDeny}
                  disabled={actionLoading || !denialReason.trim()}
                  variant="destructive"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Denying...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Confirm Denial
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDenialModal(false);
                    setDenialReason('');
                    if (!showDeleteModal) setSelectedExemption(null);
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedExemption && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowDeleteModal(false);
            setSelectedExemption(null);
          }
        }}>
          <Card className="w-full max-w-md border-red-500/30" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-red-400">Delete Exemption Request</CardTitle>
              <CardDescription>
                Are you sure you want to delete this exemption request?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">ID:</span>
                  <span className="text-white font-mono">#{selectedExemption.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Commodity:</span>
                  <span className="text-white">{selectedExemption.commodity_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-white font-mono">
                    {(selectedExemption.position_size || selectedExemption.requested_amount).toLocaleString()} lots
                  </span>
                </div>
              </div>

              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-sm">
                  This action cannot be undone. The exemption request will be permanently deleted.
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  variant="destructive"
                  className="flex-1"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 w-4 mr-2" />
                      Delete Request
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedExemption(null);
                  }}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </AuthGuard>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { AuthGuard } from '@/components/auth/auth-guard';
import { hedgeExemptionsApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  FileText,
  RefreshCw,
  Loader2,
  User,
  Calendar,
  TrendingUp,
  Trash2,
} from 'lucide-react';

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
  user_id: number;
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

export default function PendingExemptionsPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [exemptions, setExemptions] = useState<HedgeExemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedExemption, setSelectedExemption] = useState<HedgeExemption | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDenialModal, setShowDenialModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');

  useEffect(() => {
    if (!token) return;
    loadPendingExemptions();

    // Set default dates (today to 90 days from now)
    const today = new Date();
    setEffectiveFrom(today.toISOString().split('T')[0]);
    const in90Days = new Date(today);
    in90Days.setDate(in90Days.getDate() + 90);
    setEffectiveTo(in90Days.toISOString().split('T')[0]);
  }, [token]);

  async function loadPendingExemptions() {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await hedgeExemptionsApi.getAll({ status: 'pending' } as any);

      if (response.success) {
        setExemptions(response.data || []);
      } else {
        setError('Failed to load pending exemptions');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pending exemptions');
    } finally {
      setLoading(false);
    }
  }

  function handleReviewClick(exemption: HedgeExemption, action: 'approve' | 'deny') {
    setSelectedExemption(exemption);
    if (action === 'approve') {
      setShowApprovalModal(true);
      setShowDenialModal(false);
    } else {
      setShowDenialModal(true);
      setShowApprovalModal(false);
    }
  }

  async function handleApprove() {
    if (!selectedExemption) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await hedgeExemptionsApi.approve(
        selectedExemption.id,
        approvalNotes || 'Approved by compliance team'
      );

      if (response.success) {
        setSuccess('Exemption approved successfully');
        setShowApprovalModal(false);
        setApprovalNotes('');
        setSelectedExemption(null);
        loadPendingExemptions();
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
    if (!selectedExemption || !denialReason.trim()) {
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
        loadPendingExemptions();
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
        await loadPendingExemptions();
      } else {
        setError(response.message || 'Failed to delete exemption');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete exemption');
    } finally {
      setActionLoading(false);
    }
  }

  function canDeleteExemption(exemption: HedgeExemption): boolean {
    // Only allow deleting pending exemptions
    if (exemption.status !== 'pending') return false;

    // Super admin can delete any pending request
    if (user?.role_name === 'super_admin') return true;

    // Users can delete their own pending requests
    return exemption.user_id === user?.id;
  }

  const getExemptionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'bona_fide_hedge': 'Bona Fide Hedge',
      'spread_exemption': 'Spread Exemption',
      'risk_management': 'Risk Management',
      'swap_dealer': 'Swap Dealer',
    };
    return labels[type] || type;
  };

  return (
    <AuthGuard requiredPermissions={['exemptions.approve']}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/exemptions')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Exemptions
          </Button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Pending Exemption Requests</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Review and approve or deny exemption requests from traders
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadPendingExemptions}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Success/Error Alerts */}
        {success && (
          <Alert className="mb-6 border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <AlertDescription className="text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Pending Count */}
        {!loading && (
          <div className="mb-6">
            <Badge variant="outline" className="border-orange-500/50 text-orange-400 bg-orange-500/10">
              {exemptions.length} Pending Request{exemptions.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        )}

        {/* Pending Exemptions List */}
        {!loading && exemptions.length === 0 && (
          <Card className="cyber-border border-slate-700">
            <CardContent className="py-12">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-slate-400">No pending exemption requests</p>
                <p className="text-slate-500 text-sm mt-2">All requests have been reviewed</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && exemptions.length > 0 && (
          <div className="space-y-4">
            {exemptions.map((exemption) => (
              <Card
                key={exemption.id}
                className="cyber-border border-orange-500/30 hover:border-orange-500/50 transition-colors"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-orange-400" />
                        {exemption.commodity_code} - {getExemptionTypeLabel(exemption.exemption_type)}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {exemption.company_name}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="border-orange-500/50 text-orange-400 bg-orange-500/10">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending Review
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Position Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg glass border border-white/10">
                      <div className="text-xs text-slate-400 mb-1">Requested Amount</div>
                      <div className="text-lg font-bold text-white">
                        {exemption.requested_amount.toLocaleString()} lots
                      </div>
                    </div>
                    <div className="p-3 rounded-lg glass border border-white/10">
                      <div className="text-xs text-slate-400 mb-1">Current Position</div>
                      <div className="text-lg font-bold text-white">
                        {(exemption.current_position || 0).toLocaleString()} lots
                      </div>
                    </div>
                    <div className="p-3 rounded-lg glass border border-white/10">
                      <div className="text-xs text-slate-400 mb-1">Submitted</div>
                      <div className="text-sm text-white">
                        {new Date(exemption.requested_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        by {exemption.requested_by_name}
                      </div>
                    </div>
                  </div>

                  {/* Business Justification */}
                  <div>
                    <div className="text-sm font-medium text-slate-300 mb-2">Business Justification:</div>
                    <div className="text-sm text-slate-400 p-3 rounded-lg glass border border-white/10 max-h-32 overflow-y-auto">
                      {exemption.business_justification}
                    </div>
                  </div>

                  {/* Supporting Documents */}
                  {exemption.supporting_documents && (
                    <div>
                      <div className="text-sm font-medium text-slate-300 mb-2">Supporting Documentation:</div>
                      <div className="text-sm text-slate-400 p-3 rounded-lg glass border border-white/10">
                        {exemption.supporting_documents}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <Button
                      onClick={() => handleReviewClick(exemption, 'approve')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReviewClick(exemption, 'deny')}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Deny
                    </Button>
                    {canDeleteExemption(exemption) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedExemption(exemption);
                          setShowDeleteModal(true);
                        }}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 ml-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Approval Modal */}
        {showApprovalModal && selectedExemption && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl border-green-500/30">
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl border-red-500/30">
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
                      {selectedExemption.requested_amount.toLocaleString()} lots
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Requested By:</span>
                    <span className="text-white">{selectedExemption.requested_by_name}</span>
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
                        <Trash2 className="w-4 h-4 mr-2" />
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

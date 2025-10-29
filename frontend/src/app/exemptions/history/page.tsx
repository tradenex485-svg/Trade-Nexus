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
  History,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Filter,
  Download,
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

export default function ExemptionHistoryPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [exemptions, setExemptions] = useState<HedgeExemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedExemption, setSelectedExemption] = useState<HedgeExemption | null>(null);

  useEffect(() => {
    if (!token) return;
    loadExemptionHistory();
  }, [token, filterStatus]);

  async function loadExemptionHistory() {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const response = await hedgeExemptionsApi.getAll(params as any);

      if (response.success) {
        // Filter out pending requests (those are shown in pending page)
        const historicalExemptions = response.data.filter(
          (ex: HedgeExemption) => ex.status !== 'pending'
        );
        setExemptions(historicalExemptions || []);
      } else {
        setError('Failed to load exemption history');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load exemption history');
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; label: string }> = {
      'approved': { color: 'border-green-500/50 text-green-400 bg-green-500/10', icon: CheckCircle, label: 'Approved' },
      'denied': { color: 'border-red-500/50 text-red-400 bg-red-500/10', icon: XCircle, label: 'Denied' },
      'expired': { color: 'border-gray-500/50 text-gray-400 bg-gray-500/10', icon: Clock, label: 'Expired' },
      'revoked': { color: 'border-orange-500/50 text-orange-400 bg-orange-500/10', icon: AlertCircle, label: 'Revoked' },
    };

    const badge = badges[status] || badges['expired'];
    const Icon = badge.icon;

    return (
      <Badge variant="outline" className={badge.color}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </Badge>
    );
  };

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
    <AuthGuard requiredPermissions={['exemptions.read']}>
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

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <History className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Exemption History & Audit Trail</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Complete history of all exemption requests and decisions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadExemptionHistory}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 cyber-border border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'approved' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('approved')}
                className={filterStatus === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Approved
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'denied' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('denied')}
                className={filterStatus === 'denied' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                Denied
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'expired' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('expired')}
              >
                Expired
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        )}

        {/* Empty State */}
        {!loading && exemptions.length === 0 && (
          <Card className="cyber-border border-slate-700">
            <CardContent className="py-12">
              <div className="text-center">
                <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No exemption history found</p>
                <p className="text-slate-500 text-sm mt-2">
                  {filterStatus !== 'all' ? 'Try changing the filter' : 'No historical exemption records'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History Table/List */}
        {!loading && exemptions.length > 0 && (
          <Card className="cyber-border border-purple-500/30">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Commodity</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Requested By</th>
                      <th className="px-6 py-4">Requested</th>
                      <th className="px-6 py-4">Reviewed By</th>
                      <th className="px-6 py-4">Reviewed</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Valid Until</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {exemptions.map((exemption) => (
                      <tr
                        key={exemption.id}
                        onClick={() => setSelectedExemption(exemption)}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">{exemption.commodity_code}</div>
                          <div className="text-xs text-slate-500">{exemption.company_name}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {getExemptionTypeLabel(exemption.exemption_type)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                          {exemption.requested_amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {exemption.requested_by_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {new Date(exemption.requested_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {exemption.reviewed_by_name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {exemption.reviewed_at
                            ? new Date(exemption.reviewed_at).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(exemption.status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {exemption.effective_to
                            ? new Date(exemption.effective_to).toLocaleDateString()
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detail Modal */}
        {selectedExemption && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedExemption(null)}>
            <Card className="w-full max-w-3xl border-purple-500/30" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>
                      {selectedExemption.commodity_code} - {getExemptionTypeLabel(selectedExemption.exemption_type)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Request ID: #{selectedExemption.id}
                    </CardDescription>
                  </div>
                  {getStatusBadge(selectedExemption.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Request Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Company</div>
                    <div className="text-sm text-white">{selectedExemption.company_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Requested Amount</div>
                    <div className="text-sm text-white font-mono">
                      {selectedExemption.requested_amount.toLocaleString()} lots
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Current Position</div>
                    <div className="text-sm text-white font-mono">
                      {(selectedExemption.current_position || 0).toLocaleString()} lots
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Requested By</div>
                    <div className="text-sm text-white">{selectedExemption.requested_by_name}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(selectedExemption.requested_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Review Information */}
                {selectedExemption.reviewed_by && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Reviewed By</div>
                        <div className="text-sm text-white">{selectedExemption.reviewed_by_name}</div>
                        <div className="text-xs text-slate-500">
                          {selectedExemption.reviewed_at && new Date(selectedExemption.reviewed_at).toLocaleString()}
                        </div>
                      </div>
                      {selectedExemption.status === 'approved' && (
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Validity Period</div>
                          <div className="text-sm text-white">
                            {selectedExemption.effective_from && new Date(selectedExemption.effective_from).toLocaleDateString()}
                            {' → '}
                            {selectedExemption.effective_to && new Date(selectedExemption.effective_to).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Business Justification */}
                <div className="pt-4 border-t border-white/10">
                  <div className="text-xs text-slate-400 mb-2">Business Justification</div>
                  <div className="text-sm text-slate-300 p-3 rounded-lg glass border border-white/10 max-h-40 overflow-y-auto">
                    {selectedExemption.business_justification}
                  </div>
                </div>

                {/* Review Notes */}
                {selectedExemption.approval_notes && (
                  <div>
                    <div className="text-xs text-slate-400 mb-2">
                      {selectedExemption.status === 'approved' ? 'Approval Notes' : 'Denial Reason'}
                    </div>
                    <div className="text-sm text-slate-300 p-3 rounded-lg glass border border-white/10">
                      {selectedExemption.approval_notes}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex justify-end pt-4 border-t border-white/10">
                  <Button onClick={() => setSelectedExemption(null)}>
                    Close
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

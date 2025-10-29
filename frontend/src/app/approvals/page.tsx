'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth-store';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { approvalsApi } from '@/lib/api';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Shield,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ApprovalsPage() {
  const { token } = useAuthStore();
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    // Wait for token before loading data
    if (!token) return;

    loadPending();
    loadHistory();
    loadPendingCount();
  }, [token]);

  const loadPendingCount = async () => {
    try {
      const response = await approvalsApi.getPendingCount();
      setPendingCount(response.count || 0);
    } catch (error) {
      console.error('Failed to load pending count:', error);
    }
  };

  const loadPending = async () => {
    setLoading(true);
    try {
      const response = await approvalsApi.getAll('pending', 100);
      setPendingApprovals(response.data || []);
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await approvalsApi.getHistory({ limit: 50 });
      setHistory(response.data || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm('Are you sure you want to approve this trade?')) return;

    setLoading(true);
    try {
      await approvalsApi.approve(id, actionNotes || undefined);
      alert('Trade approved successfully');
      setActionNotes('');
      setSelectedApproval(null);
      loadPending();
      loadHistory();
      loadPendingCount();
    } catch (error: any) {
      alert(`Failed to approve: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    if (!confirm('Are you sure you want to reject this trade?')) return;

    setLoading(true);
    try {
      await approvalsApi.reject(id, rejectionReason);
      alert('Trade rejected successfully');
      setRejectionReason('');
      setSelectedApproval(null);
      loadPending();
      loadHistory();
      loadPendingCount();
    } catch (error: any) {
      alert(`Failed to reject: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'border-red-500 text-red-400 bg-red-500/10';
      case 'high':
        return 'border-orange-500 text-orange-400 bg-orange-500/10';
      case 'normal':
        return 'border-blue-500 text-blue-400 bg-blue-500/10';
      case 'low':
        return 'border-slate-500 text-slate-400 bg-slate-500/10';
      default:
        return 'border-slate-500 text-slate-400';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-slate-400';
    }
  };

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
                Trade Approvals
              </h1>
              <p className="text-slate-400">
                Review and approve high-risk trades
              </p>
            </div>

            {/* Stats Card */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Clock className="h-10 w-10 text-yellow-500" />
                    <div>
                      <p className="text-sm text-slate-400">Pending Approvals</p>
                      <p className="text-3xl font-bold text-white">{pendingCount}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      loadPending();
                      loadHistory();
                      loadPendingCount();
                    }}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Loader2 className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="bg-slate-800 border border-slate-700 mb-6">
                <TabsTrigger value="pending" className="data-[state=active]:bg-slate-700">
                  Pending ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-slate-700">
                  <History className="h-4 w-4 mr-2" />
                  History
                </TabsTrigger>
              </TabsList>

              {/* Pending Approvals */}
              <TabsContent value="pending">
                {loading && pendingApprovals.length === 0 ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : pendingApprovals.length === 0 ? (
                  <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                    <CardContent className="p-12 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-slate-400">No pending approvals</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {pendingApprovals.map((approval) => (
                      <motion.div
                        key={approval.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur hover:border-slate-600 transition-colors">
                          <CardContent className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                              {/* Trade Details */}
                              <div className="lg:col-span-2 space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={getUrgencyColor(approval.urgency)}
                                    >
                                      {approval.urgency?.toUpperCase()}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'border-slate-600',
                                        getRiskColor(approval.risk_level)
                                      )}
                                    >
                                      {approval.risk_level?.toUpperCase()} RISK
                                    </Badge>
                                  </div>
                                  <span className="text-sm text-slate-400">
                                    ID: {approval.id}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <h3 className="text-xl font-bold text-white">
                                    {approval.commodity_code} @ {approval.market_location}
                                  </h3>
                                  <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                      {approval.trade_side === 'BUY' ? (
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <TrendingDown className="h-4 w-4 text-red-500" />
                                      )}
                                      <span className="text-slate-300">{approval.trade_side}</span>
                                    </div>
                                    <span className="text-slate-400">
                                      {approval.quantity?.toLocaleString()} lots
                                    </span>
                                    <span className="text-slate-400">
                                      Contract: {approval.contract_month}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                  <div className="p-3 rounded-lg bg-slate-900/50">
                                    <p className="text-xs text-slate-400 mb-1">
                                      Projected Utilization
                                    </p>
                                    <p
                                      className={cn(
                                        'text-2xl font-bold',
                                        approval.projected_utilization_pct >= 95
                                          ? 'text-red-400'
                                          : approval.projected_utilization_pct >= 80
                                          ? 'text-yellow-400'
                                          : 'text-green-400'
                                      )}
                                    >
                                      {approval.projected_utilization_pct?.toFixed(2)}%
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-slate-900/50">
                                    <p className="text-xs text-slate-400 mb-1">Requested By</p>
                                    <p className="text-lg font-semibold text-white">
                                      {approval.requested_by_name || 'Unknown'}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-xs text-slate-400">
                                  Requested: {new Date(approval.requested_at).toLocaleString()}
                                  {approval.expires_at && (
                                    <>
                                      {' '}
                                      • Expires: {new Date(approval.expires_at).toLocaleString()}
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="lg:col-span-2 space-y-4">
                                {selectedApproval?.id === approval.id ? (
                                  <>
                                    <div className="space-y-3">
                                      <div>
                                        <Label className="text-slate-300">
                                          Approval Notes (Optional)
                                        </Label>
                                        <Input
                                          value={actionNotes}
                                          onChange={(e) => setActionNotes(e.target.value)}
                                          placeholder="Add any notes..."
                                          className="bg-slate-900 border-slate-700 text-white mt-2"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-slate-300">
                                          Rejection Reason (Required for Reject)
                                        </Label>
                                        <Input
                                          value={rejectionReason}
                                          onChange={(e) => setRejectionReason(e.target.value)}
                                          placeholder="Reason for rejection..."
                                          className="bg-slate-900 border-slate-700 text-white mt-2"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => handleApprove(approval.id)}
                                        disabled={loading}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Approve
                                      </Button>
                                      <Button
                                        onClick={() => handleReject(approval.id)}
                                        disabled={loading}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          setSelectedApproval(null);
                                          setActionNotes('');
                                          setRejectionReason('');
                                        }}
                                        variant="outline"
                                        className="border-slate-600 text-slate-300"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex flex-col gap-2 h-full justify-center">
                                    <Button
                                      onClick={() => setSelectedApproval(approval)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                      Review & Action
                                    </Button>
                                    {approval.pre_trade_check_id && (
                                      <Button
                                        variant="outline"
                                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                      >
                                        View Details
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* History */}
              <TabsContent value="history">
                {history.length === 0 ? (
                  <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                    <CardContent className="p-12 text-center">
                      <History className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-400">No approval history</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-white">Approval History</CardTitle>
                      <CardDescription className="text-slate-400">
                        Recent approval and rejection decisions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {history.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start justify-between p-4 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-slate-600 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {item.status === 'approved' ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500" />
                                )}
                                <span className="font-semibold text-white">
                                  {item.commodity_code} @ {item.market_location}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={
                                    item.status === 'approved'
                                      ? 'border-green-500 text-green-400'
                                      : 'border-red-500 text-red-400'
                                  }
                                >
                                  {item.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-slate-400 space-y-1">
                                <div className="flex items-center gap-4">
                                  <span>{item.trade_side} {item.quantity?.toLocaleString()} lots</span>
                                  <span>Utilization: {item.projected_utilization_pct?.toFixed(2)}%</span>
                                </div>
                                <div>
                                  Reviewed by: {item.approved_by_name || 'Unknown'}
                                  {' • '}
                                  {new Date(item.reviewed_at).toLocaleString()}
                                </div>
                                {item.approval_notes && (
                                  <div className="text-slate-300 italic">
                                    Note: {item.approval_notes}
                                  </div>
                                )}
                                {item.rejection_reason && (
                                  <div className="text-red-400 italic">
                                    Reason: {item.rejection_reason}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
}

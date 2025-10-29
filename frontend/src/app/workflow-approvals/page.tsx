'use client';

import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { approvalWorkflowsApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, History, AlertCircle, FileCheck, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function WorkflowApprovalsPage() {
  const { token } = useAuthStore();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'pending',
    request_type: 'all',
  });
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  const loadApprovals = useCallback(async () => {
    // Wait for token before loading data
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params: any = { status: filter.status };
      if (filter.request_type !== 'all') params.request_type = filter.request_type;

      const response = await approvalWorkflowsApi.getAll(filter.status, filter.request_type);
      setApprovals(response.data || []);
    } catch (error) {
      console.error('Failed to load approvals:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, token]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const loadHistory = async (approvalId: number) => {
    try {
      const response = await approvalWorkflowsApi.getHistory(approvalId);
      setApprovalHistory(response.data || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await approvalWorkflowsApi.approve(id, approvalNotes);
      setApprovalNotes('');
      setSelectedApproval(null);
      loadApprovals();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async (id: number) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      await approvalWorkflowsApi.reject(id, rejectionReason);
      setRejectionReason('');
      setSelectedApproval(null);
      loadApprovals();
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      pending: { color: 'bg-yellow-500', icon: Clock },
      approved: { color: 'bg-green-500', icon: CheckCircle },
      rejected: { color: 'bg-red-500', icon: XCircle },
    };
    const config = variants[status] || { color: 'bg-gray-500', icon: AlertCircle };
    const Icon = config.icon;
    return (
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <Badge className={`${config.color} text-white`}>{status.toUpperCase()}</Badge>
      </div>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      low: 'bg-gray-500',
      normal: 'bg-blue-500',
      high: 'bg-orange-500',
      critical: 'bg-red-500',
    };
    return (
      <Badge className={`${variants[priority] || 'bg-gray-500'} text-white`}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Approval Workflows
            </h1>
            <p className="text-slate-400">
              Manage approval requests for company signups, trader verifications, and limit overrides
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Pending</p>
                    <p className="text-2xl font-bold text-white">
                      {approvals.filter((a) => a.status === 'pending').length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Approved</p>
                    <p className="text-2xl font-bold text-white">
                      {approvals.filter((a) => a.status === 'approved').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Rejected</p>
                    <p className="text-2xl font-bold text-white">
                      {approvals.filter((a) => a.status === 'rejected').length}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total Requests</p>
                    <p className="text-2xl font-bold text-white">{approvals.length}</p>
                  </div>
                  <FileCheck className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300 text-sm mb-2 block">Status</Label>
                  <select
                    value={filter.status}
                    onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <Label className="text-slate-300 text-sm mb-2 block">Request Type</Label>
                  <select
                    value={filter.request_type}
                    onChange={(e) => setFilter({ ...filter, request_type: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="company_signup">Company Signup</option>
                    <option value="trader_verification">Trader Verification</option>
                    <option value="limit_override">Limit Override</option>
                    <option value="subscription_request">Subscription Request</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={loadApprovals}
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approvals Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Approvals List */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Approval Requests</CardTitle>
                <CardDescription className="text-slate-400">
                  {approvals.length} request{approvals.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12 text-slate-400">Loading approvals...</div>
                ) : approvals.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    No approval requests found.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[700px] overflow-y-auto">
                    {approvals.map((approval) => (
                      <motion.div
                        key={approval.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => {
                          setSelectedApproval(approval);
                          loadHistory(approval.id);
                        }}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedApproval?.id === approval.id
                            ? 'bg-slate-700 border-blue-500'
                            : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-white font-medium">{approval.title}</h4>
                          {getStatusBadge(approval.status)}
                        </div>
                        <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                          {approval.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-3 text-sm flex-wrap">
                          <Badge className="bg-slate-700 text-slate-300">
                            {approval.request_type?.replace('_', ' ')}
                          </Badge>
                          {getPriorityBadge(approval.priority || 'normal')}
                          <span className="text-slate-400 text-xs">
                            {new Date(approval.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approval Details */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">
                  {selectedApproval ? 'Request Details' : 'Select a request'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedApproval ? (
                  <div className="space-y-6">
                    {/* Request Info */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">
                        {selectedApproval.title}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-slate-400">Request Type</p>
                          <p className="text-white capitalize">
                            {selectedApproval.request_type?.replace('_', ' ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Priority</p>
                          <p className="text-white capitalize">{selectedApproval.priority}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Requested By</p>
                          <p className="text-white">{selectedApproval.requested_by || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Created</p>
                          <p className="text-white">
                            {new Date(selectedApproval.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {selectedApproval.description && (
                        <div>
                          <p className="text-slate-400 text-sm mb-2">Description</p>
                          <p className="text-white bg-slate-900 p-3 rounded-lg">
                            {selectedApproval.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {selectedApproval.status === 'pending' && (
                      <div className="space-y-4 pt-4 border-t border-slate-700">
                        <div>
                          <Label className="text-slate-300 text-sm mb-2 block">
                            Approval Notes (Optional)
                          </Label>
                          <textarea
                            value={approvalNotes}
                            onChange={(e) => setApprovalNotes(e.target.value)}
                            className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                            rows={2}
                            placeholder="Add any notes for this approval..."
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleApprove(selectedApproval.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => {
                              const reason = prompt('Please provide a rejection reason:');
                              if (reason) {
                                setRejectionReason(reason);
                                handleReject(selectedApproval.id);
                              }
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* History */}
                    {approvalHistory.length > 0 && (
                      <div className="pt-4 border-t border-slate-700">
                        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                          <History className="h-4 w-4" />
                          History
                        </h4>
                        <div className="space-y-3">
                          {approvalHistory.map((entry: any) => (
                            <div key={entry.id} className="bg-slate-900 p-3 rounded-lg text-sm">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-medium">
                                  {entry.performed_by_name}
                                </span>
                                <span className="text-slate-400 text-xs">
                                  {new Date(entry.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-slate-300">{entry.action}</p>
                              {entry.notes && (
                                <p className="text-slate-400 mt-1 italic">"{entry.notes}"</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[600px] text-slate-400">
                    Select an approval request to view details
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

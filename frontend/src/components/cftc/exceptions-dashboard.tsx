'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { exceptionsApi } from '@/lib/api';
import { AlertTriangle, CheckCircle, Clock, XCircle, TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExceptionStats {
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
  total: number;
}

interface Exception {
  id: number;
  exception_type: string;
  exception_severity: string;
  entity_type: string;
  exception_message: string;
  status: string;
  detected_at: string;
}

export function ExceptionsDashboard() {
  const [stats, setStats] = useState<ExceptionStats | null>(null);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('OPEN');

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    try {
      setError(null);
      const [statsData, exceptionsData] = await Promise.all([
        exceptionsApi.getStats(),
        exceptionsApi.getExceptions({ status: filterStatus, limit: 10 }),
      ]);

      setStats(statsData);
      setExceptions(exceptionsData.exceptions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load exceptions');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-400 border-red-500/50';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/50';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50';
      case 'LOW':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/50';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'IGNORED':
        return <XCircle className="h-4 w-4 text-slate-400" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Exception Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Exception Tracking
        </CardTitle>
        <CardDescription>Monitor and manage calculation exceptions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-400">Total</p>
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.total || 0}</p>
              <p className="text-xs text-slate-500 mt-1">All exceptions</p>
            </div>

            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-red-300">Open</p>
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {stats.by_status?.OPEN || 0}
              </p>
              <p className="text-xs text-red-400 mt-1">Requires attention</p>
            </div>

            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-yellow-300">In Progress</p>
                <Clock className="h-4 w-4 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {stats.by_status?.IN_PROGRESS || 0}
              </p>
              <p className="text-xs text-yellow-400 mt-1">Being worked on</p>
            </div>

            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-green-300">Resolved</p>
                <CheckCircle className="h-4 w-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {stats.by_status?.RESOLVED || 0}
              </p>
              <p className="text-xs text-green-400 mt-1">Completed</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {['OPEN', 'IN_PROGRESS', 'RESOLVED'].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={filterStatus === status ? 'default' : 'outline'}
              onClick={() => setFilterStatus(status)}
            >
              {status.replace('_', ' ')}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          {exceptions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No {filterStatus.toLowerCase()} exceptions found
            </div>
          ) : (
            exceptions.map((exception) => (
              <div
                key={exception.id}
                className="p-3 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(exception.status)}
                    <Badge
                      variant="outline"
                      className={getSeverityColor(exception.exception_severity)}
                    >
                      {exception.exception_severity}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {exception.exception_type}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(exception.detected_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{exception.exception_message}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>Entity: {exception.entity_type}</span>
                  <span>Status: {exception.status}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {exceptions.length > 0 && (
          <Button variant="outline" className="w-full" onClick={loadData}>
            <Loader2 className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

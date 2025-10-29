'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { securityApi } from '@/lib/api';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  RefreshCw,
  Eye,
  UserX,
} from 'lucide-react';

interface SecurityEvent {
  id: number;
  event_type: string;
  severity: string;
  user_email?: string;
  ip_address?: string;
  endpoint?: string;
  detected_at: string;
  is_resolved: number;
  resolved_at?: string;
  resolved_by_email?: string;
  alert_status: string;
}

interface FailedLogin {
  email: string;
  ip_address: string;
  attempt_count: number;
  first_attempt: string;
  last_attempt: string;
  threat_level: string;
}

interface SecurityStats {
  total_events: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unresolved: number;
  resolved: number;
}

export default function SecurityPage() {
  const { token, user } = useAuthStore();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [failedLogins, setFailedLogins] = useState<FailedLogin[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterResolved, setFilterResolved] = useState('all');

  // Helper function to check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  useEffect(() => {
    loadData();
  }, [filterSeverity, filterResolved, token]);

  async function loadData() {
    if (!token) {
      setLoading(false);
      return;
    }

    // Check if user has permission to view security data
    if (!hasPermission('security.read')) {
      setError('Access Denied: You do not have permission to view security monitoring data.');
      setLoading(false);
      return; // Don't make API calls
    }

    setLoading(true);
    setError(null);

    try {
      const [eventsRes, loginsRes, statsRes] = await Promise.all([
        securityApi.getEvents({
          severity: filterSeverity !== 'all' ? filterSeverity : undefined,
          is_resolved: filterResolved !== 'all' ? (filterResolved === 'resolved' ? 'true' : 'false') : undefined
        }),
        securityApi.getFailedLogins(),
        securityApi.getEventsStats(),
      ]);

      if (eventsRes.success) setEvents(eventsRes.data);
      if (loginsRes.success) setFailedLogins(loginsRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  }

  async function handleResolveEvent(eventId: number) {
    const notes = prompt('Enter resolution notes (optional):');

    if (!token) return;

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/security/events/${eventId}/resolve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ resolution_notes: notes || '' }),
      }).then(r => r.json());

      if (response.success) {
        alert('Event resolved successfully');
        loadData();
      } else {
        alert('Failed to resolve event: ' + response.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  function getSeverityBadge(severity: string) {
    const variants: Record<string, string> = {
      'critical': 'bg-red-500/10 text-red-600 border-red-500/20',
      'high': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      'medium': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      'low': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    };

    return (
      <Badge variant="outline" className={variants[severity] || 'bg-gray-500/10 text-gray-600'}>
        {severity.toUpperCase()}
      </Badge>
    );
  }

  function getThreatBadge(threat: string) {
    const variants: Record<string, string> = {
      'brute_force_suspected': 'bg-red-500/10 text-red-600 border-red-500/20',
      'suspicious': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      'normal': 'bg-green-500/10 text-green-600 border-green-500/20',
    };

    const labels: Record<string, string> = {
      'brute_force_suspected': 'BRUTE FORCE',
      'suspicious': 'SUSPICIOUS',
      'normal': 'NORMAL',
    };

    return (
      <Badge variant="outline" className={variants[threat] || 'bg-gray-500/10 text-gray-600'}>
        {labels[threat] || threat}
      </Badge>
    );
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="p-6 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
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
            Security Dashboard
          </h1>
          <p className="text-slate-400 mt-1">
            Monitor security events and threat activity
          </p>
        </div>
        <Button onClick={() => loadData()} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && error.includes('Access Denied') ? (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="pt-12 pb-12 text-center">
            <Lock className="h-16 w-16 mx-auto mb-4 text-slate-500" />
            <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
            <p className="text-slate-400 mb-1">
              You do not have permission to view the Security Dashboard.
            </p>
            <p className="text-sm text-slate-500">
              Please contact your administrator if you believe you should have access.
            </p>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* Only show stats and tabs if no access denied error */}
      {!(error && error.includes('Access Denied')) && (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Shield className="h-5 w-5 text-blue-400" />
              <div className="text-2xl font-bold text-white">
                {stats?.total_events || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Total Events</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="text-2xl font-bold text-red-400">
                {stats?.critical || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Critical</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              <div className="text-2xl font-bold text-orange-400">
                {stats?.high || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">High</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <div className="text-2xl font-bold text-yellow-400">
                {stats?.medium || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Medium</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-blue-400" />
              <div className="text-2xl font-bold text-blue-400">
                {stats?.low || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Low</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Unlock className="h-5 w-5 text-yellow-400" />
              <div className="text-2xl font-bold text-yellow-400">
                {stats?.unresolved || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Unresolved</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Lock className="h-5 w-5 text-green-400" />
              <div className="text-2xl font-bold text-green-400">
                {stats?.resolved || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Resolved</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="logins">Failed Logins</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          {/* Filters */}
          <Card className="border-slate-700 bg-slate-800/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Severity</label>
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Status</label>
                  <select
                    value={filterResolved}
                    onChange={(e) => setFilterResolved(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="unresolved">Unresolved</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events Table */}
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white">Security Events</CardTitle>
              <CardDescription>Recent security events and threats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Detected</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Severity</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">User/IP</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Endpoint</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="py-3 px-4 text-slate-300 text-sm">
                          {new Date(event.detected_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-white text-sm">{event.event_type.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="py-3 px-4">{getSeverityBadge(event.severity)}</td>
                        <td className="py-3 px-4">
                          <div className="text-white text-sm">{event.user_email || 'N/A'}</div>
                          <div className="text-xs text-slate-400">{event.ip_address}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-sm font-mono">{event.endpoint || '-'}</td>
                        <td className="py-3 px-4">
                          {event.is_resolved === 1 ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              RESOLVED
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                              <XCircle className="h-3 w-3 mr-1" />
                              OPEN
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {event.is_resolved === 0 && (
                            <Button
                              onClick={() => handleResolveEvent(event.id)}
                              variant="outline"
                              size="sm"
                              className="bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-400"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {events.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No security events found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logins" className="space-y-4">
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white">Failed Login Attempts</CardTitle>
              <CardDescription>Suspicious login activity analysis (last 24 hours)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Email</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">IP Address</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">Attempts</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">First Attempt</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Last Attempt</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Threat Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedLogins.map((login, idx) => (
                      <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="py-3 px-4 text-white">{login.email}</td>
                        <td className="py-3 px-4 text-slate-300 font-mono">{login.ip_address}</td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                            {login.attempt_count}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-sm">
                          {new Date(login.first_attempt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-sm">
                          {new Date(login.last_attempt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">{getThreatBadge(login.threat_level)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {failedLogins.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <UserX className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No failed login attempts detected</p>
                    <p className="text-sm mt-2">Your system is secure</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
    </AuthGuard>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { auditTrailApi } from '@/lib/api';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditEntry {
  id: number;
  event_type: string;
  entity_type: string;
  entity_id: number;
  action: string;
  user_id?: number;
  timestamp: string;
  changes?: string;
  metadata?: string;
  ip_address?: string;
}

interface AuditStats {
  total_events: number;
  by_event_type: Record<string, number>;
  by_action: Record<string, number>;
  recent_activity_count: number;
}

export function AuditTrailViewer() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [eventTypeFilter, actionFilter, startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [entriesData, statsData] = await Promise.all([
        auditTrailApi.getAuditTrail({
          event_type: eventTypeFilter || undefined,
          action: actionFilter || undefined,
          start_date: startDate,
          end_date: endDate,
          limit: 50,
        }),
        auditTrailApi.getStats(startDate, endDate),
      ]);

      setEntries(entriesData.entries || []);
      setStats(statsData.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm || searchTerm.length < 2) {
      setError('Search term must be at least 2 characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await auditTrailApi.searchAuditTrail(searchTerm, 50);
      setEntries(data.results || []);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleEntry = (id: number) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEntries(newExpanded);
  };

  const getEventTypeColor = (eventType: string) => {
    const colors: Record<string, string> = {
      VALIDATION: 'bg-blue-500/10 text-blue-400 border-blue-500/50',
      APPROVAL: 'bg-green-500/10 text-green-400 border-green-500/50',
      CALCULATION: 'bg-purple-500/10 text-purple-400 border-purple-500/50',
      LIMIT_CHANGE: 'bg-orange-500/10 text-orange-400 border-orange-500/50',
      EXCEPTION_UPDATE: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50',
      REPORT_GENERATED: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/50',
    };
    return colors[eventType] || 'bg-slate-500/10 text-slate-400 border-slate-500/50';
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return '➕';
      case 'UPDATE':
        return '✏️';
      case 'DELETE':
        return '🗑️';
      case 'APPROVE':
        return '✅';
      case 'REJECT':
        return '❌';
      case 'CALCULATE':
        return '🧮';
      default:
        return '📝';
    }
  };

  if (loading && entries.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Audit Trail</CardTitle>
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
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Total Events</CardDescription>
              <CardTitle className="text-2xl text-white">{stats.total_events}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Recent Activity</CardDescription>
              <CardTitle className="text-2xl text-white">{stats.recent_activity_count}</CardTitle>
              <p className="text-xs text-slate-500">Last 24 hours</p>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Event Types</CardDescription>
              <CardTitle className="text-2xl text-white">
                {Object.keys(stats.by_event_type).length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Action Types</CardDescription>
              <CardTitle className="text-2xl text-white">
                {Object.keys(stats.by_action).length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Trail
          </CardTitle>
          <CardDescription>Complete system activity and change log</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Event Type</label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="VALIDATION">Validation</option>
                <option value="APPROVAL">Approval</option>
                <option value="CALCULATION">Calculation</option>
                <option value="LIMIT_CHANGE">Limit Change</option>
                <option value="EXCEPTION_UPDATE">Exception Update</option>
                <option value="REPORT_GENERATED">Report Generated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="APPROVE">Approve</option>
                <option value="REJECT">Reject</option>
                <option value="CALCULATE">Calculate</option>
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
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
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
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <Input
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 bg-slate-700 border-slate-600 text-white"
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>

          {/* Entries List */}
          <div className="space-y-2">
            {entries.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No audit entries found for the selected filters
              </div>
            ) : (
              entries.map((entry) => {
                const isExpanded = expandedEntries.has(entry.id);
                return (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => toggleEntry(entry.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleEntry(entry.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} audit entry for ${entry.action}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl">{getActionIcon(entry.action)}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className={getEventTypeColor(entry.event_type)}
                            >
                              {entry.event_type}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {entry.action} on {entry.entity_type} #{entry.entity_id}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>
                              <Calendar className="inline h-3 w-3 mr-1" />
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                            {entry.user_id && (
                              <span>
                                <User className="inline h-3 w-3 mr-1" />
                                User #{entry.user_id}
                              </span>
                            )}
                            {entry.ip_address && (
                              <span>IP: {entry.ip_address}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </div>

                    {isExpanded && (entry.changes || entry.metadata) && (
                      <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                        {entry.changes && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 mb-1">Changes:</p>
                            <pre className="text-xs text-slate-300 bg-slate-800 p-2 rounded overflow-x-auto">
                              {JSON.stringify(JSON.parse(entry.changes), null, 2)}
                            </pre>
                          </div>
                        )}
                        {entry.metadata && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 mb-1">Metadata:</p>
                            <pre className="text-xs text-slate-300 bg-slate-800 p-2 rounded overflow-x-auto">
                              {JSON.stringify(JSON.parse(entry.metadata), null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {entries.length > 0 && (
            <div className="flex justify-between items-center pt-4">
              <p className="text-sm text-slate-400">
                Showing {entries.length} entries
              </p>
              <Button variant="outline" onClick={loadData} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Activity className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

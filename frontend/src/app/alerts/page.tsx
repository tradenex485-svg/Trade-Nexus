'use client';

import { useEffect, useState } from 'react';
import { useAlertsStore } from '@/store/alerts-store';
import { AuthGuard } from '@/components/auth/auth-guard';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  Check,
  Loader2,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AlertsPage() {
  const { alerts, stats, unreadCount, isLoading, fetchAlerts, fetchStats, markAsRead, acknowledge } =
    useAlertsStore();
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, [fetchAlerts, fetchStats]);

  const handleFilterChange = (severity: string) => {
    setSelectedSeverity(severity);
    if (severity === 'all') {
      fetchAlerts();
    } else {
      fetchAlerts({ severity });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5" />;
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-500/10 text-red-400';
      case 'error':
        return 'border-orange-500 bg-orange-500/10 text-orange-400';
      case 'warning':
        return 'border-yellow-500 bg-yellow-500/10 text-yellow-400';
      default:
        return 'border-blue-500 bg-blue-500/10 text-blue-400';
    }
  };

  const handleMarkAsRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await markAsRead(id);
  };

  const handleAcknowledge = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await acknowledge(id);
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
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">Alerts</h1>
              <p className="text-slate-400">
                Monitor position limit alerts and notifications
              </p>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Total Alerts</p>
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-slate-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Unread</p>
                        <p className="text-2xl font-bold text-blue-400">{unreadCount}</p>
                      </div>
                      <Eye className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Critical</p>
                        <p className="text-2xl font-bold text-red-400">
                          {stats.by_severity.critical}
                        </p>
                      </div>
                      <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Warnings</p>
                        <p className="text-2xl font-bold text-yellow-400">
                          {stats.by_severity.warning + stats.by_severity.error}
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur mb-6">
              <CardHeader>
                <CardTitle className="text-white">Filter Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedSeverity} onValueChange={handleFilterChange}>
                  <TabsList className="bg-slate-700">
                    <TabsTrigger value="all" className="data-[state=active]:bg-slate-600">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="critical" className="data-[state=active]:bg-red-600">
                      Critical
                    </TabsTrigger>
                    <TabsTrigger value="error" className="data-[state=active]:bg-orange-600">
                      Error
                    </TabsTrigger>
                    <TabsTrigger value="warning" className="data-[state=active]:bg-yellow-600">
                      Warning
                    </TabsTrigger>
                    <TabsTrigger value="info" className="data-[state=active]:bg-blue-600">
                      Info
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {/* Alerts List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : alerts.length === 0 ? (
              <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-slate-400">No alerts found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card
                      className={cn(
                        'border-slate-700 bg-slate-800/50 backdrop-blur transition-all',
                        !alert.read && 'border-l-4',
                        !alert.read && getSeverityColor(alert.severity)
                      )}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={cn('', getSeverityColor(alert.severity))}>
                                {getSeverityIcon(alert.severity)}
                              </div>
                              <h3 className="text-lg font-semibold text-white">
                                {alert.title}
                              </h3>
                              <Badge
                                variant="outline"
                                className={cn('capitalize', getSeverityColor(alert.severity))}
                              >
                                {alert.severity}
                              </Badge>
                              {!alert.read && (
                                <Badge variant="outline" className="border-blue-500 text-blue-400">
                                  New
                                </Badge>
                              )}
                              {alert.acknowledged === 1 && (
                                <Badge
                                  variant="outline"
                                  className="border-green-500 text-green-400"
                                >
                                  Acknowledged
                                </Badge>
                              )}
                            </div>

                            <p className="text-slate-300 mb-3">{alert.message}</p>

                            <div className="flex items-center gap-4 text-sm text-slate-400">
                              {alert.commodity_code && (
                                <span>Commodity: {alert.commodity_code}</span>
                              )}
                              {alert.utilization_pct !== null &&
                                alert.utilization_pct !== undefined && (
                                  <span>Utilization: {alert.utilization_pct.toFixed(2)}%</span>
                                )}
                              <span>{new Date(alert.created_at).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            {!alert.read && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleMarkAsRead(alert.id, e)}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Mark Read
                              </Button>
                            )}
                            {!alert.acknowledged && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleAcknowledge(alert.id, e)}
                                className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Acknowledge
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
}

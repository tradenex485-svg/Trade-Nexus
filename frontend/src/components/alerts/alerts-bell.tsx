'use client';

import { useEffect, useState } from 'react';
import { useAlertsStore } from '@/store/alerts-store';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function AlertsBell() {
  const router = useRouter();
  const { alerts, unreadCount, fetchAlerts, markAsRead } = useAlertsStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Fetch recent unread alerts
    fetchAlerts({ unread: true, limit: 5 });

    // Poll for new alerts every 30 seconds
    const interval = setInterval(() => {
      fetchAlerts({ unread: true, limit: 5 });
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleAlertClick = async (alertId: number) => {
    await markAsRead(alertId);
    setIsOpen(false);
    router.push('/alerts');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500';
      case 'error':
        return 'text-orange-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
    }
  };

  const recentAlerts = alerts.slice(0, 5);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-300 hover:text-white hover:bg-slate-700"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-slate-800 border-slate-700">
        <DropdownMenuLabel className="text-white">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-xs text-slate-400">({unreadCount} unread)</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />

        {recentAlerts.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-sm">No new alerts</div>
        ) : (
          <>
            {recentAlerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                onClick={() => handleAlertClick(alert.id)}
                className={cn(
                  'cursor-pointer focus:bg-slate-700',
                  !alert.read && 'bg-slate-700/50'
                )}
              >
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        getSeverityColor(alert.severity)
                      )}
                    >
                      {alert.title}
                    </span>
                    {!alert.read && (
                      <Badge
                        variant="outline"
                        className="ml-2 h-2 w-2 p-0 border-blue-500 bg-blue-500"
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{alert.message}</p>
                  {alert.commodity_code && (
                    <p className="text-xs text-slate-500">
                      {alert.commodity_code}
                      {alert.utilization_pct && ` • ${alert.utilization_pct.toFixed(1)}%`}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem
              onClick={() => {
                setIsOpen(false);
                router.push('/alerts');
              }}
              className="text-center justify-center text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              View all alerts
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

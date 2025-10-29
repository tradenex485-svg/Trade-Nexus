'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Info, TrendingUp, Clock } from 'lucide-react';
import { alertsApi, positionLimitsApi } from '@/lib/api';
import { motion } from 'framer-motion';

interface TickerItem {
  id: string;
  type: 'alert' | 'limit' | 'info';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp?: string;
}

export function NewsTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    fetchTickerData();
    const interval = setInterval(fetchTickerData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTickerData = async () => {
    try {
      const tickerItems: TickerItem[] = [];

      // Fetch critical alerts
      const alertsData = await alertsApi.getAll({ limit: 10 });
      if (alertsData.data) {
        const criticalAlerts = alertsData.data
          .filter((alert: any) => ['critical', 'error'].includes(alert.severity))
          .slice(0, 5);

        criticalAlerts.forEach((alert: any) => {
          tickerItems.push({
            id: `alert-${alert.id}`,
            type: 'alert',
            severity: alert.severity === 'critical' || alert.severity === 'error' ? 'critical' : 'warning',
            message: alert.message,
            timestamp: alert.created_at,
          });
        });
      }

      // Fetch high utilization positions (for each limit type)
      const limitTypes = ['spot', 'spot-plus', 'one-month', 'all-month'] as const;

      for (const limitType of limitTypes) {
        try {
          const limitsData = await positionLimitsApi.getAll(limitType, {
            prioritization: 'Breached',
            page: 1,
            page_size: 3,
          });

          if (limitsData.data) {
            limitsData.data.forEach((limit: any) => {
              tickerItems.push({
                id: `limit-${limitType}-${limit.id}`,
                type: 'limit',
                severity: limit.pos_pct >= 100 ? 'critical' : limit.pos_pct >= 90 ? 'warning' : 'info',
                message: `${limitType.toUpperCase()}: ${limit.mkt_index} at ${limit.pos_pct?.toFixed(1)}% utilization (${limit.pos_lots?.toFixed(0)}/${limit.limit_lots?.toFixed(0)})`,
              });
            });
          }
        } catch (err) {
          console.error(`Error fetching ${limitType} limits:`, err);
        }
      }

      // Fetch remediate positions as well
      for (const limitType of limitTypes) {
        try {
          const remediateData = await positionLimitsApi.getAll(limitType, {
            prioritization: 'High Risk',
            page: 1,
            page_size: 2,
          });

          if (remediateData.data) {
            remediateData.data.forEach((limit: any) => {
              tickerItems.push({
                id: `remediate-${limitType}-${limit.id}`,
                type: 'limit',
                severity: 'warning',
                message: `${limitType.toUpperCase()}: ${limit.mkt_index} approaching limit at ${limit.pos_pct?.toFixed(1)}%`,
              });
            });
          }
        } catch (err) {
          console.error(`Error fetching ${limitType} high risk limits:`, err);
        }
      }

      if (tickerItems.length === 0) {
        // Show a default message if no critical items
        tickerItems.push({
          id: 'default-1',
          type: 'info',
          severity: 'info',
          message: 'All positions within acceptable limits',
        });
        tickerItems.push({
          id: 'default-2',
          type: 'info',
          severity: 'info',
          message: 'System operating normally',
        });
      }

      setItems(tickerItems);
    } catch (error) {
      console.error('Failed to fetch ticker data:', error);
      setItems([
        {
          id: 'error',
          type: 'alert',
          severity: 'warning',
          message: 'Unable to load real-time updates',
        },
      ]);
    }
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 flex-shrink-0" />;
      default:
        return <Info className="w-4 h-4 flex-shrink-0" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-900/50 border-red-500/50 text-red-200';
      case 'warning':
        return 'bg-yellow-900/50 border-yellow-500/50 text-yellow-200';
      default:
        return 'bg-blue-900/50 border-blue-500/50 text-blue-200';
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden border-t backdrop-blur-sm bg-slate-900/95 border-slate-700">
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-white whitespace-nowrap">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <span>LIVE UPDATES</span>
        </div>

        <div className="flex-1 overflow-hidden">
          <motion.div
            className="flex gap-6"
            animate={isPlaying ? { x: [0, -2000] } : {}}
            transition={{
              duration: 60,
              repeat: Infinity,
              ease: 'linear',
            }}
            onHoverStart={() => setIsPlaying(false)}
            onHoverEnd={() => setIsPlaying(true)}
          >
            {/* Duplicate items for seamless loop */}
            {[...items, ...items, ...items].map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded border ${getSeverityColor(
                  item.severity
                )} whitespace-nowrap text-sm`}
              >
                {getIcon(item.severity)}
                <span className="font-medium">{item.message}</span>
                {item.timestamp && (
                  <span className="text-xs opacity-70 ml-2">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
            ))}
          </motion.div>
        </div>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
          aria-label={isPlaying ? 'Pause ticker' : 'Play ticker'}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
    </div>
  );
}

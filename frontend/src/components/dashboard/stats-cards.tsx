'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip as InfoTooltip,
  TooltipContent as InfoTooltipContent,
  TooltipProvider as InfoTooltipProvider,
  TooltipTrigger as InfoTooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TrendingUp,
  AlertTriangle,
  Shield,
  Activity,
  Info,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface DashboardOverview {
  total_positions: number;
  average_utilization: number;
  unread_alerts: number;
  by_prioritization: {
    Monitor: number;
    Validate: number;
    Remediate: number;
    Breached: number;
  };
}

interface TrendingData {
  as_of_date: string;
  avg_utilization: number;
  max_utilization: number;
}

interface StatsCardsProps {
  overview: DashboardOverview | null;
  trending: TrendingData[];
}

export function StatsCards({ overview, trending }: StatsCardsProps) {
  const router = useRouter();

  if (!overview) return null;

  return (
    <InfoTooltipProvider delayDuration={200}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Positions Card */}
        <Card
          className="border-slate-700 bg-slate-800/50 backdrop-blur cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
          onClick={() => router.push('/limits')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Positions</p>
                  <p className="text-3xl font-bold text-white">
                    {overview.total_positions}
                  </p>
                </div>
                <InfoTooltip>
                  <InfoTooltipTrigger asChild>
                    <button
                      className="text-slate-400 hover:text-slate-300 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </InfoTooltipTrigger>
                  <InfoTooltipContent>
                    <div className="max-w-xs space-y-2">
                      <p className="font-semibold text-white">Total Active Positions</p>
                      <p>Number of position limits currently being tracked across all markets and commodities.</p>
                      <p className="text-xs text-slate-300 mt-2">
                        <strong>Calculation:</strong> COUNT of records in limit_calculations where is_active = 1
                      </p>
                    </div>
                  </InfoTooltipContent>
                </InfoTooltip>
              </div>
              <Activity className="h-10 w-10 text-blue-500" />
            </div>
            {/* Sparkline */}
            {trending && trending.length > 0 && (
              <ResponsiveContainer width="100%" height={40}>
                <LineChart data={trending}>
                  <Line
                    type="monotone"
                    dataKey="avg_utilization"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Average Utilization Card */}
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Avg Utilization</p>
                  <p className="text-3xl font-bold text-white">
                    {overview.average_utilization.toFixed(1)}%
                  </p>
                </div>
                <InfoTooltip>
                  <InfoTooltipTrigger asChild>
                    <button
                      className="text-slate-400 hover:text-slate-300 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </InfoTooltipTrigger>
                  <InfoTooltipContent>
                    <div className="max-w-xs space-y-2">
                      <p className="font-semibold text-white">Average Utilization</p>
                      <p>The mean utilization percentage across all active positions.</p>
                      <p className="text-xs text-slate-300 mt-2">
                        <strong>Calculation:</strong> AVG(pos_pct) where pos_pct = (pos_lots / limit_lots) × 100
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Higher percentages indicate positions closer to their regulatory limits.
                      </p>
                    </div>
                  </InfoTooltipContent>
                </InfoTooltip>
              </div>
              <TrendingUp className="h-10 w-10 text-green-500" />
            </div>
            {/* Sparkline */}
            {trending && trending.length > 0 && (
              <ResponsiveContainer width="100%" height={40}>
                <LineChart data={trending}>
                  <Line
                    type="monotone"
                    dataKey="avg_utilization"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Alerts Card */}
        <Card
          className="border-slate-700 bg-slate-800/50 backdrop-blur cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/20"
          onClick={() => router.push('/alerts')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Alerts</p>
                  <p className="text-3xl font-bold text-yellow-400">
                    {overview.unread_alerts}
                  </p>
                </div>
                <InfoTooltip>
                  <InfoTooltipTrigger asChild>
                    <button
                      className="text-slate-400 hover:text-slate-300 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </InfoTooltipTrigger>
                  <InfoTooltipContent>
                    <div className="max-w-xs space-y-2">
                      <p className="font-semibold text-white">Unread Alerts</p>
                      <p>Number of unread system alerts requiring your attention.</p>
                      <p className="text-xs text-slate-300 mt-2">
                        <strong>Calculation:</strong> COUNT of alerts where read = 0
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Includes threshold breaches, approaching limits (≥70%), validation warnings, and system notifications.
                      </p>
                    </div>
                  </InfoTooltipContent>
                </InfoTooltip>
              </div>
              <AlertTriangle className="h-10 w-10 text-yellow-500" />
            </div>
            {/* Sparkline */}
            {trending && trending.length > 0 && (
              <ResponsiveContainer width="100%" height={40}>
                <LineChart data={trending}>
                  <Line
                    type="monotone"
                    dataKey="max_utilization"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Over Limit Card */}
        <Card
          className="border-slate-700 bg-slate-800/50 backdrop-blur cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:shadow-red-500/20"
          onClick={() => router.push('/limits?prioritization=Breached')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Over Limit</p>
                  <p className="text-3xl font-bold text-red-400">
                    {overview.by_prioritization.Breached}
                  </p>
                </div>
                <InfoTooltip>
                  <InfoTooltipTrigger asChild>
                    <button
                      className="text-slate-400 hover:text-slate-300 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </InfoTooltipTrigger>
                  <InfoTooltipContent>
                    <div className="max-w-xs space-y-2">
                      <p className="font-semibold text-white">Currently Over Limit</p>
                      <p>Number of positions that currently exceed their regulatory position limits.</p>
                      <p className="text-xs text-slate-300 mt-2">
                        <strong>Calculation:</strong> COUNT of positions where prioritization = 'Breached' (pos_pct ≥ 100%)
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        This shows the current state of positions. For historical breach events, see the Compliance Monitoring page.
                      </p>
                    </div>
                  </InfoTooltipContent>
                </InfoTooltip>
              </div>
              <Shield className="h-10 w-10 text-red-500" />
            </div>
            {/* Sparkline */}
            {trending && trending.length > 0 && (
              <ResponsiveContainer width="100%" height={40}>
                <LineChart data={trending}>
                  <Line
                    type="monotone"
                    dataKey="max_utilization"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </InfoTooltipProvider>
  );
}

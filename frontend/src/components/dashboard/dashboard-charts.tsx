'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip as InfoTooltip,
  TooltipContent as InfoTooltipContent,
  TooltipProvider as InfoTooltipProvider,
  TooltipTrigger as InfoTooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Info } from 'lucide-react';

const PRIORITIZATION_COLORS = {
  Monitor: '#3b82f6',
  Validate: '#eab308',
  Remediate: '#f97316',
  Breached: '#ef4444',
};

interface DashboardOverview {
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

interface CommodityData {
  reporting_limit_code: string;
  avg_utilization: number;
}

interface DashboardChartsProps {
  overview: DashboardOverview | null;
  trending: TrendingData[];
  byCommodity: CommodityData[];
}

export function DashboardCharts({ overview, trending, byCommodity }: DashboardChartsProps) {
  const router = useRouter();

  const prioritizationData = overview
    ? [
        { name: 'Monitor', value: overview.by_prioritization.Monitor, color: PRIORITIZATION_COLORS.Monitor },
        { name: 'Validate', value: overview.by_prioritization.Validate, color: PRIORITIZATION_COLORS.Validate },
        { name: 'Remediate', value: overview.by_prioritization.Remediate, color: PRIORITIZATION_COLORS.Remediate },
        { name: 'Breached', value: overview.by_prioritization.Breached, color: PRIORITIZATION_COLORS.Breached },
      ]
    : [];

  return (
    <>
      {/* Charts Row 1 - Pie and Line */}
      <InfoTooltipProvider delayDuration={200}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Prioritization Pie Chart */}
          {overview && (
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Positions by Priority</CardTitle>
                    <CardDescription className="text-slate-400">
                      Distribution across prioritization levels
                    </CardDescription>
                  </div>
                  <InfoTooltip>
                    <InfoTooltipTrigger asChild>
                      <button
                        className="text-slate-400 hover:text-slate-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="h-5 w-5" />
                      </button>
                    </InfoTooltipTrigger>
                    <InfoTooltipContent>
                      <p className="max-w-xs">Shows how positions are categorized by priority: Monitor (&lt;60%), Early Warning (60-79%), High Risk (80-99%), and Breached (≥100%)</p>
                    </InfoTooltipContent>
                  </InfoTooltip>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  {/* Pie Chart */}
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={prioritizationData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={false}
                        >
                          {prioritizationData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              stroke={entry.color}
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '12px',
                          }}
                          formatter={(value: any, name: string) => [
                            `${value} positions`,
                            name
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div className="flex-1 space-y-3">
                    {prioritizationData.map((entry, index) => {
                      const total = prioritizationData.reduce((sum, item) => sum + item.value, 0);
                      const percentage = total > 0 ? (entry.value / total * 100).toFixed(1) : '0.0';

                      return (
                        <div
                          key={`legend-${index}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/limits?prioritization=${entry.name}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              router.push(`/limits?prioritization=${entry.name}`);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`View limits for ${entry.name}`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm font-medium text-slate-300">
                              {entry.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-white">
                              {entry.value}
                            </span>
                            <span className="text-sm text-slate-400 min-w-[3rem] text-right">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trending Chart */}
          {trending && trending.length > 0 && (
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">7-Day Trend</CardTitle>
                    <CardDescription className="text-slate-400">
                      Average utilization over time
                    </CardDescription>
                  </div>
                  <InfoTooltip>
                    <InfoTooltipTrigger asChild>
                      <button
                        className="text-slate-400 hover:text-slate-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="h-5 w-5" />
                      </button>
                    </InfoTooltipTrigger>
                    <InfoTooltipContent>
                      <p className="max-w-xs">Tracks average and maximum position utilization trends over the selected time period to identify patterns and spikes</p>
                    </InfoTooltipContent>
                  </InfoTooltip>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trending}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="as_of_date"
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8' }}
                    />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avg_utilization"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Avg Utilization %"
                    />
                    <Line
                      type="monotone"
                      dataKey="max_utilization"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Max Utilization %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </InfoTooltipProvider>

      {/* Charts Row 2 - Bar and Area */}
      <InfoTooltipProvider delayDuration={200}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Bar Chart - Top Commodities */}
          {byCommodity && byCommodity.length > 0 && (
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Top Commodities by Utilization</CardTitle>
                    <CardDescription className="text-slate-400">
                      Highest risk commodities
                    </CardDescription>
                  </div>
                  <InfoTooltip>
                    <InfoTooltipTrigger asChild>
                      <button
                        className="text-slate-400 hover:text-slate-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="h-5 w-5" />
                      </button>
                    </InfoTooltipTrigger>
                    <InfoTooltipContent>
                      <p className="max-w-xs">Top 10 commodities ranked by average utilization percentage. Shows Spot Month limit data to identify which commodities need the most attention</p>
                    </InfoTooltipContent>
                  </InfoTooltip>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byCommodity.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                    <YAxis
                      dataKey="reporting_limit_code"
                      type="category"
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8' }}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar
                      dataKey="avg_utilization"
                      fill="#3b82f6"
                      name="Avg Utilization %"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Area Chart - Historical Trends */}
          {trending && trending.length > 0 && (
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Utilization Trend Area</CardTitle>
                    <CardDescription className="text-slate-400">
                      Range between min and max utilization
                    </CardDescription>
                  </div>
                  <InfoTooltip>
                    <InfoTooltipTrigger asChild>
                      <button
                        className="text-slate-400 hover:text-slate-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="h-5 w-5" />
                      </button>
                    </InfoTooltipTrigger>
                    <InfoTooltipContent>
                      <p className="max-w-xs">Visualizes average utilization trends over time with gradient fill to show the magnitude and direction of position changes</p>
                    </InfoTooltipContent>
                  </InfoTooltip>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trending}>
                    <defs>
                      <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="as_of_date"
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8' }}
                    />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avg_utilization"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorAvg)"
                      name="Avg Utilization %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </InfoTooltipProvider>
    </>
  );
}

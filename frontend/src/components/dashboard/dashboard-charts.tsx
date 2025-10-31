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
  LabelList,
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

  // Custom label renderer for bar chart
  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    const radius = 10;

    return (
      <g>
        <text
          x={x + width + 5}
          y={y + height / 2}
          fill="#f1f5f9"
          textAnchor="start"
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="600"
        >
          {value.toFixed(1)}%
        </text>
      </g>
    );
  };

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
                    <CardTitle className="text-white">Utilization Trend Analysis</CardTitle>
                    <CardDescription className="text-slate-400">
                      Track position utilization patterns over time
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
                      <p className="max-w-xs">
                        <strong>Blue Line:</strong> Average utilization across all positions<br/>
                        <strong>Red Line:</strong> Highest utilization in any single position<br/>
                        <em>Monitor trends to identify increasing risk patterns</em>
                      </p>
                    </InfoTooltipContent>
                  </InfoTooltip>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trending} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="avgGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.8}/>
                      </linearGradient>
                      <linearGradient id="maxGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#f87171" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="as_of_date"
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      label={{ value: 'Utilization %', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                      labelStyle={{ color: '#f1f5f9', fontWeight: 'bold', marginBottom: '8px' }}
                      formatter={(value: any, name: string) => [
                        `${Number(value).toFixed(2)}%`,
                        name === 'avg_utilization' ? 'Average' : 'Maximum'
                      ]}
                      labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                      formatter={(value) => value === 'avg_utilization' ? 'Average Utilization' : 'Peak Utilization'}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg_utilization"
                      stroke="url(#avgGradient)"
                      strokeWidth={3}
                      name="avg_utilization"
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6, fill: '#3b82f6' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="max_utilization"
                      stroke="url(#maxGradient)"
                      strokeWidth={3}
                      name="max_utilization"
                      dot={{ fill: '#ef4444', r: 4 }}
                      activeDot={{ r: 6, fill: '#ef4444' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <div className="text-xs text-blue-400 font-medium mb-1">CURRENT AVG</div>
                    <div className="text-2xl font-bold text-white">
                      {trending[trending.length - 1]?.avg_utilization.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <div className="text-xs text-red-400 font-medium mb-1">CURRENT MAX</div>
                    <div className="text-2xl font-bold text-white">
                      {trending[trending.length - 1]?.max_utilization.toFixed(1)}%
                    </div>
                  </div>
                </div>
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
                    <CardTitle className="text-white">Top 10 High-Risk Commodities</CardTitle>
                    <CardDescription className="text-slate-400">
                      Commodities ranked by utilization percentage
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
                      <p className="max-w-xs">
                        <strong>Top 10 commodities</strong> ranked by average utilization percentage.<br/>
                        <em>Red bars (≥80%):</em> High risk - immediate attention required<br/>
                        <em>Orange bars (60-79%):</em> Moderate risk - monitor closely<br/>
                        <em>Blue bars (&lt;60%):</em> Normal - within acceptable limits
                      </p>
                    </InfoTooltipContent>
                  </InfoTooltip>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={byCommodity.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 60, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGradient1" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="barGradient2" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#fb923c" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="barGradient3" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#f87171" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                    <XAxis
                      type="number"
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      label={{ value: 'Utilization %', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                    />
                    <YAxis
                      dataKey="commodity"
                      type="category"
                      stroke="#94a3b8"
                      tick={{ fill: '#e2e8f0', fontSize: 13, fontWeight: 700 }}
                      width={140}
                      interval={0}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                      labelStyle={{ color: '#f1f5f9', fontWeight: 'bold', marginBottom: '4px' }}
                      formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Average Utilization']}
                      cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                    />
                    <Bar
                      dataKey="avg_utilization"
                      name="Avg Utilization %"
                      radius={[0, 8, 8, 0]}
                      maxBarSize={35}
                    >
                      {byCommodity.slice(0, 10).map((entry, index) => {
                        let fillColor = 'url(#barGradient1)';
                        if (entry.avg_utilization >= 80) {
                          fillColor = 'url(#barGradient3)';
                        } else if (entry.avg_utilization >= 60) {
                          fillColor = 'url(#barGradient2)';
                        }
                        return <Cell key={`cell-${index}`} fill={fillColor} />;
                      })}
                      <LabelList
                        dataKey="avg_utilization"
                        position="right"
                        content={renderCustomBarLabel}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span className="text-slate-300">&lt;60% - Normal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-orange-500"></div>
                    <span className="text-slate-300">60-79% - Watch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span className="text-slate-300">≥80% - High Risk</span>
                  </div>
                </div>
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

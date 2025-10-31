'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboardApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface IcePositionsProps {
  className?: string;
}

interface PositionData {
  commodity: string;
  total_long: number;
  total_short: number;
  net_position: number;
  position_count: number;
  avg_utilization: number;
}

interface TableRow {
  market_location: string;
  period: string;
  limit_type: string;
  current_utilization_lots: number;
  current_utilization_pct: number;
  remaining_utilization_lots: number;
  remaining_utilization_pct: number;
  commodity: string;
  prioritization: string;
}

interface MarketLocation {
  market_location: string;
}

const ROWS_PER_PAGE = 5;

export function IcePositions({ className }: IcePositionsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [marketLocations, setMarketLocations] = useState<MarketLocation[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<string>('');

  useEffect(() => {
    loadIcePositions();
  }, [selectedMarket]);

  useEffect(() => {
    // Reset to page 1 when data changes
    setCurrentPage(1);
  }, [tableData]);

  const loadIcePositions = async () => {
    try {
      setIsLoading(true);
      const response = await dashboardApi.getIcePositions(selectedMarket || undefined);
      if (response.success) {
        setPositions(response.positions);
        setTableData(response.tableData);
        setMarketLocations(response.marketLocations || []);
      }
    } catch (error) {
      console.error('Failed to load ICE positions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(tableData.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const currentPageData = tableData.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Transform data for the bar chart showing net positions
  const chartData = positions.map(pos => ({
    name: pos.commodity,
    value: pos.net_position,
    isPositive: pos.net_position >= 0,
  }));

  // Debug logging
  console.log('ICE Positions Debug:', {
    positionsCount: positions.length,
    chartDataCount: chartData.length,
    samplePosition: positions[0],
    sampleChartData: chartData[0]
  });

  const getPrioritizationColor = (prioritization: string) => {
    switch (prioritization) {
      case 'Breached':
        return 'bg-red-500/10 text-red-400 border-red-500/50';
      case 'Remediate':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/50';
      case 'Validate':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50';
      case 'Monitor':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/50';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/50';
    }
  };

  const formatNumber = (num: number) => {
    if (Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toFixed(0);
  };

  const formatPercent = (num: number) => {
    return num.toFixed(1) + '%';
  };

  return (
    <div className={className}>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-xl font-bold text-white">ICE POSITIONS</CardTitle>
            <p className="text-sm text-slate-400 mt-1">
              AS OF {new Date().toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm font-medium hover:bg-slate-600 transition-all"
            >
              <option value="">Market Location</option>
              {marketLocations.map((loc) => (
                <option key={loc.market_location} value={loc.market_location}>
                  {loc.market_location}
                </option>
              ))}
            </select>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
          </div>
        </CardHeader>
        <CardContent>
          {/* Bar Chart */}
          <div className="mb-8">
            <div className="mb-4 bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-1">Net Position Distribution</h3>
                  <p className="text-xs text-slate-400">Positive values = Net Long | Negative values = Net Short</p>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span className="text-slate-300">Net Long</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span className="text-slate-300">Net Short</span>
                  </div>
                </div>
              </div>
            </div>
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[500px] bg-slate-700/20 rounded-lg border border-slate-600/50">
                <p className="text-slate-400 text-sm">No position data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 80, bottom: 80 }}>
                  <defs>
                    <linearGradient id="iceLongGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="iceShortGradient" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#f87171" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 600 }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval={0}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tickFormatter={formatNumber}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    label={{
                      value: 'Net Position (Lots)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#94a3b8',
                      style: { textAnchor: 'middle' }
                    }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                    formatter={(value: any) => [formatNumber(value), 'Net Position']}
                    labelStyle={{ color: '#f1f5f9', fontWeight: 'bold', marginBottom: '4px' }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  />
                  <ReferenceLine y={0} stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" />
                  <Bar dataKey="value" maxBarSize={80} fill="#3b82f6">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isPositive ? 'url(#iceLongGradient)' : 'url(#iceShortGradient)'}
                        stroke={entry.isPositive ? '#3b82f6' : '#ef4444'}
                        strokeWidth={2}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-2 font-semibold text-slate-300 whitespace-nowrap">Market Location</th>
                    <th className="text-left py-3 px-2 font-semibold text-slate-300 whitespace-nowrap hidden sm:table-cell">Period</th>
                    <th className="text-left py-3 px-2 font-semibold text-slate-300 whitespace-nowrap hidden md:table-cell">Limit Type</th>
                    <th className="text-right py-3 px-2 font-semibold text-slate-300 whitespace-nowrap">Current (Lots)</th>
                    <th className="text-right py-3 px-2 font-semibold text-slate-300 whitespace-nowrap">Current (%)</th>
                    <th className="text-right py-3 px-2 font-semibold text-slate-300 whitespace-nowrap hidden lg:table-cell">Remaining (Lots)</th>
                    <th className="text-right py-3 px-2 font-semibold text-slate-300 whitespace-nowrap hidden lg:table-cell">Remaining (%)</th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-300 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : currentPageData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      No ICE positions available
                    </td>
                  </tr>
                ) : (
                  currentPageData.map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-3 px-2 text-white font-medium">{row.market_location}</td>
                      <td className="py-3 px-2 text-slate-300 hidden sm:table-cell">
                        {row.period ? new Date(row.period).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-3 px-2 text-slate-300 hidden md:table-cell">{row.limit_type}</td>
                      <td className="py-3 px-2 text-right text-white font-mono">
                        {formatNumber(row.current_utilization_lots)}
                      </td>
                      <td className="py-3 px-2 text-right font-mono">
                        <span className={row.current_utilization_pct >= 90 ? 'text-red-400 font-bold' : row.current_utilization_pct >= 70 ? 'text-orange-400' : 'text-slate-300'}>
                          {formatPercent(row.current_utilization_pct)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono hidden lg:table-cell">
                        <span className={row.remaining_utilization_lots < 0 ? 'text-red-400' : 'text-green-400'}>
                          {row.remaining_utilization_lots < 0 ? (
                            <span className="flex items-center justify-end gap-1">
                              <TrendingDown className="h-3 w-3" />
                              {formatNumber(Math.abs(row.remaining_utilization_lots))}
                            </span>
                          ) : (
                            <span className="flex items-center justify-end gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {formatNumber(row.remaining_utilization_lots)}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono hidden lg:table-cell">
                        <span className={row.remaining_utilization_pct < 0 ? 'text-red-400' : 'text-green-400'}>
                          {formatPercent(row.remaining_utilization_pct)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge
                          variant="outline"
                          className={`${getPrioritizationColor(row.prioritization)} text-xs`}
                        >
                          {row.prioritization}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {tableData.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-700">
              <div className="text-sm text-slate-400 text-center sm:text-left">
                Showing {startIndex + 1} to {Math.min(endIndex, tableData.length)} of {tableData.length} positions
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <span className="text-sm text-slate-300 px-2 sm:px-3">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px', fontWeight: '500' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tickFormatter={formatNumber}
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                  formatter={(value: any) => [formatNumber(value), 'Net Position']}
                  labelStyle={{ color: '#f1f5f9', fontWeight: 'bold' }}
                />
                <ReferenceLine y={0} stroke="#64748b" strokeWidth={2} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isPositive ? '#3b82f6' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-2 font-semibold text-slate-300">Market Location</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-300">Period</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-300">Limit Type</th>
                  <th className="text-right py-3 px-2 font-semibold text-slate-300">Current Utilization (Lots)</th>
                  <th className="text-right py-3 px-2 font-semibold text-slate-300">Current Utilization (%)</th>
                  <th className="text-right py-3 px-2 font-semibold text-slate-300">Remaining Utilization (Lots)</th>
                  <th className="text-right py-3 px-2 font-semibold text-slate-300">Remaining Utilization (%)</th>
                  <th className="text-center py-3 px-2 font-semibold text-slate-300">Status</th>
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
                      <td className="py-3 px-2 text-slate-300">
                        {row.period ? new Date(row.period).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-3 px-2 text-slate-300">{row.limit_type}</td>
                      <td className="py-3 px-2 text-right text-white font-mono">
                        {formatNumber(row.current_utilization_lots)}
                      </td>
                      <td className="py-3 px-2 text-right font-mono">
                        <span className={row.current_utilization_pct >= 90 ? 'text-red-400' : 'text-slate-300'}>
                          {formatPercent(row.current_utilization_pct)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono">
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
                      <td className="py-3 px-2 text-right font-mono">
                        <span className={row.remaining_utilization_pct < 0 ? 'text-red-400' : 'text-green-400'}>
                          {formatPercent(row.remaining_utilization_pct)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge
                          variant="outline"
                          className={getPrioritizationColor(row.prioritization)}
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

          {/* Pagination Controls */}
          {tableData.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
              <div className="text-sm text-slate-400">
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
                  Previous
                </Button>
                <span className="text-sm text-slate-300 px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
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

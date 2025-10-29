'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkeletonTable } from '@/components/ui/skeleton';
import { Download, Search, Filter } from 'lucide-react';
import { getPrioritizationColor, formatNumber, formatPercent } from '@/lib/utils';
import { positionLimitsApi } from '@/lib/api';
import { useIsMobile } from '@/hooks/use-media-query';
import { PositionCard } from './position-card';

interface PositionLimitsTableProps {
  limitType: 'spot' | 'spot-plus' | 'one-month' | 'all-month';
  onLimitTypeChange: (type: 'spot' | 'spot-plus' | 'one-month' | 'all-month') => void;
}

export function PositionLimitsTable({ limitType, onLimitTypeChange }: PositionLimitsTableProps) {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    const fetchPositions = async () => {
      setLoading(true);
      try {
        const result = await positionLimitsApi.getAll(limitType, {
          prioritization: filterStatus !== 'all' ? filterStatus : undefined,
          search: searchTerm || undefined,
          page: currentPage,
          page_size: pageSize,
        });
        setPositions(result.data || []);

        // Update pagination metadata
        if (result.meta) {
          setTotalPages(result.meta.total_pages || 1);
          setTotalRecords(result.meta.total || 0);
        }
      } catch (error) {
        console.error('Failed to fetch positions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, [limitType, filterStatus, searchTerm, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [limitType, filterStatus, searchTerm]);

  const filteredPositions = positions;

  if (loading && positions.length === 0) {
    return <SkeletonTable rows={10} />;
  }

  return (
    <Card className="cyber-border border-purple-500/30">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg sm:text-xl">Position Limits</CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Limit Type Selector */}
            <div className="flex glass rounded-lg p-1 border border-white/10" role="group" aria-label="Limit type selection">
              {(['spot', 'spot-plus', 'one-month', 'all-month'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => onLimitTypeChange(type)}
                  className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                    limitType === type
                      ? 'bg-blue-500/30 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  aria-pressed={limitType === type}
                  aria-label={`${
                    type === 'spot' ? 'Spot' :
                    type === 'spot-plus' ? 'Spot Plus' :
                    type === 'one-month' ? 'One Month' :
                    'All Month'
                  } limit type`}
                >
                  {type === 'spot' && 'Spot'}
                  {type === 'spot-plus' && 'Spot+'}
                  {type === 'one-month' && 'One Month'}
                  {type === 'all-month' && 'All Month'}
                </button>
              ))}
            </div>

            <Button variant="cyber" size="sm" aria-label="Export position limits data">
              <Download className="w-4 h-4 mr-2" aria-hidden="true" />
              Export
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <label htmlFor="market-search" className="sr-only">Search markets</label>
            <input
              id="market-search"
              type="text"
              placeholder="Search markets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass border border-white/10 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              aria-label="Search markets by name or code"
            />
          </div>

          <label htmlFor="status-filter" className="sr-only">Filter by status</label>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 glass border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            aria-label="Filter positions by status"
          >
            <option value="all">All Status</option>
            <option value="Monitor">Monitor</option>
            <option value="Validate">Validate</option>
            <option value="Remediate">Remediate</option>
            <option value="Breached">Breached</option>
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {/* Mobile Card View */}
        {isMobile ? (
          <div className="space-y-3">
            {filteredPositions.map((position, index) => (
              <PositionCard
                key={position.id}
                position={{
                  mkt_index: position.mkt_index || position.mkt_loc_name,
                  reporting_limit_code: position.reporting_limit_code,
                  exchange_code: position.exchange_code,
                  pos_lots: position.position,
                  limit_lots: position.limit,
                  pos_pct: position.utilization,
                  prioritization: position.prioritization,
                }}
                index={index}
              />
            ))}
          </div>
        ) : (
          /* Desktop Table View */
          <div className="overflow-x-auto -mx-6 sm:mx-0" role="region" aria-label="Position limits data table">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-white/10" aria-label="Position limits">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <th scope="col" className="px-4 sm:px-6 py-3">Market</th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-right">Position</th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-right">Limit</th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-right">Utilization</th>
                    <th scope="col" className="px-4 sm:px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredPositions.map((position, index) => (
                    <tr
                      key={position.id}
                      className="hover:bg-white/5 transition-colors group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-4 sm:px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{position.mkt_loc_name}</div>
                          <div className="text-xs text-gray-400">{position.mkt_index}</div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <div className="text-sm text-white font-mono">{formatNumber(position.position, 0)}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <div className="text-sm text-gray-400 font-mono">{formatNumber(position.limit, 0)}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full transition-all duration-500 ${
                                position.utilization >= 100 ? 'bg-red-500' :
                                position.utilization >= 90 ? 'bg-orange-500' :
                                position.utilization >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(position.utilization, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold ${
                            position.utilization >= 100 ? 'text-red-400' :
                            position.utilization >= 90 ? 'text-orange-400' :
                            position.utilization >= 75 ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            {formatPercent(position.utilization)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPrioritizationColor(position.prioritization)}`}>
                          {position.prioritization}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredPositions.length === 0 && (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No positions found matching your criteria</p>
          </div>
        )}

        {/* Pagination */}
        {filteredPositions.length > 0 && (
          <nav className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4" aria-label="Table pagination">
            <div className="text-sm text-gray-400" role="status" aria-live="polite" aria-atomic="true">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} position{totalRecords !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400 mr-2" aria-current="page">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                aria-label={`Go to previous page, page ${currentPage - 1}`}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages || loading}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                aria-label={`Go to next page, page ${currentPage + 1}`}
              >
                Next
              </Button>
            </div>
          </nav>
        )}
      </CardContent>
    </Card>
  );
}

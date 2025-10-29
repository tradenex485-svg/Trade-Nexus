'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Download,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardFilters } from '@/components/dashboard/search-filters';
import { RiskCard } from './risk-card';
import { useIsMobile } from '@/hooks/use-media-query';

interface Risk {
  reporting_limit_code: string;
  mkt_index: string;
  exchange_code?: string;
  pos_lots: number;
  limit_lots: number;
  pos_pct: number;
  prioritization: string;
  limit_type: number;
}

interface TopRisksTableProps {
  risks: Risk[];
  filters: DashboardFilters;
}

export function TopRisksTable({ risks, filters }: TopRisksTableProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('pos_pct');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Check if table is scrollable
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowScrollIndicator(scrollWidth > clientWidth);
      }
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  // Filter and sort data
  const filteredAndSortedRisks = useMemo(() => {
    let filtered = risks.filter((risk: Risk) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !risk.reporting_limit_code?.toLowerCase().includes(searchLower) &&
          !risk.mkt_index?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Priority filter
      if (filters.priorities.length > 0 && !filters.priorities.includes(risk.prioritization)) {
        return false;
      }

      // Limit type filter
      if (filters.limitTypes.length > 0 && !filters.limitTypes.includes(risk.limit_type)) {
        return false;
      }

      // Utilization range filter
      if (risk.pos_pct < filters.utilizationMin || risk.pos_pct > filters.utilizationMax) {
        return false;
      }

      return true;
    });

    // Sort data
    filtered.sort((a: Risk, b: Risk) => {
      let aVal, bVal;

      switch (sortColumn) {
        case 'commodity':
          aVal = a.reporting_limit_code || '';
          bVal = b.reporting_limit_code || '';
          break;
        case 'pos_lots':
          aVal = a.pos_lots || 0;
          bVal = b.pos_lots || 0;
          break;
        case 'limit_lots':
          aVal = a.limit_lots || 0;
          bVal = b.limit_lots || 0;
          break;
        case 'pos_pct':
        default:
          aVal = a.pos_pct || 0;
          bVal = b.pos_pct || 0;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [risks, filters, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRisks.length / itemsPerPage);
  const paginatedRisks = filteredAndSortedRisks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Export to CSV
  const handleExport = () => {
    const csvData = filteredAndSortedRisks.map((risk: Risk) => ({
      Commodity: risk.reporting_limit_code,
      Market: risk.mkt_index,
      Exchange: risk.exchange_code || 'N/A',
      Position: risk.pos_lots,
      Limit: risk.limit_lots,
      'Utilization %': risk.pos_pct.toFixed(2),
      Priority: risk.prioritization,
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map((row: any) => headers.map(h => row[h]).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-risks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearFilters = () => {
    // This is handled by parent component
  };

  if (risks.length === 0) {
    return null;
  }

  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur mb-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-white">Position Risk Analysis</CardTitle>
            <CardDescription className="text-slate-400">
              {filteredAndSortedRisks.length} positions found
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Mobile Card View */}
        {isMobile ? (
          <div className="space-y-3">
            {paginatedRisks.map((risk: Risk, index: number) => (
              <RiskCard
                key={risk.mkt_index}
                risk={risk}
                index={index}
                onClick={() => router.push(`/limits?market=${risk.mkt_index}`)}
              />
            ))}

            {/* Empty State */}
            {paginatedRisks.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No positions match your filters</p>
                <Button
                  onClick={handleClearFilters}
                  variant="ghost"
                  className="mt-3"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <div className="relative">
            {/* Scroll Indicator */}
            {showScrollIndicator && (
              <div className="absolute top-0 right-0 z-10 bg-gradient-to-l from-slate-800 to-transparent w-12 h-full pointer-events-none flex items-center justify-end pr-2">
                <ChevronDown className="h-5 w-5 text-slate-400 animate-bounce rotate-[-90deg]" />
              </div>
            )}

            <div ref={scrollContainerRef} className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th
                      className="text-left p-3 text-slate-400 font-medium cursor-pointer hover:text-white"
                      onClick={() => handleSort('commodity')}
                    >
                      <div className="flex items-center gap-1">
                        Commodity
                        {sortColumn === 'commodity' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="text-left p-3 text-slate-400 font-medium">Market</th>
                    <th className="text-left p-3 text-slate-400 font-medium">Exchange</th>
                    <th
                      className="text-right p-3 text-slate-400 font-medium cursor-pointer hover:text-white"
                      onClick={() => handleSort('pos_lots')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Position
                        {sortColumn === 'pos_lots' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th
                      className="text-right p-3 text-slate-400 font-medium cursor-pointer hover:text-white"
                      onClick={() => handleSort('limit_lots')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Limit
                        {sortColumn === 'limit_lots' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th
                      className="text-right p-3 text-slate-400 font-medium cursor-pointer hover:text-white"
                      onClick={() => handleSort('pos_pct')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Utilization
                        {sortColumn === 'pos_pct' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="text-left p-3 text-slate-400 font-medium">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRisks.map((risk: Risk, index: number) => (
                    <motion.tr
                      key={risk.mkt_index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => router.push(`/limits?market=${risk.mkt_index}`)}
                    >
                      <td className="p-3 text-white">{risk.reporting_limit_code}</td>
                      <td className="p-3 text-slate-300">{risk.mkt_index}</td>
                      <td className="p-3">
                        {risk.exchange_code ? (
                          <Badge
                            variant="outline"
                            className="border-blue-500 text-blue-400 text-xs"
                          >
                            {risk.exchange_code}
                          </Badge>
                        ) : (
                          <span className="text-slate-500 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        {risk.pos_lots.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        {risk.limit_lots.toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={cn(
                            'font-semibold',
                            risk.pos_pct >= 100
                              ? 'text-red-400'
                              : risk.pos_pct >= 90
                              ? 'text-orange-400'
                              : risk.pos_pct >= 75
                              ? 'text-yellow-400'
                              : 'text-green-400'
                          )}
                        >
                          {risk.pos_pct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            risk.prioritization === 'Breached' && 'border-red-500 text-red-400',
                            risk.prioritization === 'Remediate' && 'border-orange-500 text-orange-400',
                            risk.prioritization === 'Validate' && 'border-yellow-500 text-yellow-400',
                            risk.prioritization === 'Monitor' && 'border-blue-500 text-blue-400'
                          )}
                        >
                          {risk.prioritization}
                        </Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              {/* Empty State */}
              {paginatedRisks.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No positions match your filters</p>
                  <Button
                    onClick={handleClearFilters}
                    variant="ghost"
                    className="mt-3"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-700 pt-4">
            <div className="text-sm text-slate-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredAndSortedRisks.length)} of{' '}
              {filteredAndSortedRisks.length} positions
            </div>

            <div className="flex items-center gap-2">
              {/* Items per page */}
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>

              {/* Page navigation */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm text-slate-400">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

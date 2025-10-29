'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Exchange {
  id: number;
  exchange_code: string;
  exchange_name: string;
}

interface DashboardHeaderProps {
  selectedExchange: number | null;
  exchanges: Exchange[];
  onExchangeChange: (exchangeId: number | null) => void;
  dateRange: 'today' | '7d' | '30d' | '90d';
  onDateRangeChange: (range: 'today' | '7d' | '30d' | '90d') => void;
  autoRefresh: boolean;
  refreshInterval: 30 | 60 | 300;
  onAutoRefreshChange: (enabled: boolean, interval?: 30 | 60 | 300) => void;
  onManualRefresh: () => void;
  onImportICE: () => void;
  importing: boolean;
  importStatus: string;
  lastUpdated: Date;
  isLoading: boolean;
}

export function DashboardHeader({
  selectedExchange,
  exchanges,
  onExchangeChange,
  dateRange,
  onDateRangeChange,
  autoRefresh,
  refreshInterval,
  onAutoRefreshChange,
  onManualRefresh,
  onImportICE,
  importing,
  importStatus,
  lastUpdated,
  isLoading,
}: DashboardHeaderProps) {
  return (
    <>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Position Limit Monitoring Overview</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Exchange Filter */}
          <div className="relative">
            <select
              value={selectedExchange || 'all'}
              onChange={(e) => {
                const newValue = e.target.value === 'all' ? null : parseInt(e.target.value);
                onExchangeChange(newValue);
              }}
              className={cn(
                "px-3 py-1.5 bg-slate-800 border rounded-lg text-white text-sm font-medium hover:bg-slate-700 transition-all pr-8",
                selectedExchange ? "border-blue-500 bg-blue-500/10" : "border-slate-700"
              )}
            >
              <option value="all">All Exchanges</option>
              {exchanges.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.exchange_code} - {ex.exchange_name}
                </option>
              ))}
            </select>
            {isLoading && (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500 pointer-events-none" />
            )}
          </div>
          {selectedExchange && (
            <Badge variant="outline" className="border-blue-500 text-blue-400">
              Filtered by Exchange
            </Badge>
          )}

          {/* Date Range Picker */}
          <div className="flex items-center gap-1 border border-slate-700 rounded-lg bg-slate-800/50 p-1">
            {(['today', '7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => onDateRangeChange(range)}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-all',
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                )}
              >
                {range === 'today' ? 'Today' : range.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Auto-Refresh Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'border-slate-700 bg-slate-800/50 hover:bg-slate-700',
                  autoRefresh ? 'text-green-400 border-green-500' : 'text-white'
                )}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', autoRefresh && 'animate-spin')} />
                {autoRefresh ? `${refreshInterval}s` : 'Auto-Refresh'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Auto-Refresh</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={!autoRefresh}
                onCheckedChange={() => onAutoRefreshChange(false)}
              >
                Off
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={autoRefresh && refreshInterval === 30}
                onCheckedChange={() => onAutoRefreshChange(true, 30)}
              >
                Every 30s
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={autoRefresh && refreshInterval === 60}
                onCheckedChange={() => onAutoRefreshChange(true, 60)}
              >
                Every 1m
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={autoRefresh && refreshInterval === 300}
                onCheckedChange={() => onAutoRefreshChange(true, 300)}
              >
                Every 5m
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Manual Refresh */}
          <Button
            onClick={onManualRefresh}
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Import ICE Data */}
          <Button
            onClick={onImportICE}
            disabled={importing}
            variant="outline"
            size="sm"
            className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
          >
            {importing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Last Updated Timestamp */}
      <div className="text-xs text-slate-500 mb-4">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>

      {/* Import Status */}
      {importStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'mb-6 p-4 rounded-lg border',
            importStatus.includes('Error')
              ? 'border-red-500 bg-red-500/10 text-red-400'
              : 'border-green-500 bg-green-500/10 text-green-400'
          )}
        >
          {importStatus}
        </motion.div>
      )}
    </>
  );
}

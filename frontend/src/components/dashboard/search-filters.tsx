'use client';

import { useState } from 'react';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

export interface DashboardFilters {
  search: string;
  priorities: string[];
  limitTypes: number[];
  utilizationMin: number;
  utilizationMax: number;
  sortBy: 'utilization' | 'position' | 'limit' | 'commodity';
  sortOrder: 'asc' | 'desc';
}

interface SearchFiltersProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  onClear: () => void;
}

const PRIORITIES = [
  { value: 'Breached', label: 'Breached', color: 'text-red-400' },
  { value: 'Remediate', label: 'Remediate', color: 'text-orange-400' },
  { value: 'Validate', label: 'Validate', color: 'text-yellow-400' },
  { value: 'Monitor', label: 'Monitor', color: 'text-blue-400' },
];

const LIMIT_TYPES = [
  { value: 1, label: 'Spot Month' },
  { value: 2, label: 'One Month' },
  { value: 3, label: 'All Month' },
];

const SORT_OPTIONS = [
  { value: 'utilization', label: 'Utilization %' },
  { value: 'position', label: 'Position Size' },
  { value: 'limit', label: 'Limit' },
  { value: 'commodity', label: 'Commodity' },
];

export function SearchFilters({ filters, onChange, onClear }: SearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount =
    filters.priorities.length +
    filters.limitTypes.length +
    (filters.utilizationMin > 0 || filters.utilizationMax < 100 ? 1 : 0);

  const togglePriority = (priority: string) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    onChange({ ...filters, priorities: newPriorities });
  };

  const toggleLimitType = (limitType: number) => {
    const newTypes = filters.limitTypes.includes(limitType)
      ? filters.limitTypes.filter(t => t !== limitType)
      : [...filters.limitTypes, limitType];
    onChange({ ...filters, limitTypes: newTypes });
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by commodity, market, or trader..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Filter Toggle Button */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="relative border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 bg-blue-500 text-white text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700 min-w-[140px]"
            >
              <Filter className="h-4 w-4 mr-2" />
              Sort: {SORT_OPTIONS.find(s => s.value === filters.sortBy)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={filters.sortBy === option.value}
                onCheckedChange={() => onChange({ ...filters, sortBy: option.value as any })}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Order</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={filters.sortOrder === 'desc'}
              onCheckedChange={() => onChange({ ...filters, sortOrder: 'desc' })}
            >
              Descending
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.sortOrder === 'asc'}
              onCheckedChange={() => onChange({ ...filters, sortOrder: 'asc' })}
            >
              Ascending
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters */}
        {(activeFiltersCount > 0 || filters.search) && (
          <Button
            variant="ghost"
            onClick={onClear}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4">
          {/* Priority Filters */}
          <div>
            <label className="text-sm font-medium text-slate-400 mb-2 block">
              Priority Levels
            </label>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((priority) => (
                <Button
                  key={priority.value}
                  variant="outline"
                  size="sm"
                  onClick={() => togglePriority(priority.value)}
                  className={cn(
                    'border-slate-600',
                    filters.priorities.includes(priority.value)
                      ? `bg-${priority.color.split('-')[1]}-500/20 ${priority.color} border-current`
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  {priority.label}
                  {filters.priorities.includes(priority.value) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Limit Type Filters */}
          <div>
            <label className="text-sm font-medium text-slate-400 mb-2 block">
              Limit Types
            </label>
            <div className="flex flex-wrap gap-2">
              {LIMIT_TYPES.map((limitType) => (
                <Button
                  key={limitType.value}
                  variant="outline"
                  size="sm"
                  onClick={() => toggleLimitType(limitType.value)}
                  className={cn(
                    'border-slate-600',
                    filters.limitTypes.includes(limitType.value)
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  {limitType.label}
                  {filters.limitTypes.includes(limitType.value) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Utilization Range */}
          <div>
            <label className="text-sm font-medium text-slate-400 mb-2 block">
              Utilization Range: {filters.utilizationMin}% - {filters.utilizationMax}%
            </label>
            <div className="flex gap-4 items-center">
              <input
                type="range"
                min="0"
                max="100"
                value={filters.utilizationMin}
                onChange={(e) => onChange({ ...filters, utilizationMin: parseInt(e.target.value) })}
                className="flex-1"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={filters.utilizationMax}
                onChange={(e) => onChange({ ...filters, utilizationMax: parseInt(e.target.value) })}
                className="flex-1"
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Min: {filters.utilizationMin}%</span>
              <span>Max: {filters.utilizationMax}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

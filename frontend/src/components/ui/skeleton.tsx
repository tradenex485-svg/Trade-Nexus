'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-700/50', className)}
      {...props}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass border border-white/10 rounded-lg p-6', className)}>
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-32 mb-4" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass border border-white/10 rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="border-b border-white/10 bg-slate-800/50 p-4">
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-4" />
          ))}
        </div>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-white/10">
        {[...Array(rows)].map((_, i) => (
          <div key={`row-${i}`} className="p-4">
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, j) => (
                <Skeleton key={`cell-${i}-${j}`} className="h-4" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={`stat-${i}`} className="glass border border-white/10 rounded-lg p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn('glass border border-white/10 rounded-lg p-6', className)}>
      <Skeleton className="h-6 w-48 mb-6" />
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={`chart-bar-${i}`} className="flex items-center gap-3">
            <Skeleton className="h-2 w-20" />
            <Skeleton className="h-8 flex-1" style={{ width: `${Math.random() * 50 + 30}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={`list-item-${i}`} className="glass border border-white/10 rounded-lg p-4">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <SkeletonStats count={4} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>

      {/* Table */}
      <SkeletonTable rows={8} />
    </div>
  );
}

export default Skeleton;

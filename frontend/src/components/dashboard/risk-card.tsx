'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, AlertCircle } from 'lucide-react';

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

interface RiskCardProps {
  risk: Risk;
  index: number;
  onClick: () => void;
}

export function RiskCard({ risk, index, onClick }: RiskCardProps) {
  const utilizationColor =
    risk.pos_pct >= 100
      ? 'text-red-400'
      : risk.pos_pct >= 90
      ? 'text-orange-400'
      : risk.pos_pct >= 75
      ? 'text-yellow-400'
      : 'text-green-400';

  const priorityConfig = {
    Breached: { color: 'border-red-500 text-red-400 bg-red-500/10', icon: AlertCircle },
    Remediate: { color: 'border-orange-500 text-orange-400 bg-orange-500/10', icon: AlertCircle },
    Validate: { color: 'border-yellow-500 text-yellow-400 bg-yellow-500/10', icon: TrendingUp },
    Monitor: { color: 'border-blue-500 text-blue-400 bg-blue-500/10', icon: TrendingUp },
  };

  const config = priorityConfig[risk.prioritization as keyof typeof priorityConfig] || priorityConfig.Monitor;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg border cursor-pointer transition-all',
        'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600',
        'active:scale-98'
      )}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white truncate mb-1">
            {risk.reporting_limit_code}
          </h3>
          <p className="text-sm text-slate-400 truncate">
            {risk.mkt_index}
          </p>
        </div>
        <Icon className={cn('h-5 w-5 ml-2 flex-shrink-0', utilizationColor)} />
      </div>

      {/* Utilization Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">Utilization</span>
          <span className={cn('text-lg font-bold', utilizationColor)}>
            {risk.pos_pct.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(risk.pos_pct, 100)}%` }}
            transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
            className={cn(
              'h-full rounded-full',
              risk.pos_pct >= 100
                ? 'bg-red-500'
                : risk.pos_pct >= 90
                ? 'bg-orange-500'
                : risk.pos_pct >= 75
                ? 'bg-yellow-500'
                : 'bg-green-500'
            )}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-slate-700/30 rounded p-2">
          <p className="text-xs text-slate-400 mb-0.5">Position</p>
          <p className="text-sm font-semibold text-white">
            {risk.pos_lots.toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-700/30 rounded p-2">
          <p className="text-xs text-slate-400 mb-0.5">Limit</p>
          <p className="text-sm font-semibold text-white">
            {risk.limit_lots.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Footer Row */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
        <Badge
          variant="outline"
          className={cn('text-xs', config.color)}
        >
          {risk.prioritization}
        </Badge>
        {risk.exchange_code && (
          <Badge
            variant="outline"
            className="border-blue-500 text-blue-400 text-xs"
          >
            {risk.exchange_code}
          </Badge>
        )}
      </div>
    </motion.div>
  );
}

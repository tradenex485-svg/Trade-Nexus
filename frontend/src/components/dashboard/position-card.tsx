/**
 * Position Card Component
 * Mobile-optimized card view for position limits
 */

'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Shield,
  ArrowRight,
} from 'lucide-react';

interface Position {
  mkt_index: string;
  reporting_limit_code?: string;
  exchange_code?: string;
  pos_lots: number;
  limit_lots: number;
  pos_pct: number;
  prioritization: string;
}

interface PositionCardProps {
  position: Position;
  index: number;
  onClick?: () => void;
}

export function PositionCard({ position, index, onClick }: PositionCardProps) {
  const utilizationPercent = position.pos_pct || 0;
  const isBreached = utilizationPercent >= 100;
  const isHighRisk = utilizationPercent >= 90;
  const isWarning = utilizationPercent >= 75;

  // Determine card styling based on utilization
  const getBorderColor = () => {
    if (isBreached) return 'border-red-500/50';
    if (isHighRisk) return 'border-orange-500/50';
    if (isWarning) return 'border-yellow-500/50';
    return 'border-slate-700';
  };

  const getBackgroundGlow = () => {
    if (isBreached) return 'bg-red-500/5';
    if (isHighRisk) return 'bg-orange-500/5';
    if (isWarning) return 'bg-yellow-500/5';
    return 'bg-slate-800/50';
  };

  const getStatusIcon = () => {
    if (isBreached) return <AlertCircle className="h-5 w-5 text-red-400" />;
    if (isHighRisk) return <TrendingUp className="h-5 w-5 text-orange-400" />;
    if (isWarning) return <TrendingDown className="h-5 w-5 text-yellow-400" />;
    return <Shield className="h-5 w-5 text-green-400" />;
  };

  const getUtilizationColor = () => {
    if (isBreached) return 'text-red-400';
    if (isHighRisk) return 'text-orange-400';
    if (isWarning) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getPriorityColor = (priority: string) => {
    const priorityLower = priority?.toLowerCase() || '';
    if (priorityLower.includes('breach')) return 'border-red-500 text-red-400 bg-red-500/10';
    if (priorityLower.includes('remediate')) return 'border-orange-500 text-orange-400 bg-orange-500/10';
    if (priorityLower.includes('validate')) return 'border-yellow-500 text-yellow-400 bg-yellow-500/10';
    if (priorityLower.includes('monitor')) return 'border-blue-500 text-blue-400 bg-blue-500/10';
    return 'border-slate-500 text-slate-400 bg-slate-500/10';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
    >
      <Card
        className={cn(
          'border-2 backdrop-blur cursor-pointer hover:shadow-lg transition-all duration-200',
          getBorderColor(),
          getBackgroundGlow(),
          onClick && 'active:scale-98'
        )}
      >
        <div className="p-4 space-y-3">
          {/* Header: Market & Exchange */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <h3 className="font-semibold text-white text-lg">
                  {position.reporting_limit_code || position.mkt_index}
                </h3>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {position.mkt_index}
              </p>
            </div>

            {position.exchange_code && (
              <Badge
                variant="outline"
                className="border-blue-500 text-blue-400 bg-blue-500/10 text-xs"
              >
                {position.exchange_code}
              </Badge>
            )}
          </div>

          {/* Utilization Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Utilization</span>
              <span className={cn('font-bold text-lg', getUtilizationColor())}>
                {utilizationPercent.toFixed(1)}%
              </span>
            </div>

            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                transition={{ duration: 0.6, delay: index * 0.05 + 0.2 }}
                className={cn(
                  'h-full rounded-full',
                  isBreached && 'bg-red-500',
                  isHighRisk && !isBreached && 'bg-orange-500',
                  isWarning && !isHighRisk && 'bg-yellow-500',
                  !isWarning && 'bg-green-500'
                )}
              />
            </div>
          </div>

          {/* Position Details Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Position</p>
              <p className="text-base font-semibold text-white">
                {position.pos_lots?.toLocaleString() || '0'}
              </p>
            </div>

            <div className="space-y-1 text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Limit</p>
              <p className="text-base font-semibold text-white">
                {position.limit_lots?.toLocaleString() || '0'}
              </p>
            </div>
          </div>

          {/* Status Badge & Action */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <Badge
              variant="outline"
              className={cn('text-xs font-medium', getPriorityColor(position.prioritization))}
            >
              {position.prioritization || 'Unknown'}
            </Badge>

            {onClick && (
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

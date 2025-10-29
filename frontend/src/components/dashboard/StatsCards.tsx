'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface StatsCardsProps {
  counts: {
    monitor: number;
    validate: number;
    remediate: number;
    breached: number;
    total: number;
  };
}

export function StatsCards({ counts }: StatsCardsProps) {
  const stats = [
    {
      title: 'Breached',
      value: (counts?.breached ?? 0).toString(),
      change: 'Requires immediate action',
      trend: 'up' as const,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/50',
    },
    {
      title: 'Remediate',
      value: (counts?.remediate ?? 0).toString(),
      change: 'Action needed soon',
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/50',
    },
    {
      title: 'Validate',
      value: (counts?.validate ?? 0).toString(),
      change: 'Requires validation',
      trend: 'stable' as const,
      icon: TrendingUp,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/50',
    },
    {
      title: 'Monitor',
      value: (counts?.monitor ?? 0).toString(),
      change: 'All healthy',
      trend: 'stable' as const,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {stats.map((stat, index) => (
        <Card
          key={stat.title}
          className={`cyber-border ${stat.borderColor} overflow-hidden group hover:scale-105 transition-transform duration-300`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-400 mb-1">{stat.title}</p>
                <p className="text-3xl sm:text-4xl font-bold text-white mb-2">{stat.value}</p>
                <div className="flex items-center space-x-1">
                  {stat.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-400" />}
                  {stat.trend === 'stable' && <span className="w-4 h-4" />}
                  <span className="text-xs text-gray-400">{stat.change}</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor} group-hover:animate-pulse`}>
                <stat.icon className={`w-6 h-6 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent' }} />
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${stat.color} animate-pulse`}
                style={{ width: `${(parseInt(stat.value) / 200) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

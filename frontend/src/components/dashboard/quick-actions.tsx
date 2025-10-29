'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, AlertTriangle, Eye } from 'lucide-react';

interface QuickActionsProps {
  unreadCount: number;
}

export function QuickActions({ unreadCount }: QuickActionsProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card
        className="border-slate-700 bg-slate-800/50 backdrop-blur hover:bg-slate-700/50 cursor-pointer transition-all"
        onClick={() => router.push('/limits')}
      >
        <CardContent className="p-6 flex items-center gap-4">
          <Activity className="h-10 w-10 text-blue-500" />
          <div>
            <h3 className="text-white font-semibold">View All Limits</h3>
            <p className="text-sm text-slate-400">Browse position limits</p>
          </div>
        </CardContent>
      </Card>

      <Card
        className="border-slate-700 bg-slate-800/50 backdrop-blur hover:bg-slate-700/50 cursor-pointer transition-all"
        onClick={() => router.push('/alerts')}
      >
        <CardContent className="p-6 flex items-center gap-4">
          <AlertTriangle className="h-10 w-10 text-yellow-500" />
          <div>
            <h3 className="text-white font-semibold">View Alerts</h3>
            <p className="text-sm text-slate-400">{unreadCount} unread alerts</p>
          </div>
        </CardContent>
      </Card>

      <Card
        className="border-slate-700 bg-slate-800/50 backdrop-blur hover:bg-slate-700/50 cursor-pointer transition-all"
        onClick={() => router.push('/reports')}
      >
        <CardContent className="p-6 flex items-center gap-4">
          <Eye className="h-10 w-10 text-green-500" />
          <div>
            <h3 className="text-white font-semibold">Generate Report</h3>
            <p className="text-sm text-slate-400">Compliance reports</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

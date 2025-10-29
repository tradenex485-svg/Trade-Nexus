'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { PositionLimitsTable } from '@/components/dashboard/PositionLimitsTable';

export default function LimitsPage() {
  const [selectedLimitType, setSelectedLimitType] = useState<'spot' | 'spot-plus' | 'one-month' | 'all-month'>('spot');

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Position Limits</h1>
            <p className="text-slate-400">View and manage all position limits across markets</p>
          </div>

          <PositionLimitsTable
            limitType={selectedLimitType}
            onLimitTypeChange={setSelectedLimitType}
          />
        </div>
      </div>
    </AuthGuard>
  );
}

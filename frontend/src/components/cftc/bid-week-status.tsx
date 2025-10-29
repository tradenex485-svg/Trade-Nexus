'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { bidWeekApi } from '@/lib/api';
import { Calendar, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BidWeekExchange {
  exchange_code: string;
  current_date: string;
  is_in_bid_week: boolean;
  bid_week_start: string;
  bid_week_end: string;
  spot_month: string;
  current_month: string;
  good_business_days_count: number;
  days_into_bid_week?: number;
  days_until_bid_week?: number;
}

export function BidWeekStatus() {
  const [exchanges, setExchanges] = useState<BidWeekExchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBidWeekStatus();
  }, []);

  const loadBidWeekStatus = async () => {
    try {
      setError(null);
      const data = await bidWeekApi.getStatusAll();
      setExchanges(data.exchanges || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load bid week status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Bid Week Status
          </CardTitle>
          <CardDescription>Loading bid week information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-700/50 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Bid Week Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Bid Week Status
        </CardTitle>
        <CardDescription>
          Current bid week periods for CFTC position limit calculations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {exchanges.map((exchange) => (
          <div
            key={exchange.exchange_code}
            className={cn(
              'p-4 rounded-lg border transition-colors',
              exchange.is_in_bid_week
                ? 'bg-orange-500/10 border-orange-500/50'
                : 'bg-slate-700/30 border-slate-600'
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-white">
                    {exchange.exchange_code}
                  </h3>
                  <Badge
                    variant={exchange.is_in_bid_week ? 'destructive' : 'secondary'}
                    className={cn(
                      exchange.is_in_bid_week
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : 'bg-slate-600'
                    )}
                  >
                    {exchange.is_in_bid_week ? (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        IN BID WEEK
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Normal Period
                      </>
                    )}
                  </Badge>
                </div>
                <p className="text-sm text-slate-400">
                  Last {exchange.good_business_days_count} Good Business Days
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-slate-400 text-xs mb-1">Bid Week Period</p>
                <p className="text-white font-medium">
                  {new Date(exchange.bid_week_start).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  -{' '}
                  {new Date(exchange.bid_week_end).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-1">Spot Month</p>
                <p className="text-white font-medium">
                  {new Date(exchange.spot_month).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-1">Current Month</p>
                <p className="text-white font-medium">
                  {new Date(exchange.current_month).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-1">Status</p>
                <p className="text-white font-medium flex items-center gap-1">
                  {exchange.is_in_bid_week ? (
                    <>
                      <Clock className="h-3 w-3 text-orange-400" />
                      Day {exchange.days_into_bid_week} of{' '}
                      {exchange.good_business_days_count}
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-400" />
                      {exchange.days_until_bid_week
                        ? `${exchange.days_until_bid_week} days until`
                        : 'Normal trading'}
                    </>
                  )}
                </p>
              </div>
            </div>

            {exchange.is_in_bid_week && (
              <Alert className="mt-3 border-orange-500/50 bg-orange-500/10">
                <AlertCircle className="h-4 w-4 text-orange-400" />
                <AlertDescription className="text-orange-200 text-xs">
                  During bid week, spot month becomes <strong>{new Date(exchange.spot_month).toLocaleDateString('en-US', { month: 'long' })}</strong> for position limit calculations
                </AlertDescription>
              </Alert>
            )}
          </div>
        ))}

        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-400">
            <strong>Bid Week:</strong> The last N Good Business Days (GBDs) of each month.
            ICE uses 5 GBDs, CME/NYMEX use 3 GBDs. During bid week, the spot month shifts to
            the following month for CFTC position limit calculations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

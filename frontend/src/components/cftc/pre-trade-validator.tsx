'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { preTradeValidationApi } from '@/lib/api';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationResult {
  is_valid: boolean;
  is_blocked?: boolean;
  block_reason?: string;
  position_after_trade: number;
  limit: number;
  utilization_percent: number;
  utilization_status: 'COMPLIANT' | 'WARNING' | 'BREACH';
  warnings: string[];
  errors: string[];
  metadata: any;
}

export function PreTradeValidator() {
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [marketCode, setMarketCode] = useState('');
  const [contractMonth, setContractMonth] = useState('');
  const [quantity, setQuantity] = useState('');
  const [dealType, setDealType] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [tradeDate, setTradeDate] = useState(() => new Date().toISOString().split('T')[0]);

  const handleValidate = async () => {
    if (!marketCode || !contractMonth || !quantity) {
      setError('Market Code, Contract Month, and Quantity are required');
      return;
    }

    try {
      setValidating(true);
      setError(null);
      setResult(null);

      const data = await preTradeValidationApi.validateTrade({
        market_code: marketCode,
        contract_month: contractMonth,
        quantity: parseFloat(quantity),
        deal_type: dealType || undefined,
        counterparty: counterparty || undefined,
        trade_date: tradeDate,
      });

      setResult(data.validation);
    } catch (err: any) {
      // If the API returns 403 (blocked), we might still have validation data
      if (err.response?.status === 403 && err.response?.data?.validation) {
        setResult(err.response.data.validation);
        setError(err.response.data.message || 'Trade blocked due to position limit breach');
      } else {
        setError(err.message || 'Validation failed');
      }
    } finally {
      setValidating(false);
    }
  };

  const handleReset = () => {
    setMarketCode('');
    setContractMonth('');
    setQuantity('');
    setDealType('');
    setCounterparty('');
    setTradeDate(new Date().toISOString().split('T')[0]);
    setResult(null);
    setError(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'bg-green-500/10 text-green-400 border-green-500/50';
      case 'WARNING':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50';
      case 'BREACH':
        return 'bg-red-500/10 text-red-400 border-red-500/50';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return <CheckCircle className="h-8 w-8 text-green-400" />;
      case 'WARNING':
        return <AlertTriangle className="h-8 w-8 text-yellow-400" />;
      case 'BREACH':
        return <XCircle className="h-8 w-8 text-red-400" />;
      default:
        return <Shield className="h-8 w-8 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Pre-Trade Validation
          </CardTitle>
          <CardDescription>
            Validate trades against position limits before execution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Input Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Market Code *
              </label>
              <Input
                placeholder="e.g., HH"
                value={marketCode}
                onChange={(e) => setMarketCode(e.target.value.toUpperCase())}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Contract Month *
              </label>
              <input
                type="month"
                value={contractMonth}
                onChange={(e) => setContractMonth(e.target.value + '-01')}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Quantity (Lots) *
              </label>
              <Input
                type="number"
                placeholder="e.g., 1000"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                Positive for long, negative for short
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Trade Date
              </label>
              <input
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Deal Type
              </label>
              <select
                value={dealType}
                onChange={(e) => setDealType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Deal Type</option>
                <option value="FINANCIAL">Financial</option>
                <option value="PHYSICAL">Physical</option>
                <option value="COMM-PHYS">Commodity Physical (Excluded)</option>
                <option value="COMM-STOR">Commodity Storage (Excluded)</option>
                <option value="CASH">Cash (Excluded)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Counterparty
              </label>
              <Input
                placeholder="Optional"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleValidate}
              disabled={validating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {validating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Validate Trade
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={validating}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Reset
            </Button>
          </div>

          {/* Validation Result */}
          {result && (
            <Card
              className={cn(
                'border-2',
                result.is_blocked
                  ? 'bg-red-500/5 border-red-500/50'
                  : result.is_valid
                  ? 'bg-green-500/5 border-green-500/50'
                  : 'bg-red-500/5 border-red-500/50'
              )}
            >
              <CardHeader>
                {/* Blocked Trade Warning Banner */}
                {result.is_blocked && (
                  <Alert variant="destructive" className="mb-4">
                    <XCircle className="h-5 w-5" />
                    <AlertDescription className="font-semibold text-base">
                      🚫 TRADE EXECUTION BLOCKED
                      {result.block_reason && (
                        <p className="mt-2 text-sm font-normal">{result.block_reason}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.utilization_status)}
                    <div>
                      <CardTitle
                        className={cn(
                          'text-xl',
                          result.is_blocked
                            ? 'text-red-400'
                            : result.is_valid
                            ? 'text-green-400'
                            : 'text-red-400'
                        )}
                      >
                        {result.is_blocked
                          ? '🔒 Trade Blocked'
                          : result.is_valid
                          ? 'Trade Approved'
                          : 'Trade Rejected'}
                      </CardTitle>
                      <CardDescription>
                        Validation Status: {result.utilization_status}
                        {result.is_blocked && ' (BLOCKED)'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={getStatusColor(result.utilization_status)}
                  >
                    {result.utilization_percent.toFixed(1)}% Utilized
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Position Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-400 mb-1">Current Position</p>
                    <p className="text-lg font-semibold text-white">
                      {result.metadata.current_position?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-400 mb-1">Position After Trade</p>
                    <p className="text-lg font-semibold text-white">
                      {result.position_after_trade.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-400 mb-1">Position Limit</p>
                    <p className="text-lg font-semibold text-white">
                      {result.limit.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Utilization Bar */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">Utilization</span>
                    <span className="text-sm font-semibold text-white">
                      {result.utilization_percent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all',
                        result.utilization_status === 'COMPLIANT'
                          ? 'bg-green-500'
                          : result.utilization_status === 'WARNING'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      )}
                      style={{ width: `${Math.min(result.utilization_percent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <Alert className="bg-yellow-900/20 border-yellow-500/50">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-yellow-200">
                      <ul className="list-disc list-inside space-y-1">
                        {result.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Errors */}
                {result.errors.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {result.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Metadata */}
                {result.metadata && (
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs font-semibold text-slate-400 mb-2">
                      Validation Details:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      {result.metadata.spot_month && (
                        <div>
                          <span className="text-slate-500">Spot Month:</span>{' '}
                          {result.metadata.spot_month}
                        </div>
                      )}
                      {result.metadata.bid_week_active !== undefined && (
                        <div>
                          <span className="text-slate-500">Bid Week:</span>{' '}
                          {result.metadata.bid_week_active ? 'Active' : 'Inactive'}
                        </div>
                      )}
                      {result.metadata.diminishing_factor && (
                        <div>
                          <span className="text-slate-500">Diminishing Factor:</span>{' '}
                          {(result.metadata.diminishing_factor * 100).toFixed(0)}%
                        </div>
                      )}
                      {result.metadata.exemption_applied && (
                        <div className="col-span-2 text-green-400">
                          ✓ Exemption Applied
                        </div>
                      )}
                      {result.metadata.filtered_deal_type && (
                        <div className="col-span-2 text-blue-400">
                          ℹ Deal Type Excluded from Position Limits
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

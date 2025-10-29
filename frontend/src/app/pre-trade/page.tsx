'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth-store';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { preTradeApi, marketLimitsApi, approvalsApi } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Shield,
  FileText,
  Building2,
  Scale,
  Save,
  FolderOpen,
  Trash2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PreTradePage() {
  const { token } = useAuthStore();
  const [markets, setMarkets] = useState<any[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [marketsError, setMarketsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<any>(null);
  const [recentChecks, setRecentChecks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  const [formData, setFormData] = useState({
    marketLocation: '',
    commodityCode: '',
    contractMonth: '',
    tradeSide: 'BUY',
    quantity: '',
    limitType: 1,
  });

  useEffect(() => {
    // Wait for token before loading data
    if (!token) return;

    loadMarkets();
    loadRecentChecks();
    loadTemplates();
  }, [token]);

  const loadMarkets = async () => {
    setMarketsLoading(true);
    setMarketsError('');
    try {
      console.log('[PreTrade] Loading markets...');
      const response = await marketLimitsApi.getAll();
      console.log('[PreTrade] Markets response:', response);

      if (response.data && Array.isArray(response.data)) {
        setMarkets(response.data);
        console.log(`[PreTrade] Loaded ${response.data.length} markets`);
      } else {
        console.warn('[PreTrade] Invalid markets data:', response);
        setMarkets([]);
        setMarketsError('Invalid market data received');
      }
    } catch (error: any) {
      console.error('[PreTrade] Failed to load markets:', error);
      setMarketsError(error.message || 'Failed to load markets. You may not have permission to view market limits.');
      setMarkets([]);
    } finally {
      setMarketsLoading(false);
    }
  };

  const loadRecentChecks = async () => {
    try {
      const response = await preTradeApi.getChecks({ limit: 10 });
      setRecentChecks(response.data || []);
    } catch (error) {
      console.error('Failed to load recent checks:', error);
    }
  };

  const loadTemplates = () => {
    try {
      const stored = localStorage.getItem('trade-templates');
      if (stored) {
        setTemplates(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const saveTemplate = () => {
    const templateName = prompt('Enter a name for this trade template:');
    if (!templateName) return;

    const newTemplate = {
      id: Date.now(),
      name: templateName,
      ...formData,
      createdAt: new Date().toISOString(),
    };

    const updated = [...templates, newTemplate];
    setTemplates(updated);
    localStorage.setItem('trade-templates', JSON.stringify(updated));
    alert(`Template "${templateName}" saved!`);
  };

  const loadTemplate = (template: any) => {
    setFormData({
      marketLocation: template.marketLocation,
      commodityCode: template.commodityCode,
      contractMonth: template.contractMonth,
      tradeSide: template.tradeSide,
      quantity: template.quantity,
      limitType: template.limitType,
    });
    setShowTemplates(false);
  };

  const deleteTemplate = (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    localStorage.setItem('trade-templates', JSON.stringify(updated));
  };

  const handleMarketSelect = (market: any) => {
    setFormData({
      ...formData,
      marketLocation: market.unit_of_trading || market.commodity_code,
      commodityCode: market.commodity_code,
    });
  };

  const handleValidate = async () => {
    if (!formData.marketLocation || !formData.commodityCode || !formData.contractMonth || !formData.quantity) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await preTradeApi.validate({
        marketLocation: formData.marketLocation,
        commodityCode: formData.commodityCode,
        contractMonth: formData.contractMonth,
        tradeSide: formData.tradeSide as 'BUY' | 'SELL',
        quantity: parseFloat(formData.quantity),
        limitType: formData.limitType,
      });
      setValidation(response.validation);
      loadRecentChecks(); // Refresh the recent checks
    } catch (error: any) {
      alert(`Validation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      marketLocation: '',
      commodityCode: '',
      contractMonth: '',
      tradeSide: 'BUY',
      quantity: '',
      limitType: 1,
    });
    setValidation(null);
  };

  const handleSubmitForApproval = async () => {
    if (!validation || !validation.checkId) {
      alert('Please validate the trade first');
      return;
    }

    const urgency = prompt('Select urgency level (low/normal/high/critical):', 'normal');
    if (!urgency || !['low', 'normal', 'high', 'critical'].includes(urgency)) {
      alert('Invalid urgency level');
      return;
    }

    const notes = prompt('Add any notes or justification (optional):');

    setSubmittingApproval(true);
    try {
      await approvalsApi.create({
        pre_trade_check_id: validation.checkId,
        urgency: urgency as any,
      });

      alert('Trade submitted for approval successfully! You will be notified when it is reviewed.');
      setValidation(null);
      setFormData({
        marketLocation: '',
        commodityCode: '',
        contractMonth: '',
        tradeSide: 'BUY',
        quantity: '',
        limitType: 1,
      });
    } catch (error: any) {
      alert(`Failed to submit for approval: ${error.message}`);
    } finally {
      setSubmittingApproval(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'requires_approval':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'blocked':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'border-green-500 text-green-400';
      case 'requires_approval':
        return 'border-yellow-500 text-yellow-400';
      case 'blocked':
        return 'border-red-500 text-red-400';
      default:
        return 'border-slate-500 text-slate-400';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'border-green-500 text-green-400';
      case 'medium':
        return 'border-yellow-500 text-yellow-400';
      case 'high':
        return 'border-orange-500 text-orange-400';
      case 'critical':
        return 'border-red-500 text-red-400';
      default:
        return 'border-slate-500 text-slate-400';
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                <Shield className="h-8 w-8 text-blue-500" />
                Pre-Trade Validation
              </h1>
              <p className="text-slate-400">
                Validate trades against position limits and ICE, CFTC, CME, NYMEX regulatory rules before execution
              </p>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <Button
                onClick={() => setShowTemplates(!showTemplates)}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Templates ({templates.length})
              </Button>
              <Button
                onClick={saveTemplate}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                disabled={!formData.marketLocation || !formData.commodityCode}
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Template
              </Button>
            </div>

            {/* Templates Panel */}
            {showTemplates && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">Saved Templates</CardTitle>
                    <CardDescription className="text-slate-400">
                      Quick-load frequently used trade configurations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {templates.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">
                        No templates saved yet. Fill out the form and click "Save as Template"
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            className="p-3 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-slate-600 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-white font-medium text-sm">{template.name}</h4>
                              <Button
                                onClick={() => deleteTemplate(template.id)}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="space-y-1 text-xs text-slate-400 mb-3">
                              <p>Market: {template.marketLocation}</p>
                              <p>Commodity: {template.commodityCode}</p>
                              <p>
                                {template.tradeSide} {template.quantity} lots
                              </p>
                              <div className="flex items-center gap-1 text-slate-500 mt-2">
                                <Clock className="h-3 w-3" />
                                {new Date(template.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <Button
                              onClick={() => loadTemplate(template)}
                              size="sm"
                              className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                              Load Template
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Trade Input Form */}
                <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">Trade Details</CardTitle>
                    <CardDescription className="text-slate-400">
                      Enter trade information to validate against limits
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Market Selection */}
                    <div>
                      <Label className="text-slate-300">Select Market</Label>

                      {/* Search Bar */}
                      <div className="mt-2">
                        <Input
                          type="text"
                          placeholder="Search markets by code or commodity..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </div>

                      {/* Loading State */}
                      {marketsLoading && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className="h-10 rounded-md bg-slate-700 animate-pulse"
                            />
                          ))}
                        </div>
                      )}

                      {/* Error State */}
                      {marketsError && !marketsLoading && (
                        <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/50">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-red-400 text-sm">{marketsError}</p>
                              <Button
                                onClick={loadMarkets}
                                variant="outline"
                                size="sm"
                                className="mt-2 border-red-500 text-red-400 hover:bg-red-500/10"
                              >
                                Retry
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Markets Grid */}
                      {!marketsLoading && !marketsError && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-64 overflow-y-auto">
                          {markets
                            .filter((market) => {
                              if (!searchTerm) return true;
                              const search = searchTerm.toLowerCase();
                              return (
                                market.unit_of_trading?.toLowerCase().includes(search) ||
                                market.commodity_code?.toLowerCase().includes(search) ||
                                market.contract_name?.toLowerCase().includes(search)
                              );
                            })
                            .slice(0, 24)
                            .map((market) => {
                              const marketCode = market.unit_of_trading || market.commodity_code;
                              return (
                                <Button
                                  key={market.id}
                                  variant={
                                    formData.marketLocation === marketCode ? 'default' : 'outline'
                                  }
                                  className={cn(
                                    'justify-start text-sm truncate',
                                    formData.marketLocation === marketCode
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                                  )}
                                  onClick={() => handleMarketSelect(market)}
                                  title={`${marketCode} - ${market.contract_name || 'N/A'}`}
                                >
                                  {marketCode || 'Unknown Market'}
                                </Button>
                              );
                            })}
                          {markets.length === 0 && (
                            <div className="col-span-full text-center py-8 text-slate-400">
                              No markets available
                            </div>
                          )}
                          {searchTerm && markets.filter((market) => {
                            const search = searchTerm.toLowerCase();
                            return (
                              market.unit_of_trading?.toLowerCase().includes(search) ||
                              market.commodity_code?.toLowerCase().includes(search) ||
                              market.contract_name?.toLowerCase().includes(search)
                            );
                          }).length === 0 && (
                            <div className="col-span-full text-center py-8 text-slate-400">
                              No markets match "{searchTerm}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Commodity Code */}
                    <div>
                      <Label className="text-slate-300">Commodity Code</Label>
                      <Input
                        value={formData.commodityCode}
                        onChange={(e) => setFormData({ ...formData, commodityCode: e.target.value })}
                        placeholder="e.g., C"
                        className="bg-slate-900 border-slate-700 text-white mt-2"
                      />
                    </div>

                    {/* Contract Month */}
                    <div>
                      <Label className="text-slate-300">Contract Month</Label>
                      <Input
                        type="date"
                        value={formData.contractMonth}
                        onChange={(e) => setFormData({ ...formData, contractMonth: e.target.value })}
                        className="bg-slate-900 border-slate-700 text-white mt-2"
                      />
                    </div>

                    {/* Trade Side */}
                    <div>
                      <Label className="text-slate-300">Trade Side</Label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant={formData.tradeSide === 'BUY' ? 'default' : 'outline'}
                          className={cn(
                            'flex-1',
                            formData.tradeSide === 'BUY'
                              ? 'bg-green-600 text-white border-green-600'
                              : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                          )}
                          onClick={() => setFormData({ ...formData, tradeSide: 'BUY' })}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          BUY
                        </Button>
                        <Button
                          variant={formData.tradeSide === 'SELL' ? 'default' : 'outline'}
                          className={cn(
                            'flex-1',
                            formData.tradeSide === 'SELL'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                          )}
                          onClick={() => setFormData({ ...formData, tradeSide: 'SELL' })}
                        >
                          <TrendingDown className="h-4 w-4 mr-2" />
                          SELL
                        </Button>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div>
                      <Label className="text-slate-300">Quantity (Lots)</Label>
                      <Input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="e.g., 100"
                        className="bg-slate-900 border-slate-700 text-white mt-2"
                      />
                    </div>

                    {/* Limit Type */}
                    <div>
                      <Label className="text-slate-300">Limit Type</Label>
                      <div className="flex gap-2 mt-2">
                        {[
                          { value: 1, label: 'Spot' },
                          { value: 2, label: 'One Month' },
                          { value: 3, label: 'All Month' },
                        ].map((type) => (
                          <Button
                            key={type.value}
                            variant={formData.limitType === type.value ? 'default' : 'outline'}
                            className={cn(
                              'flex-1',
                              formData.limitType === type.value
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                            )}
                            onClick={() => setFormData({ ...formData, limitType: type.value })}
                          >
                            {type.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                      <Button
                        onClick={handleValidate}
                        disabled={loading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Validating...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Validate Trade
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Validation Result */}
                {validation && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(validation.validationStatus)}
                            <CardTitle className="text-white">Validation Result</CardTitle>
                          </div>
                          <Badge
                            variant="outline"
                            className={getStatusColor(validation.validationStatus)}
                          >
                            {validation.validationStatus.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Risk Level */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50">
                          <span className="text-slate-300">Risk Level</span>
                          <Badge variant="outline" className={getRiskColor(validation.riskLevel)}>
                            {validation.riskLevel.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Position Impact */}
                        <div className="space-y-2">
                          <h4 className="text-white font-semibold">Position Impact</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-slate-900/50">
                              <p className="text-sm text-slate-400">Current Position</p>
                              <p className="text-2xl font-bold text-white">
                                {validation.currentPosition.toLocaleString()}
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-900/50">
                              <p className="text-sm text-slate-400">Projected Position</p>
                              <p className="text-2xl font-bold text-white flex items-center gap-2">
                                {validation.projectedPosition.toLocaleString()}
                                <ArrowRight className="h-4 w-4 text-blue-500" />
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Utilization */}
                        <div className="space-y-2">
                          <h4 className="text-white font-semibold">Utilization</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-slate-900/50">
                              <p className="text-sm text-slate-400">Current</p>
                              <p className="text-2xl font-bold text-white">
                                {validation.currentUtilization.toFixed(2)}%
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-900/50">
                              <p className="text-sm text-slate-400">Projected</p>
                              <p className="text-2xl font-bold text-white flex items-center gap-2">
                                {validation.projectedUtilization.toFixed(2)}%
                                <span
                                  className={cn(
                                    'text-sm',
                                    validation.utilizationChange > 0 ? 'text-red-400' : 'text-green-400'
                                  )}
                                >
                                  ({validation.utilizationChange > 0 ? '+' : ''}
                                  {validation.utilizationChange.toFixed(2)}%)
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Threshold & Notes */}
                        <div className="p-4 rounded-lg bg-slate-900/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Threshold Reached</span>
                            <span className="text-white font-semibold">
                              {validation.thresholdReached}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Can Proceed</span>
                            <span
                              className={cn(
                                'font-semibold',
                                validation.canProceed ? 'text-green-400' : 'text-red-400'
                              )}
                            >
                              {validation.canProceed ? 'Yes' : 'No'}
                            </span>
                          </div>
                          {validation.requiresApproval && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/50">
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                <span className="text-yellow-400 text-sm">
                                  This trade requires manager approval
                                </span>
                              </div>
                              <Button
                                onClick={handleSubmitForApproval}
                                disabled={submittingApproval}
                                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                              >
                                {submittingApproval ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Submitting...
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Submit for Approval
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                          {validation.blockReason && (
                            <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/50">
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-red-400 text-sm">{validation.blockReason}</span>
                            </div>
                          )}
                        </div>

                        {/* Regulatory Compliance Status */}
                        {validation.regulatoryCompliant !== undefined && (
                          <div className="p-4 rounded-lg border border-slate-700 bg-slate-900/50 space-y-3">
                            <div className="flex items-center gap-2 mb-3">
                              <Scale className="h-5 w-5 text-blue-500" />
                              <h4 className="text-white font-semibold">Regulatory Compliance</h4>
                            </div>

                            {/* Compliance Status */}
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                              <span className="text-slate-300 flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Compliance Status
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  validation.regulatoryCompliant
                                    ? 'border-green-500 text-green-400'
                                    : 'border-red-500 text-red-400'
                                )}
                              >
                                {validation.regulatoryCompliant ? 'COMPLIANT' : 'VIOLATION DETECTED'}
                              </Badge>
                            </div>

                            {/* Reportable Flag */}
                            {validation.reportable && (
                              <div className="flex items-center gap-2 p-2 rounded bg-blue-500/10 border border-blue-500/50">
                                <FileText className="h-4 w-4 text-blue-400" />
                                <span className="text-blue-400 text-sm">
                                  Position exceeds reportable threshold - Large trader report required
                                </span>
                              </div>
                            )}

                            {/* Regulatory Violations */}
                            {validation.regulatoryViolations && validation.regulatoryViolations.length > 0 && (
                              <div className="space-y-2">
                                <h5 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                                  <XCircle className="h-4 w-4" />
                                  Regulatory Violations ({validation.regulatoryViolations.length})
                                </h5>
                                {validation.regulatoryViolations.map((violation: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="p-3 rounded-lg bg-red-500/5 border border-red-500/30 space-y-2"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Building2 className="h-3 w-3 text-red-400" />
                                          <span className="text-sm font-semibold text-red-400">
                                            {violation.rule_name}
                                          </span>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed">
                                          {violation.message}
                                        </p>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'ml-2 text-xs',
                                          violation.severity === 'critical'
                                            ? 'border-red-500 text-red-400'
                                            : 'border-orange-500 text-orange-400'
                                        )}
                                      >
                                        {violation.severity}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-slate-400">
                                        Rule: {violation.rule_code}
                                      </span>
                                      <span className="text-slate-400">
                                        Ref: {violation.rule_reference}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                      <div className="p-2 rounded bg-slate-800/50">
                                        <p className="text-slate-400">Limit</p>
                                        <p className="text-white font-semibold">
                                          {violation.limit_value.toLocaleString()}
                                        </p>
                                      </div>
                                      <div className="p-2 rounded bg-slate-800/50">
                                        <p className="text-slate-400">Projected</p>
                                        <p className="text-red-400 font-semibold">
                                          {violation.projected_position.toLocaleString()}
                                        </p>
                                      </div>
                                      <div className="p-2 rounded bg-slate-800/50">
                                        <p className="text-slate-400">Excess</p>
                                        <p className="text-red-400 font-semibold">
                                          +{violation.excess_amount.toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Regulatory Warnings */}
                            {validation.regulatoryWarnings && validation.regulatoryWarnings.length > 0 && (
                              <div className="space-y-2">
                                <h5 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  Regulatory Warnings ({validation.regulatoryWarnings.length})
                                </h5>
                                {validation.regulatoryWarnings.map((warning: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/30"
                                  >
                                    <p className="text-sm text-yellow-400">{warning.message}</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                      Rule: {warning.rule_code} • Utilization: {warning.utilization_pct.toFixed(1)}%
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Applicable Regulatory Rules */}
                            {validation.applicableRules && validation.applicableRules.length > 0 && (
                              <div className="space-y-2">
                                <h5 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                                  <Scale className="h-4 w-4" />
                                  Applicable Regulatory Rules ({validation.applicableRules.length})
                                </h5>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {validation.applicableRules.map((rule: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Building2 className="h-3 w-3 text-blue-400" />
                                            <span className="text-sm font-semibold text-white">
                                              {rule.exchange_code}: {rule.rule_name}
                                            </span>
                                          </div>
                                          <p className="text-xs text-slate-400">
                                            {rule.description}
                                          </p>
                                        </div>
                                        <Badge
                                          variant="outline"
                                          className="ml-2 border-blue-500 text-blue-400 text-xs"
                                        >
                                          {rule.rule_type}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400">
                                          {rule.rule_code} • {rule.rule_reference}
                                        </span>
                                        {rule.limit_value && (
                                          <span className="text-slate-300 font-semibold">
                                            Limit: {rule.limit_value.toLocaleString()} lots
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>

              {/* Right Column - Recent Checks */}
              <div>
                <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">Recent Checks</CardTitle>
                    <CardDescription className="text-slate-400">
                      Last 10 validation checks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentChecks.length === 0 ? (
                      <p className="text-slate-400 text-sm">No recent checks</p>
                    ) : (
                      recentChecks.map((check) => (
                        <motion.div
                          key={check.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-3 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-slate-600 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium text-sm">
                              {check.commodity_code}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn('text-xs', getStatusColor(check.validation_status))}
                            >
                              {check.validation_status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{check.market_location}</span>
                            <span>{check.trade_side}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-slate-400">
                              {check.quantity.toLocaleString()} lots
                            </span>
                            <span
                              className={cn(
                                'font-semibold',
                                check.projected_utilization_pct >= 95
                                  ? 'text-red-400'
                                  : check.projected_utilization_pct >= 80
                                  ? 'text-yellow-400'
                                  : 'text-green-400'
                              )}
                            >
                              {check.projected_utilization_pct.toFixed(1)}%
                            </span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
}

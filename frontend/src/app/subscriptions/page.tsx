'use client';

import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { subscriptionsApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { CreditCard, Users, Package, TrendingUp, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function SubscriptionsPage() {
  const { token } = useAuthStore();
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [limits, setLimits] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    // Wait for token before loading data
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Load plans
      const plansResponse = await subscriptionsApi.getPlans();
      setPlans(plansResponse.data || []);

      // Load current subscription (if company user)
      // This would need company_id from auth context
      // const subResponse = await subscriptionsApi.getCompanySubscription(companyId);
      // setSubscription(subResponse.data);

      // Load usage limits
      // const limitsResponse = await subscriptionsApi.checkLimits(companyId);
      // setLimits(limitsResponse.data);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getPlanBadge = (planType: string) => {
    const variants: Record<string, string> = {
      trader_based: 'bg-blue-500',
      product_based: 'bg-green-500',
      volume_based: 'bg-purple-500',
    };
    return (
      <Badge className={`${variants[planType] || 'bg-gray-500'} text-white`}>
        {planType.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Subscription Management
              </h1>
              <p className="text-slate-400">
                Manage subscription plans, usage tracking, and billing
              </p>
            </div>
            <Button
              onClick={loadData}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Current Subscription Card */}
          {subscription && (
            <Card className="bg-slate-800/50 border-slate-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Current Subscription</span>
                  <Badge className="bg-green-500 text-white">Active</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Plan Name</p>
                    <p className="text-white font-semibold">{subscription.plan_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Billing Cycle</p>
                    <p className="text-white font-semibold">{subscription.billing_cycle}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Next Renewal</p>
                    <p className="text-white font-semibold">
                      {subscription.next_renewal_date
                        ? new Date(subscription.next_renewal_date).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Price</p>
                    <p className="text-white font-semibold">${subscription.current_price}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-slate-400 text-sm">Active Traders</p>
                    <p className="text-2xl font-bold text-white">
                      {subscription?.current_traders_count || 0}
                      {subscription?.max_traders && ` / ${subscription.max_traders}`}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
                {subscription?.max_traders && (
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          ((subscription.current_traders_count || 0) / subscription.max_traders) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-slate-400 text-sm">Active Products</p>
                    <p className="text-2xl font-bold text-white">
                      {subscription?.current_products_count || 0}
                      {subscription?.max_products && ` / ${subscription.max_products}`}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-green-400" />
                </div>
                {subscription?.max_products && (
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          ((subscription.current_products_count || 0) / subscription.max_products) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-slate-400 text-sm">Transactions (MTD)</p>
                    <p className="text-2xl font-bold text-white">
                      {subscription?.current_transactions_count || 0}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-400" />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {limits?.within_limits ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-green-400">Within Limits</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <span className="text-red-400">Limit Exceeded</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Available Plans */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Available Plans</CardTitle>
              <CardDescription className="text-slate-400">
                Choose a subscription plan that fits your needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-slate-400">Loading plans...</div>
              ) : plans.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No plans available.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-900 border border-slate-700 rounded-lg p-6 hover:border-blue-500 transition-colors"
                    >
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-white mb-2">{plan.plan_name}</h3>
                        {getPlanBadge(plan.plan_type)}
                      </div>

                      <div className="mb-6">
                        <p className="text-3xl font-bold text-white">
                          ${plan.base_price}
                          <span className="text-sm text-slate-400 font-normal">
                            /{plan.billing_cycle || 'month'}
                          </span>
                        </p>
                      </div>

                      <div className="space-y-3 mb-6">
                        {plan.max_traders && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span>Up to {plan.max_traders} traders</span>
                          </div>
                        )}
                        {plan.max_products && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span>Up to {plan.max_products} products</span>
                          </div>
                        )}
                        {plan.features && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span>{plan.features}</span>
                          </div>
                        )}
                      </div>

                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={subscription?.plan_id === plan.id}
                      >
                        {subscription?.plan_id === plan.id ? 'Current Plan' : 'Select Plan'}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}

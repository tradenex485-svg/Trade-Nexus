'use client';

import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { financialApi } from '@/lib/api';
import { motion } from 'framer-motion';
import {
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Plus,
  DollarSign,
  Building2,
  RefreshCw,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function FinancialPage() {
  const { token } = useAuthStore();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);

  const loadData = useCallback(async () => {
    // Wait for token before loading data
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [accountsResponse, transactionsResponse] = await Promise.all([
        financialApi.getAccounts(),
        financialApi.getTransactions(),
      ]);
      setAccounts(accountsResponse.data || []);
      setTransactions(transactionsResponse.data || []);
    } catch (error) {
      console.error('Failed to load financial data:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getTransactionBadge = (type: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      subscription_fee: { color: 'bg-blue-500', icon: CreditCard },
      transaction_fee: { color: 'bg-purple-500', icon: DollarSign },
      payment: { color: 'bg-green-500', icon: TrendingUp },
      refund: { color: 'bg-orange-500', icon: TrendingDown },
    };
    const config = variants[type] || { color: 'bg-gray-500', icon: DollarSign };
    const Icon = config.icon;
    return (
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <Badge className={`${config.color} text-white`}>
          {type.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500',
      cancelled: 'bg-gray-500',
    };
    return (
      <Badge className={`${variants[status] || 'bg-gray-500'} text-white`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  const pendingTransactions = transactions.filter((t) => t.status === 'pending');
  const completedTransactions = transactions.filter((t) => t.status === 'completed');

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Financial Management
              </h1>
              <p className="text-slate-400">Manage bank accounts, transactions, and payments</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadData}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={() => setShowNewAccountModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total Balance</p>
                    <p className="text-2xl font-bold text-white">
                      ${totalBalance.toLocaleString()}
                    </p>
                  </div>
                  <Wallet className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Active Accounts</p>
                    <p className="text-2xl font-bold text-white">
                      {accounts.filter((a) => a.is_active).length}
                    </p>
                  </div>
                  <Building2 className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Pending</p>
                    <p className="text-2xl font-bold text-white">{pendingTransactions.length}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Completed</p>
                    <p className="text-2xl font-bold text-white">{completedTransactions.length}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="accounts" className="space-y-4">
            <TabsList className="bg-slate-800 border border-slate-700">
              <TabsTrigger value="accounts" className="data-[state=active]:bg-slate-700">
                Bank Accounts
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-slate-700">
                Transactions
              </TabsTrigger>
            </TabsList>

            {/* Accounts Tab */}
            <TabsContent value="accounts">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Bank Accounts</CardTitle>
                  <CardDescription className="text-slate-400">
                    {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12 text-slate-400">Loading accounts...</div>
                  ) : accounts.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      No bank accounts found. Add your first account to get started.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {accounts.map((account) => (
                        <motion.div
                          key={account.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-6 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-slate-700 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-semibold text-white mb-1">
                                {account.account_name}
                              </h3>
                              <p className="text-slate-400 text-sm">{account.bank_name}</p>
                            </div>
                            {account.is_primary && (
                              <Badge className="bg-yellow-500 text-white">PRIMARY</Badge>
                            )}
                          </div>

                          <div className="mb-4">
                            <p className="text-slate-400 text-sm mb-1">Current Balance</p>
                            <p className="text-3xl font-bold text-white">
                              {account.currency} ${(account.current_balance || 0).toLocaleString()}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-slate-400">Account Type</p>
                              <p className="text-white capitalize">{account.account_type}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Account Number</p>
                              <p className="text-white">***{account.account_number?.slice(-4)}</p>
                            </div>
                            {account.swift_code && (
                              <div>
                                <p className="text-slate-400">SWIFT Code</p>
                                <p className="text-white">{account.swift_code}</p>
                              </div>
                            )}
                            {account.iban && (
                              <div>
                                <p className="text-slate-400">IBAN</p>
                                <p className="text-white">{account.iban}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Transaction History</CardTitle>
                  <CardDescription className="text-slate-400">
                    {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12 text-slate-400">Loading transactions...</div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      No transactions found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left p-4 text-slate-300 font-medium">Date</th>
                            <th className="text-left p-4 text-slate-300 font-medium">
                              Transaction #
                            </th>
                            <th className="text-left p-4 text-slate-300 font-medium">Type</th>
                            <th className="text-left p-4 text-slate-300 font-medium">Amount</th>
                            <th className="text-left p-4 text-slate-300 font-medium">Status</th>
                            <th className="text-left p-4 text-slate-300 font-medium">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((transaction) => (
                            <motion.tr
                              key={transaction.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                            >
                              <td className="p-4 text-slate-300">
                                {new Date(transaction.transaction_date).toLocaleDateString()}
                              </td>
                              <td className="p-4 text-slate-300 font-mono text-sm">
                                {transaction.transaction_number}
                              </td>
                              <td className="p-4">{getTransactionBadge(transaction.transaction_type)}</td>
                              <td className="p-4">
                                <span className="text-white font-semibold">
                                  {transaction.currency} ${transaction.amount.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-4">{getStatusBadge(transaction.status)}</td>
                              <td className="p-4 text-slate-300 text-sm">
                                {transaction.description || '-'}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
}

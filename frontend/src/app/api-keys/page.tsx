'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { AuthGuard } from '@/components/auth/auth-guard';
import { apiKeysApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Activity,
  Loader2,
} from 'lucide-react';

interface ApiKey {
  id: number;
  key_name: string;
  key_prefix: string;
  company_name: string;
  created_by_email: string;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  is_active: number;
  rate_limit: number;
  scopes?: string[];
  total_requests: number;
  requests_24h: number;
  error_count: number;
  status: string;
}

interface ApiKeyStats {
  total_keys: number;
  active_keys: number;
  revoked_keys: number;
  expired_keys: number;
  expiring_soon: number;
}

export default function ApiKeysPage() {
  const { token, _hasHydrated } = useAuthStore();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [stats, setStats] = useState<ApiKeyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState<any>(null);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);

  // Create key form state
  const [keyName, setKeyName] = useState('');
  const [description, setDescription] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('90');
  const [rateLimit, setRateLimit] = useState('1000');

  useEffect(() => {
    if (!_hasHydrated || !token) {
      setLoading(false);
      return;
    }
    loadData();
  }, [token, _hasHydrated]);

  async function loadData() {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [keysRes, statsRes] = await Promise.all([
        apiKeysApi.getAll(),
        apiKeysApi.getStats(),
      ]);

      if (keysRes.success) setKeys(keysRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateKey() {
    if (!keyName) {
      alert('Key name is required');
      return;
    }

    if (!token) return;

    try {
      const response = await apiKeysApi.create({
        key_name: keyName,
        description,
        expires_in_days: parseInt(expiresInDays),
        rate_limit: parseInt(rateLimit),
      });

      if (response.success) {
        setNewKeyData(response.data);
        setShowCreateModal(false);
        // Reset form
        setKeyName('');
        setDescription('');
        setExpiresInDays('90');
        setRateLimit('1000');
        loadData();
      } else {
        alert('Failed to create API key');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  async function handleRevokeKey(keyId: number) {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    if (!token) return;

    try {
      const response = await apiKeysApi.revoke(keyId);

      if (response.success) {
        alert('API key revoked successfully');
        loadData();
      } else {
        alert('Failed to revoke API key');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, string> = {
      'active': 'bg-green-500/10 text-green-600 border-green-500/20',
      'inactive': 'bg-gray-500/10 text-gray-600 border-gray-500/20',
      'expired': 'bg-red-500/10 text-red-600 border-red-500/20',
      'expiring_soon': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    };

    return (
      <Badge variant="outline" className={variants[status] || 'bg-gray-500/10 text-gray-600'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  }

  // Show loading during hydration or initial data fetch
  if (!_hasHydrated || loading) {
    return (
      <AuthGuard>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading API keys...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Key className="h-8 w-8 text-blue-500" />
            API Keys
          </h1>
          <p className="text-slate-400 mt-1">
            Manage API keys for system integrations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => loadData()} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)} variant="default" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Key className="h-5 w-5 text-blue-400" />
              <div className="text-2xl font-bold text-white">
                {stats?.total_keys || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Total Keys</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="text-2xl font-bold text-green-400">
                {stats?.active_keys || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Active</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <XCircle className="h-5 w-5 text-gray-400" />
              <div className="text-2xl font-bold text-gray-400">
                {stats?.revoked_keys || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Revoked</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="text-2xl font-bold text-red-400">
                {stats?.expired_keys || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Expired</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="text-2xl font-bold text-yellow-400">
                {stats?.expiring_soon || 0}
              </div>
            </div>
            <CardTitle className="text-sm text-slate-400">Expiring Soon</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* API Keys Table */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">API Keys</CardTitle>
          <CardDescription>Manage and monitor your API keys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Name</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Key Prefix</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Company</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Requests (24h)</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Rate Limit</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Last Used</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{key.key_name}</div>
                      <div className="text-xs text-slate-400">Created by {key.created_by_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="bg-slate-700/50 px-2 py-1 rounded text-xs text-green-400">
                        {key.key_prefix}...
                      </code>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{key.company_name}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-white font-mono">{key.requests_24h?.toLocaleString() || 0}</div>
                      <div className="text-xs text-slate-400">of {key.rate_limit}/hr</div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300 font-mono">
                      {key.rate_limit}/hr
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-sm">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(key.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setSelectedKey(key)}
                          variant="outline"
                          size="sm"
                          className="bg-slate-700/50 hover:bg-slate-700 border-slate-600"
                        >
                          <Activity className="h-3 w-3" />
                        </Button>
                        {key.is_active === 1 && (
                          <Button
                            onClick={() => handleRevokeKey(key.id)}
                            variant="outline"
                            size="sm"
                            className="bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {keys.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No API keys found</p>
                <Button onClick={() => setShowCreateModal(true)} variant="outline" size="sm" className="mt-4">
                  Create Your First API Key
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <Card className="border-slate-700 bg-slate-800 max-w-lg w-full">
            <CardHeader>
              <CardTitle className="text-white">Create New API Key</CardTitle>
              <CardDescription>Generate a new API key for system integration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Key Name *
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="Production API Key"
                  className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Used for production trading system integration"
                  className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Expires In (days)
                  </label>
                  <input
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Rate Limit (req/hr)
                  </label>
                  <input
                    type="number"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleCreateKey} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                  Create API Key
                </Button>
                <Button onClick={() => setShowCreateModal(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Key Display Modal */}
      {newKeyData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <Card className="border-green-700 bg-slate-800 max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-400" />
                API Key Created Successfully
              </CardTitle>
              <CardDescription className="text-yellow-400">
                ⚠️ IMPORTANT: Copy this key now - it will not be shown again!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-2">Your API Key:</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-700/50 px-3 py-2 rounded text-green-400 font-mono text-sm break-all">
                    {newKeyData.api_key}
                  </code>
                  <Button
                    onClick={() => copyToClipboard(newKeyData.api_key)}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400">Key Name:</div>
                  <div className="text-white font-medium">{newKeyData.key_name}</div>
                </div>
                <div>
                  <div className="text-slate-400">Key Prefix:</div>
                  <div className="text-white font-mono">{newKeyData.key_prefix}</div>
                </div>
                {newKeyData.expires_at && (
                  <div>
                    <div className="text-slate-400">Expires:</div>
                    <div className="text-white">{new Date(newKeyData.expires_at).toLocaleDateString()}</div>
                  </div>
                )}
              </div>

              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200">
                  Store this key securely. Anyone with this key can access your API.
                </AlertDescription>
              </Alert>

              <Button onClick={() => setNewKeyData(null)} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                I've Saved My API Key
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </AuthGuard>
  );
}

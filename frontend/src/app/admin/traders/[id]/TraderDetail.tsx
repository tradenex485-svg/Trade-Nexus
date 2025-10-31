'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter, useParams } from 'next/navigation';
import { tradersApi, companiesApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Users, Building, Mail, Briefcase, Loader2, Save, X } from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';

interface Trader {
  id: number;
  name: string;
  email: string;
  trader_code: string | null;
  department: string | null;
  company_id: number | null;
  company_name: string | null;
  company_code: string | null;
  desk_name: string | null;
  is_primary: number;
  role_name: string;
  is_active: number;
  created_at: string;
  updated_at: string | null;
  exchange_name: string | null;
  exchange_code: string | null;
}

interface Assignment {
  id: number;
  trader_code: string | null;
  desk_name: string | null;
  is_primary: number;
  assigned_at: string;
  company_name: string | null;
  company_code: string | null;
}

interface Company {
  id: number;
  company_name: string;
  company_code: string;
}

export default function TraderDetail() {
  const { user, token, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const traderId = params?.id as string;

  const [trader, setTrader] = useState<Trader | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    trader_code: '',
    department: '',
    is_active: 1,
  });

  const isSuperAdmin = user?.role === 'super_admin';
  const isCompanyAdmin = user?.role === 'company_admin';
  const canEdit = user?.permissions?.includes('users.update');

  useEffect(() => {
    if (!_hasHydrated || !token) return;

    if (traderId) {
      fetchTraderData();
    }
  }, [_hasHydrated, token, traderId]);

  const fetchTraderData = async () => {
    try {
      const data = await tradersApi.getById(parseInt(traderId));

      setTrader(data.trader);
      setAssignments(data.assignments || []);
      setFormData({
        name: data.trader.name,
        trader_code: data.trader.trader_code || '',
        department: data.trader.department || '',
        is_active: data.trader.is_active,
      });

      // Fetch companies for super admin
      if (isSuperAdmin) {
        const companiesData = await companiesApi.getAll();
        setCompanies(companiesData.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trader data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await tradersApi.update(parseInt(traderId), formData);
      setIsEditing(false);
      fetchTraderData();
    } catch (err: any) {
      setError(err.message || 'Failed to update trader');
    }
  };

  if (!_hasHydrated || loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading trader details...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!trader) {
    return (
      <AuthGuard>
        <div className="container mx-auto p-6">
          <Alert className="border-red-500 bg-red-50">
            <AlertDescription className="text-red-700">
              Trader not found
            </AlertDescription>
          </Alert>
          <Button onClick={() => router.push('/admin/traders')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Traders
          </Button>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="container mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/traders')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Traders
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Trader Details</h1>
              <p className="text-gray-600">
                View and manage trader information
              </p>
            </div>
            {canEdit && !isEditing && (
              <Button onClick={() => setIsEditing(true)}>
                Edit Trader
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-500 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Trader Information Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-blue-600" />
                <div>
                  <CardTitle>{trader.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4" />
                    {trader.email}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                {trader.is_active ? (
                  <Badge className="bg-green-500">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
                {trader.is_primary === 1 && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                    Primary
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="trader_code">Trader Code</Label>
                    <Input
                      id="trader_code"
                      value={formData.trader_code}
                      onChange={(e) => setFormData({ ...formData, trader_code: e.target.value })}
                      placeholder="TRD001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Trading Desk"
                    />
                  </div>
                  <div>
                    <Label htmlFor="is_active">Status</Label>
                    <select
                      id="is_active"
                      value={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Trader Code</p>
                  <p className="text-base font-medium">{trader.trader_code || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Department</p>
                  <p className="text-base font-medium">{trader.department || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Company</p>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <p className="text-base font-medium">
                      {trader.company_name || 'N/A'}
                      {trader.company_code && (
                        <span className="text-sm text-gray-500 ml-1">({trader.company_code})</span>
                      )}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Exchange</p>
                  <p className="text-base font-medium">
                    {trader.exchange_name || 'N/A'}
                    {trader.exchange_code && (
                      <span className="text-sm text-gray-500 ml-1">({trader.exchange_code})</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Role</p>
                  <Badge variant="outline">{trader.role_name}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Created At</p>
                  <p className="text-base font-medium">
                    {new Date(trader.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignments Card */}
        {assignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Company Assignments</CardTitle>
              <CardDescription>
                This trader is assigned to the following companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold">
                          {assignment.company_name || 'N/A'}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Trader Code</p>
                          <p className="font-medium">{assignment.trader_code || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Desk Name</p>
                          <p className="font-medium">{assignment.desk_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Assigned At</p>
                          <p className="font-medium">
                            {new Date(assignment.assigned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      {assignment.is_primary === 1 && (
                        <Badge className="bg-blue-500">Primary</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}

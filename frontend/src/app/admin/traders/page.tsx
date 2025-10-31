'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { tradersApi, companiesApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Users, Building, Search, Edit, Trash2, Loader2 } from 'lucide-react';

interface Company {
  id: number;
  company_name: string;
  company_code: string;
}

interface Trader {
  id: number;
  name: string;
  email: string;
  trader_code: string | null;
  department: string | null;
  company_id: number;
  company_name: string;
  company_code: string;
  desk_name: string | null;
  is_primary: number;
  role_name: string;
  is_active: number;
  created_at: string;
}

export default function TradersPage() {
  const { user, token, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [filteredTraders, setFilteredTraders] = useState<Trader[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    trader_code: '',
    department: '',
    desk_name: '',
    company_id: '',
  });

  useEffect(() => {
    // Wait for hydration and token before fetching
    if (!_hasHydrated || !token) return;

    fetchTraders();

    // Fetch companies if super admin
    if (user?.role === 'super_admin') {
      fetchCompanies();
    }
  }, [_hasHydrated, token, user]);

  useEffect(() => {
    // Filter traders based on search query
    if (searchQuery.trim() === '') {
      setFilteredTraders(traders);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = traders.filter(
        (trader) =>
          trader.name.toLowerCase().includes(query) ||
          trader.email.toLowerCase().includes(query) ||
          (trader.company_name && trader.company_name.toLowerCase().includes(query)) ||
          (trader.trader_code && trader.trader_code.toLowerCase().includes(query)) ||
          (trader.department && trader.department.toLowerCase().includes(query))
      );
      setFilteredTraders(filtered);
    }
  }, [searchQuery, traders]);

  const fetchTraders = async () => {
    try {
      const data = await tradersApi.getAll();
      setTraders(data.data || []);
      setFilteredTraders(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch traders');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const data = await companiesApi.getAll();
      setCompanies(data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch companies:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        trader_code: formData.trader_code,
        department: formData.department,
        desk_name: formData.desk_name,
      };

      // Add company_id if super admin and it's selected
      if (isSuperAdmin && formData.company_id) {
        payload.company_id = parseInt(formData.company_id);
      }

      await tradersApi.create(payload);

      setShowForm(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        trader_code: '',
        department: '',
        desk_name: '',
        company_id: '',
      });
      fetchTraders();
    } catch (err: any) {
      setError(err.message || 'Failed to create trader');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this trader?')) return;

    try {
      await tradersApi.delete(id);
      fetchTraders();
    } catch (err: any) {
      setError(err.message || 'Failed to delete trader');
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const canCreate = user?.permissions?.includes('users.create');
  const canUpdate = user?.permissions?.includes('users.update');
  const canDelete = user?.permissions?.includes('users.delete');

  // Show loading during hydration or data fetch
  if (!_hasHydrated || loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading traders...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Trader Management</h1>
        <p className="text-gray-600">
          {isSuperAdmin ? 'Manage all traders across all companies' : 'Manage your company traders'}
        </p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-500 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search traders by name, email, company, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Trader
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Trader</CardTitle>
            <CardDescription>Add a new trader to {isSuperAdmin ? 'the system' : 'your company'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@company.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Secure password"
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
                  <Label htmlFor="desk_name">Desk Name</Label>
                  <Input
                    id="desk_name"
                    value={formData.desk_name}
                    onChange={(e) => setFormData({ ...formData, desk_name: e.target.value })}
                    placeholder="Energy Desk"
                  />
                </div>
                {isSuperAdmin && (
                  <div>
                    <Label htmlFor="company_id">Company</Label>
                    <select
                      id="company_id"
                      value={formData.company_id}
                      onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a company (optional)</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.company_name} ({company.company_code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create Trader</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6">
        {filteredTraders.map((trader) => (
          <Card key={trader.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold">{trader.name}</h3>
                      <p className="text-sm text-gray-600">{trader.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                    <div>
                      <p className="text-xs text-gray-500">Company</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Building className="h-4 w-4 text-gray-400" />
                        <p className="text-sm font-medium">{trader.company_name || 'N/A'}</p>
                      </div>
                    </div>
                    {trader.trader_code && (
                      <div>
                        <p className="text-xs text-gray-500">Trader Code</p>
                        <p className="text-sm font-medium mt-1">{trader.trader_code}</p>
                      </div>
                    )}
                    {trader.department && (
                      <div>
                        <p className="text-xs text-gray-500">Department</p>
                        <p className="text-sm font-medium mt-1">{trader.department}</p>
                      </div>
                    )}
                    {trader.desk_name && (
                      <div>
                        <p className="text-xs text-gray-500">Desk</p>
                        <p className="text-sm font-medium mt-1">{trader.desk_name}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
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
                  {(canUpdate || canDelete) && (
                    <div className="flex gap-2 mt-2">
                      {canUpdate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/traders/${trader.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(trader.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTraders.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No traders found' : 'No traders yet'}
            </h3>
            {!searchQuery && (
              <>
                <p className="text-gray-600 mb-4">Get started by creating your first trader</p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Trader
                </Button>
              </>
            )}
            {searchQuery && (
              <p className="text-gray-600">
                Try adjusting your search query or{' '}
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 hover:underline"
                >
                  clear filters
                </button>
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
    </AuthGuard>
  );
}

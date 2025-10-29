'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { companiesApi, exchangesApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
// Select component temporarily replaced with native select
import { Plus, Building, Users, TrendingUp, Loader2 } from 'lucide-react';

interface Exchange {
  id: number;
  exchange_code: string;
  exchange_name: string;
}

interface Company {
  id: number;
  exchange_id: number;
  company_code: string;
  company_name: string;
  legal_entity_name: string | null;
  country: string | null;
  contact_email: string | null;
  is_active: number;
  onboarding_date: string | null;
  exchange_name: string;
  exchange_code: string;
}

export default function CompaniesPage() {
  const { user, token, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    exchange_id: '',
    company_code: '',
    company_name: '',
    legal_entity_name: '',
    registration_number: '',
    country: '',
    contact_email: '',
    contact_phone: '',
    compliance_officer_name: '',
    compliance_officer_email: '',
    onboarding_date: '',
  });

  // Debug: Log store state on mount
  useEffect(() => {
    console.log('[Companies] Component mounted, store state:', {
      hasUser: !!user,
      hasToken: !!token,
      tokenType: typeof token,
      tokenValue: token,
      _hasHydrated
    });

    // Check localStorage directly
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[Companies] localStorage check:', {
          hasToken: !!parsed.state?.token,
          tokenLength: parsed.state?.token?.length || 0
        });
      } else {
        console.log('[Companies] No auth-storage in localStorage');
      }
    } catch (e) {
      console.error('[Companies] Error reading localStorage:', e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    console.log('[Companies] Fetching data...');
    try {
      const [companiesData, exchangesData] = await Promise.all([
        companiesApi.getAll(),
        exchangesApi.getAll(),
      ]);

      console.log('[Companies] Data received:', { companiesData, exchangesData });
      setCompanies(companiesData.data || []);
      setExchanges(exchangesData.data || []);
    } catch (err: any) {
      console.error('[Companies] Error fetching:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('[Companies] useEffect running', { _hasHydrated, hasToken: !!token });

    // Wait for hydration and token before fetching
    if (!_hasHydrated) {
      console.log('[Companies] Waiting for hydration...');
      return;
    }

    if (!token) {
      console.log('[Companies] No token available');
      return;
    }

    fetchData();

    // Timeout fallback
    const timeout = setTimeout(() => {
      setError('Loading timeout. Please refresh the page.');
      setLoading(false);
    }, 10000);

    return () => clearTimeout(timeout);
  }, [_hasHydrated, token, fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await companiesApi.create({
        ...formData,
        exchange_id: parseInt(formData.exchange_id),
      });

      setShowForm(false);
      setFormData({
        exchange_id: '',
        company_code: '',
        company_name: '',
        legal_entity_name: '',
        registration_number: '',
        country: '',
        contact_email: '',
        contact_phone: '',
        compliance_officer_name: '',
        compliance_officer_email: '',
        onboarding_date: '',
      });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create company');
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';

  // Show loading during hydration or data fetch
  if (!_hasHydrated || loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading companies...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Company Management</h1>
        <p className="text-gray-600">
          {isSuperAdmin ? 'Manage all trading companies' : 'Manage your company'}
        </p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-500 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {isSuperAdmin && (
        <div className="mb-6">
          <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        </div>
      )}

      {showForm && isSuperAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Company</CardTitle>
            <CardDescription>Add a new trading company to an exchange</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="exchange_id">Exchange *</Label>
                  <select
                    id="exchange_id"
                    value={formData.exchange_id}
                    onChange={(e) => setFormData({ ...formData, exchange_id: e.target.value })}
                    required
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select exchange</option>
                    {exchanges.map((exchange) => (
                      <option key={exchange.id} value={exchange.id.toString()}>
                        {exchange.exchange_code} - {exchange.exchange_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="company_code">Company Code *</Label>
                  <Input
                    id="company_code"
                    value={formData.company_code}
                    onChange={(e) => setFormData({ ...formData, company_code: e.target.value })}
                    placeholder="ABC123"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="ABC Trading LLC"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="legal_entity_name">Legal Entity Name</Label>
                  <Input
                    id="legal_entity_name"
                    value={formData.legal_entity_name}
                    onChange={(e) => setFormData({ ...formData, legal_entity_name: e.target.value })}
                    placeholder="ABC Trading Limited Liability Company"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="United States"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="contact@company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="compliance_officer_name">Compliance Officer Name</Label>
                  <Input
                    id="compliance_officer_name"
                    value={formData.compliance_officer_name}
                    onChange={(e) => setFormData({ ...formData, compliance_officer_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="compliance_officer_email">Compliance Officer Email</Label>
                  <Input
                    id="compliance_officer_email"
                    type="email"
                    value={formData.compliance_officer_email}
                    onChange={(e) => setFormData({ ...formData, compliance_officer_email: e.target.value })}
                    placeholder="compliance@company.com"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create Company</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => (
          <Card key={company.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-xl">{company.company_code}</CardTitle>
                    <CardDescription className="mt-1">{company.company_name}</CardDescription>
                  </div>
                </div>
                {company.is_active ? (
                  <Badge className="bg-green-500">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">
                    Exchange: {company.exchange_code}
                  </span>
                </div>
                {company.country && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Country:</span> {company.country}
                  </div>
                )}
                {company.contact_email && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Email:</span>{' '}
                    <a href={`mailto:${company.contact_email}`} className="text-blue-600 hover:underline">
                      {company.contact_email}
                    </a>
                  </div>
                )}
                {company.onboarding_date && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Onboarded:</span>{' '}
                    {new Date(company.onboarding_date).toLocaleDateString()}
                  </div>
                )}
                <div className="pt-4 border-t mt-4 flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/companies/${company.id}`)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {companies.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No companies yet</h3>
            {isSuperAdmin && (
              <>
                <p className="text-gray-600 mb-4">Get started by creating your first company</p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
    </AuthGuard>
  );
}

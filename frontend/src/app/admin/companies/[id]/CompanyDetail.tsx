'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Users, Plus, ArrowLeft, Edit, Trash2, Mail, Phone } from 'lucide-react';

interface Company {
  id: number;
  exchange_id: number;
  company_code: string;
  company_name: string;
  legal_entity_name: string | null;
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  compliance_officer_name: string | null;
  compliance_officer_email: string | null;
  is_active: number;
  onboarding_date: string | null;
  exchange_name: string;
  exchange_code: string;
  trader_count?: number;
  limit_count?: number;
}

interface Trader {
  id: number;
  name: string;
  email: string;
  trader_code: string | null;
  department: string | null;
  desk_name: string | null;
  is_primary: number;
  role_name: string;
  assigned_at: string;
}

export default function CompanyDetail() {
  const { user, token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const companyId = params?.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    // Check if user is super_admin or company_admin
    if (user && user.role !== 'super_admin' && user.role !== 'company_admin') {
      router.push('/');
      return;
    }

    if (companyId) {
      fetchCompanyData();
    }
  }, [user, token, companyId, router]);

  const fetchCompanyData = async () => {
    try {
      const [companyRes, tradersRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/companies/${companyId}/traders`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!companyRes.ok) throw new Error('Failed to fetch company data');
      if (!tradersRes.ok) throw new Error('Failed to fetch traders data');

      const companyData = await companyRes.json();
      const tradersData = await tradersRes.json();

      setCompany(companyData.company || null);
      setTraders(tradersData.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrader = async (traderId: number) => {
    if (!confirm('Are you sure you want to remove this trader from the company?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/traders/${traderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove trader');
      }

      fetchCompanyData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading company details...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-500 bg-red-50">
          <AlertDescription className="text-red-700">
            Company not found or you don't have permission to view it.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/admin/companies')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Companies
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/companies')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Companies
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Building className="h-8 w-8 text-blue-600" />
              {company.company_name}
            </h1>
            <p className="text-gray-600">
              Company Code: {company.company_code} | Exchange: {company.exchange_code}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {company.is_active ? (
              <Badge className="bg-green-500">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
        </div>
      </div>

      {error && (
        <Alert className="mb-6 border-red-500 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Total Traders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{company.trader_count || traders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Active Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{company.limit_count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Onboarding Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {company.onboarding_date
                ? new Date(company.onboarding_date).toLocaleDateString()
                : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Company Details</TabsTrigger>
          <TabsTrigger value="traders">Traders</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Legal Entity Name</p>
                      <p className="font-medium">{company.legal_entity_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Country</p>
                      <p className="font-medium">{company.country || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Exchange</p>
                      <p className="font-medium">
                        {company.exchange_name} ({company.exchange_code})
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    {company.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <a
                          href={`mailto:${company.contact_email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {company.contact_email}
                        </a>
                      </div>
                    )}
                    {company.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <p>{company.contact_phone}</p>
                      </div>
                    )}
                    {company.compliance_officer_name && (
                      <div>
                        <p className="text-sm text-gray-500">Compliance Officer</p>
                        <p className="font-medium">{company.compliance_officer_name}</p>
                        {company.compliance_officer_email && (
                          <a
                            href={`mailto:${company.compliance_officer_email}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {company.compliance_officer_email}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traders">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Company Traders</CardTitle>
                  <CardDescription>Manage traders assigned to this company</CardDescription>
                </div>
                <Button onClick={() => router.push('/admin/traders')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Trader
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {traders.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No traders yet</h3>
                  <p className="text-gray-600 mb-4">
                    This company doesn't have any traders assigned yet
                  </p>
                  <Button onClick={() => router.push('/admin/traders')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Trader
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {traders.map((trader) => (
                    <div
                      key={trader.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{trader.name}</h4>
                          {trader.is_primary === 1 && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{trader.email}</p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-500">
                          {trader.trader_code && (
                            <span>Code: {trader.trader_code}</span>
                          )}
                          {trader.department && (
                            <span>Dept: {trader.department}</span>
                          )}
                          {trader.desk_name && (
                            <span>Desk: {trader.desk_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/traders/${trader.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTrader(trader.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

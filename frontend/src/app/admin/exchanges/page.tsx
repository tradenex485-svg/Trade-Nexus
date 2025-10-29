'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useExchanges, useCreateExchange } from '@/lib/hooks/use-exchanges';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, Building2, Globe } from 'lucide-react';

interface Exchange {
  id: number;
  exchange_code: string;
  exchange_name: string;
  regulatory_body: string | null;
  country: string | null;
  description: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export default function ExchangesPage() {
  // Use React Query hooks - automatic caching, retries, and background refetching
  const { data, isLoading, isError, error: queryError } = useExchanges();
  const createExchange = useCreateExchange();

  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    exchange_code: '',
    exchange_name: '',
    regulatory_body: '',
    country: '',
    description: '',
    website: '',
    contact_email: '',
    contact_phone: '',
  });

  const exchanges = data?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createExchange.mutateAsync(formData);

      // Reset form on success
      setShowForm(false);
      setFormData({
        exchange_code: '',
        exchange_name: '',
        regulatory_body: '',
        country: '',
        description: '',
        website: '',
        contact_email: '',
        contact_phone: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create exchange');
    }
  };

  // Show skeleton loading state
  if (isLoading) {
    return (
      <AuthGuard>
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>

          <Skeleton className="h-10 w-40 mb-6" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass border border-white/10 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div>
                      <Skeleton className="h-5 w-16 mb-2" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Exchange Management</h1>
        <p className="text-gray-600">Manage regulatory bodies and exchanges</p>
      </div>

      {/* React Query Error */}
      {isError && (
        <Alert className="mb-6 border-red-500 bg-red-50">
          <AlertDescription className="text-red-700">
            {queryError?.message || 'Failed to load exchanges. The page will automatically retry.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Form Error */}
      {error && (
        <Alert className="mb-6 border-red-500 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Exchange
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Exchange</CardTitle>
            <CardDescription>Add a new regulatory body or exchange</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="exchange_code">Exchange Code *</Label>
                  <Input
                    id="exchange_code"
                    value={formData.exchange_code}
                    onChange={(e) => setFormData({ ...formData, exchange_code: e.target.value })}
                    placeholder="ICE, CME, CFTC"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="exchange_name">Exchange Name *</Label>
                  <Input
                    id="exchange_name"
                    value={formData.exchange_name}
                    onChange={(e) => setFormData({ ...formData, exchange_name: e.target.value })}
                    placeholder="Intercontinental Exchange"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="regulatory_body">Regulatory Body</Label>
                  <Input
                    id="regulatory_body"
                    value={formData.regulatory_body}
                    onChange={(e) => setFormData({ ...formData, regulatory_body: e.target.value })}
                    placeholder="CFTC"
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
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description of the exchange"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create Exchange</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exchanges.map((exchange) => (
          <Card key={exchange.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-xl">{exchange.exchange_code}</CardTitle>
                    <CardDescription className="mt-1">{exchange.exchange_name}</CardDescription>
                  </div>
                </div>
                {exchange.is_active ? (
                  <Badge className="bg-green-500">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {exchange.regulatory_body && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Regulatory Body:</span>
                    <span>{exchange.regulatory_body}</span>
                  </div>
                )}
                {exchange.country && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Globe className="h-4 w-4" />
                    <span>{exchange.country}</span>
                  </div>
                )}
                {exchange.website && (
                  <a
                    href={exchange.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline block"
                  >
                    Visit Website
                  </a>
                )}
                {exchange.description && (
                  <p className="text-sm text-gray-600 mt-2">{exchange.description}</p>
                )}
                <div className="pt-4 border-t mt-4">
                  <p className="text-xs text-gray-500">
                    Created: {new Date(exchange.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {exchanges.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No exchanges yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first exchange</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Exchange
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
    </AuthGuard>
  );
}

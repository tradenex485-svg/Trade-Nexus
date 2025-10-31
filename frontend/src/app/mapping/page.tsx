'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth-store';
import { mappingApi, type Mapping, type CreateMappingPayload } from '@/lib/api/mapping.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MapPin,
  Package,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Search,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export default function MappingPage() {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState('all');
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [filteredMappings, setFilteredMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<Mapping | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateMappingPayload>({
    contract_name: '',
    market_location: '',
    commodity_code: '',
    unit_of_trading: '',
    aggregate_1_positive_correlation: '',
    aggregate_2_negative_correlation: '',
  });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    loadMappings();
  }, [token]);

  useEffect(() => {
    filterMappings();
  }, [searchTerm, mappings]);

  const loadMappings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mappingApi.getAll();
      setMappings(response.data);
      setFilteredMappings(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load mappings');
    } finally {
      setLoading(false);
    }
  };

  const filterMappings = () => {
    if (!searchTerm) {
      setFilteredMappings(mappings);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = mappings.filter(
      (mapping) =>
        mapping.contract_name.toLowerCase().includes(term) ||
        mapping.market_location.toLowerCase().includes(term) ||
        mapping.commodity_code.toLowerCase().includes(term)
    );
    setFilteredMappings(filtered);
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      await mappingApi.create(formData);
      await loadMappings();
      setIsCreateOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to create mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedMapping) return;

    try {
      setSaving(true);
      await mappingApi.update(selectedMapping.id, formData);
      await loadMappings();
      setIsEditOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to update mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMapping) return;

    try {
      setSaving(true);
      await mappingApi.delete(selectedMapping.id);
      await loadMappings();
      setIsDeleteOpen(false);
      setSelectedMapping(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete mapping');
    } finally {
      setSaving(false);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditDialog = (mapping: Mapping) => {
    setSelectedMapping(mapping);
    setFormData({
      contract_name: mapping.contract_name,
      market_location: mapping.market_location,
      commodity_code: mapping.commodity_code,
      unit_of_trading: mapping.unit_of_trading || '',
      aggregate_1_positive_correlation: mapping.aggregate_1_positive_correlation || '',
      aggregate_2_negative_correlation: mapping.aggregate_2_negative_correlation || '',
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (mapping: Mapping) => {
    setSelectedMapping(mapping);
    setIsDeleteOpen(true);
  };

  const resetForm = () => {
    setFormData({
      contract_name: '',
      market_location: '',
      commodity_code: '',
      unit_of_trading: '',
      aggregate_1_positive_correlation: '',
      aggregate_2_negative_correlation: '',
    });
    setSelectedMapping(null);
  };

  const groupByMarket = () => {
    const grouped: Record<string, Mapping[]> = {};
    filteredMappings.forEach((mapping) => {
      if (!grouped[mapping.market_location]) {
        grouped[mapping.market_location] = [];
      }
      grouped[mapping.market_location].push(mapping);
    });
    return grouped;
  };

  const groupByCommodity = () => {
    const grouped: Record<string, Mapping[]> = {};
    filteredMappings.forEach((mapping) => {
      if (!grouped[mapping.commodity_code]) {
        grouped[mapping.commodity_code] = [];
      }
      grouped[mapping.commodity_code].push(mapping);
    });
    return grouped;
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading mappings...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Market Mapping</h1>
              <p className="text-slate-400">Manage commodity code to market location mappings</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadMappings}
                variant="outline"
                className="bg-slate-800 border-slate-600 hover:bg-slate-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Mapping
              </Button>
            </div>
          </div>

          {error && (
            <Alert className="bg-red-900/20 border-red-500/50">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">Total Mappings</CardDescription>
                <CardTitle className="text-3xl text-white">{mappings.length}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">Market Locations</CardDescription>
                <CardTitle className="text-3xl text-white">
                  {new Set(mappings.map((m) => m.market_location)).size}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">Commodity Codes</CardDescription>
                <CardTitle className="text-3xl text-white">
                  {new Set(mappings.map((m) => m.commodity_code)).size}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Search */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by contract name, market location, or commodity code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-900/50 border border-slate-700 flex-wrap h-auto">
              <TabsTrigger value="all">All Mappings</TabsTrigger>
              <TabsTrigger value="by-market">By Market</TabsTrigger>
              <TabsTrigger value="by-commodity">By Commodity</TabsTrigger>
            </TabsList>

            {/* All Mappings Tab */}
            <TabsContent value="all">
              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">All Mappings</CardTitle>
                  <CardDescription className="text-slate-400">
                    {filteredMappings.length} mapping{filteredMappings.length !== 1 ? 's' : ''} found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredMappings.map((mapping) => (
                      <div
                        key={mapping.id}
                        className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-white font-semibold">{mapping.contract_name}</h3>
                              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                                <MapPin className="h-3 w-3 mr-1" />
                                {mapping.market_location}
                              </Badge>
                              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                                <Package className="h-3 w-3 mr-1" />
                                {mapping.commodity_code}
                              </Badge>
                            </div>
                            {mapping.unit_of_trading && (
                              <p className="text-sm text-slate-400">Unit: {mapping.unit_of_trading}</p>
                            )}
                            <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
                              {mapping.aggregate_1_positive_correlation && (
                                <span>Agg 1 (+): {mapping.aggregate_1_positive_correlation}</span>
                              )}
                              {mapping.aggregate_2_negative_correlation && (
                                <span>Agg 2 (-): {mapping.aggregate_2_negative_correlation}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(mapping)}
                              className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteDialog(mapping)}
                              className="bg-red-900/20 border-red-500/30 hover:bg-red-900/30 text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredMappings.length === 0 && (
                      <div className="text-center py-12">
                        <MapPin className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-white font-semibold mb-1">No Mappings Found</p>
                        <p className="text-slate-400 text-sm">
                          {searchTerm ? 'Try a different search term' : 'Create your first mapping to get started'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* By Market Tab */}
            <TabsContent value="by-market" className="space-y-4">
              {Object.entries(groupByMarket()).map(([market, mappings]) => (
                <Card key={market} className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-400" />
                      {market}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {mappings.length} mapping{mappings.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {mappings.map((mapping) => (
                        <div
                          key={mapping.id}
                          className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                        >
                          <div className="flex-1">
                            <p className="text-white font-medium">{mapping.contract_name}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                                {mapping.commodity_code}
                              </Badge>
                              {mapping.unit_of_trading && (
                                <span className="text-xs text-slate-400">{mapping.unit_of_trading}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(mapping)}
                              className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteDialog(mapping)}
                              className="bg-red-900/20 border-red-500/30 hover:bg-red-900/30 text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {Object.keys(groupByMarket()).length === 0 && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-white font-semibold mb-1">No Markets Found</p>
                      <p className="text-slate-400 text-sm">
                        {searchTerm ? 'Try a different search term' : 'Create your first mapping to get started'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* By Commodity Tab */}
            <TabsContent value="by-commodity" className="space-y-4">
              {Object.entries(groupByCommodity()).map(([commodity, mappings]) => (
                <Card key={commodity} className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Package className="h-5 w-5 text-purple-400" />
                      {commodity}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {mappings.length} mapping{mappings.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {mappings.map((mapping) => (
                        <div
                          key={mapping.id}
                          className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                        >
                          <div className="flex-1">
                            <p className="text-white font-medium">{mapping.contract_name}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                                {mapping.market_location}
                              </Badge>
                              {mapping.unit_of_trading && (
                                <span className="text-xs text-slate-400">{mapping.unit_of_trading}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(mapping)}
                              className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteDialog(mapping)}
                              className="bg-red-900/20 border-red-500/30 hover:bg-red-900/30 text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {Object.keys(groupByCommodity()).length === 0 && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Package className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-white font-semibold mb-1">No Commodities Found</p>
                      <p className="text-slate-400 text-sm">
                        {searchTerm ? 'Try a different search term' : 'Create your first mapping to get started'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Mapping</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a new market location to commodity code mapping
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contract_name">Contract Name *</Label>
              <Input
                id="contract_name"
                value={formData.contract_name}
                onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="market_location">Market Location *</Label>
              <Input
                id="market_location"
                value={formData.market_location}
                onChange={(e) => setFormData({ ...formData, market_location: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="commodity_code">Commodity Code *</Label>
              <Input
                id="commodity_code"
                value={formData.commodity_code}
                onChange={(e) => setFormData({ ...formData, commodity_code: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="unit_of_trading">Unit of Trading</Label>
              <Input
                id="unit_of_trading"
                value={formData.unit_of_trading}
                onChange={(e) => setFormData({ ...formData, unit_of_trading: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="aggregate_1">Aggregate 1 (Positive Correlation)</Label>
              <Input
                id="aggregate_1"
                value={formData.aggregate_1_positive_correlation}
                onChange={(e) =>
                  setFormData({ ...formData, aggregate_1_positive_correlation: e.target.value })
                }
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="aggregate_2">Aggregate 2 (Negative Correlation)</Label>
              <Input
                id="aggregate_2"
                value={formData.aggregate_2_negative_correlation}
                onChange={(e) =>
                  setFormData({ ...formData, aggregate_2_negative_correlation: e.target.value })
                }
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="bg-slate-800 border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Mapping</DialogTitle>
            <DialogDescription className="text-slate-400">Update mapping details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_contract_name">Contract Name *</Label>
              <Input
                id="edit_contract_name"
                value={formData.contract_name}
                onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit_market_location">Market Location *</Label>
              <Input
                id="edit_market_location"
                value={formData.market_location}
                onChange={(e) => setFormData({ ...formData, market_location: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit_commodity_code">Commodity Code *</Label>
              <Input
                id="edit_commodity_code"
                value={formData.commodity_code}
                onChange={(e) => setFormData({ ...formData, commodity_code: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit_unit_of_trading">Unit of Trading</Label>
              <Input
                id="edit_unit_of_trading"
                value={formData.unit_of_trading}
                onChange={(e) => setFormData({ ...formData, unit_of_trading: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit_aggregate_1">Aggregate 1 (Positive Correlation)</Label>
              <Input
                id="edit_aggregate_1"
                value={formData.aggregate_1_positive_correlation}
                onChange={(e) =>
                  setFormData({ ...formData, aggregate_1_positive_correlation: e.target.value })
                }
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit_aggregate_2">Aggregate 2 (Negative Correlation)</Label>
              <Input
                id="edit_aggregate_2"
                value={formData.aggregate_2_negative_correlation}
                onChange={(e) =>
                  setFormData({ ...formData, aggregate_2_negative_correlation: e.target.value })
                }
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="bg-slate-800 border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Mapping</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this mapping? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedMapping && (
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <p className="text-white font-semibold">{selectedMapping.contract_name}</p>
              <p className="text-sm text-slate-400 mt-1">
                {selectedMapping.market_location} → {selectedMapping.commodity_code}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="bg-slate-800 border-slate-600">
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}

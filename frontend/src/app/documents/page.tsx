'use client';

import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { documentsApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { FileText, Upload, Download, Check, X, History, Search, Filter, RefreshCw, Loader2, Eye, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const dynamic = 'force-dynamic';

export default function DocumentsPage() {
  const { token } = useAuthStore();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    document_type: 'all',
    status: 'all',
    search: '',
  });
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadForm, setUploadForm] = useState({
    document_type: 'company_policy',
    title: '',
    description: '',
    category: '',
    effective_date: '',
    expiration_date: '',
    revision_notes: '',
  });
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [selectedDocVersions, setSelectedDocVersions] = useState<any[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const loadDocuments = useCallback(async () => {
    // Wait for token before loading data
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params: any = {};
      if (filter.document_type !== 'all') params.document_type = filter.document_type;
      if (filter.status !== 'all') params.status = filter.status;

      const response = await documentsApi.getAll(params);
      let docs = response.data || [];

      // Client-side search filtering
      if (filter.search) {
        docs = docs.filter((doc: any) =>
          doc.title?.toLowerCase().includes(filter.search.toLowerCase()) ||
          doc.description?.toLowerCase().includes(filter.search.toLowerCase())
        );
      }

      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, token]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'bg-gray-500',
      pending_approval: 'bg-yellow-500',
      approved: 'bg-green-500',
      archived: 'bg-blue-500',
    };
    return (
      <Badge className={`${variants[status] || 'bg-gray-500'} text-white`}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getDocumentTypeIcon = (type: string) => {
    return <FileText className="h-5 w-5" />;
  };

  // File upload handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file');
      return;
    }

    setUploading(true);

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', uploadForm.document_type);
        formData.append('title', uploadForm.title || file.name);
        formData.append('description', uploadForm.description);
        formData.append('category', uploadForm.category);
        formData.append('effective_date', uploadForm.effective_date);
        formData.append('expiration_date', uploadForm.expiration_date);
        formData.append('revision_notes', uploadForm.revision_notes);

        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        await documentsApi.upload(formData, token!);

        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
      }

      alert(`Successfully uploaded ${selectedFiles.length} document(s)!`);
      setUploadModalOpen(false);
      setSelectedFiles([]);
      setUploadForm({
        document_type: 'company_policy',
        title: '',
        description: '',
        category: '',
        effective_date: '',
        expiration_date: '',
        revision_notes: '',
      });
      setUploadProgress({});
      loadDocuments();
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const blob = await documentsApi.download(doc.id, token!);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      alert(`Download failed: ${error.message}`);
    }
  };

  const viewVersions = async (doc: any) => {
    try {
      const response = await documentsApi.getVersions(doc.id);
      setSelectedDocVersions(response.data || []);
      setVersionModalOpen(true);
    } catch (error: any) {
      alert(`Failed to load versions: ${error.message}`);
    }
  };

  const viewPreview = (doc: any) => {
    setPreviewDoc(doc);
    setPreviewModalOpen(true);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Document Management
            </h1>
            <p className="text-slate-400">
              Manage regulatory documents, rule books, and compliance files
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total Documents</p>
                    <p className="text-2xl font-bold text-white">{documents.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Pending Approval</p>
                    <p className="text-2xl font-bold text-white">
                      {documents.filter((d) => d.status === 'pending_approval').length}
                    </p>
                  </div>
                  <X className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Approved</p>
                    <p className="text-2xl font-bold text-white">
                      {documents.filter((d) => d.status === 'approved').length}
                    </p>
                  </div>
                  <Check className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Versions</p>
                    <p className="text-2xl font-bold text-white">
                      {documents.reduce((sum, d) => sum + (d.version_number || 1), 0)}
                    </p>
                  </div>
                  <History className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Actions */}
          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <Label className="text-slate-300 text-sm mb-2 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search documents..."
                      value={filter.search}
                      onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </div>

                {/* Document Type Filter */}
                <div>
                  <Label className="text-slate-300 text-sm mb-2 block">Document Type</Label>
                  <select
                    value={filter.document_type}
                    onChange={(e) => setFilter({ ...filter, document_type: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="exchange_rule">Exchange Rules</option>
                    <option value="cftc_rule">CFTC Rules</option>
                    <option value="company_policy">Company Policy</option>
                    <option value="contract">Contract</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <Label className="text-slate-300 text-sm mb-2 block">Status</Label>
                  <select
                    value={filter.status}
                    onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex items-end gap-2">
                  <Button
                    onClick={loadDocuments}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    onClick={() => setUploadModalOpen(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents Table */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Documents</CardTitle>
              <CardDescription className="text-slate-400">
                {documents.length} document{documents.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-slate-400">Loading documents...</div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  No documents found. Upload your first document to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left p-4 text-slate-300 font-medium">Type</th>
                        <th className="text-left p-4 text-slate-300 font-medium">Title</th>
                        <th className="text-left p-4 text-slate-300 font-medium">Version</th>
                        <th className="text-left p-4 text-slate-300 font-medium">Status</th>
                        <th className="text-left p-4 text-slate-300 font-medium">Effective Date</th>
                        <th className="text-left p-4 text-slate-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <motion.tr
                          key={doc.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-slate-300">
                              {getDocumentTypeIcon(doc.document_type)}
                              <span className="text-sm">{doc.document_type?.replace('_', ' ')}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-white font-medium">{doc.title}</div>
                            {doc.description && (
                              <div className="text-slate-400 text-sm mt-1">{doc.description}</div>
                            )}
                          </td>
                          <td className="p-4 text-slate-300">{doc.version || '1.0'}</td>
                          <td className="p-4">{getStatusBadge(doc.status)}</td>
                          <td className="p-4 text-slate-300">
                            {doc.effective_date ? new Date(doc.effective_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                onClick={() => viewPreview(doc)}
                                title="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                onClick={() => handleDownload(doc)}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                onClick={() => viewVersions(doc)}
                                title="Version History"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Modal */}
          <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
            <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>Upload Documents</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Upload regulatory documents, rule books, and compliance files
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Drag & Drop Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600'
                  }`}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-300 mb-2">Drag and drop files here, or click to browse</p>
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label htmlFor="file-upload">
                    <Button variant="outline" className="border-slate-600 text-slate-300" asChild>
                      <span>Browse Files</span>
                    </Button>
                  </Label>
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-slate-300">Selected Files ({selectedFiles.length})</Label>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-700/50 p-2 rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
                            <span className="text-sm text-slate-300 truncate">{file.name}</span>
                            <span className="text-xs text-slate-400 flex-shrink-0">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          {uploadProgress[file.name] !== undefined && (
                            <span className="text-xs text-green-400 mr-2">{uploadProgress[file.name]}%</span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFile(index)}
                            className="text-red-400 hover:text-red-300 flex-shrink-0"
                            disabled={uploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Document Type *</Label>
                    <select
                      value={uploadForm.document_type}
                      onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md text-white mt-1"
                      disabled={uploading}
                    >
                      <option value="exchange_rule">Exchange Rules</option>
                      <option value="cftc_rule">CFTC Rules</option>
                      <option value="company_policy">Company Policy</option>
                      <option value="contract">Contract</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Category</Label>
                    <Input
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="e.g., ICE, CFTC, CME"
                      disabled={uploading}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-slate-300">Title (optional)</Label>
                    <Input
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="Leave blank to use filename"
                      disabled={uploading}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-slate-300">Description</Label>
                    <Input
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="Brief description of the document"
                      disabled={uploading}
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Effective Date</Label>
                    <Input
                      type="date"
                      value={uploadForm.effective_date}
                      onChange={(e) => setUploadForm({ ...uploadForm, effective_date: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      disabled={uploading}
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Expiration Date</Label>
                    <Input
                      type="date"
                      value={uploadForm.expiration_date}
                      onChange={(e) => setUploadForm({ ...uploadForm, expiration_date: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      disabled={uploading}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setUploadModalOpen(false)}
                  className="border-slate-600 text-slate-300"
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={uploading || selectedFiles.length === 0}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    `Upload ${selectedFiles.length} File(s)`
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Version History Modal */}
          <Dialog open={versionModalOpen} onOpenChange={setVersionModalOpen}>
            <DialogContent className="max-w-3xl bg-slate-800 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>Version History</DialogTitle>
                <DialogDescription className="text-slate-400">
                  View all versions of this document
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedDocVersions.map((version) => (
                  <div
                    key={version.id}
                    className="bg-slate-700/50 p-4 rounded-lg border border-slate-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-white font-medium">Version {version.version}</span>
                          {version.is_current_version === 1 && (
                            <Badge className="bg-green-500 text-white">Current</Badge>
                          )}
                          {getStatusBadge(version.status)}
                        </div>
                        <p className="text-sm text-slate-300 mb-1">{version.title}</p>
                        {version.change_summary && (
                          <p className="text-xs text-slate-400 mb-2">{version.change_summary}</p>
                        )}
                        <div className="flex gap-4 text-xs text-slate-400">
                          <span>Size: {(version.file_size / 1024).toFixed(1)} KB</span>
                          <span>Uploaded: {new Date(version.created_at).toLocaleDateString()}</span>
                          {version.effective_date && (
                            <span>Effective: {new Date(version.effective_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300"
                        onClick={() => handleDownload(version)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setVersionModalOpen(false)}
                  className="border-slate-600 text-slate-300"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Document Preview Modal */}
          <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
            <DialogContent className="max-w-4xl bg-slate-800 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>{previewDoc?.title}</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Document preview and details
                </DialogDescription>
              </DialogHeader>

              {previewDoc && (
                <div className="space-y-4">
                  {/* Document Details */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-700/50 p-4 rounded-lg">
                    <div>
                      <span className="text-slate-400 text-sm">Type:</span>
                      <p className="text-white">{previewDoc.document_type?.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Category:</span>
                      <p className="text-white">{previewDoc.category || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Status:</span>
                      <div className="mt-1">{getStatusBadge(previewDoc.status)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Version:</span>
                      <p className="text-white">{previewDoc.version}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">File Size:</span>
                      <p className="text-white">{(previewDoc.file_size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Uploaded:</span>
                      <p className="text-white">{new Date(previewDoc.created_at).toLocaleDateString()}</p>
                    </div>
                    {previewDoc.effective_date && (
                      <div>
                        <span className="text-slate-400 text-sm">Effective:</span>
                        <p className="text-white">{new Date(previewDoc.effective_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    {previewDoc.expiration_date && (
                      <div>
                        <span className="text-slate-400 text-sm">Expires:</span>
                        <p className="text-white">{new Date(previewDoc.expiration_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {previewDoc.description && (
                    <div>
                      <span className="text-slate-400 text-sm">Description:</span>
                      <p className="text-white mt-1">{previewDoc.description}</p>
                    </div>
                  )}

                  {/* File Preview Placeholder */}
                  <div className="bg-slate-700/50 p-8 rounded-lg text-center border-2 border-dashed border-slate-600">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-300 mb-2">{previewDoc.file_name}</p>
                    <p className="text-slate-400 text-sm mb-4">
                      {previewDoc.mime_type || 'Unknown type'}
                    </p>
                    <Button
                      onClick={() => handleDownload(previewDoc)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Document
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPreviewModalOpen(false)}
                  className="border-slate-600 text-slate-300"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AuthGuard>
  );
}

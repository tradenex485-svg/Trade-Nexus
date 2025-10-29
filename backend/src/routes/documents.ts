/**
 * Document Management Routes
 */

import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';
import * as documentService from '../services/document-service';

const app = new Hono();

/**
 * GET /api/documents
 * Get all documents with filtering
 */
app.get('/', authenticate, authorize('documents.read'), async (c) => {
  try {
    const user = c.get('user');
    const filters = {
      document_type: c.req.query('document_type'),
      category: c.req.query('category'),
      status: c.req.query('status'),
      current_version_only: c.req.query('current_only') === 'true',
    };

    // Company users can only see their documents and public documents
    if (user.role_name !== 'super_admin' && user.company_id) {
      filters['company_id'] = user.company_id;
    }

    const documents = await documentService.getDocuments(c.env.DB, filters);

    return c.json({
      success: true,
      data: documents,
      count: documents.length,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'Failed to retrieve documents',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/documents
 * Upload a new document (with file)
 */
app.post('/', authenticate, authorize('documents.create'), async (c) => {
  try {
    const user = c.get('user');
    const formData = await c.req.formData();

    const file = formData.get('file') as File;
    if (!file) {
      return c.json({
        success: false,
        error: 'No file provided',
      }, 400);
    }

    // Extract metadata from form
    const documentType = formData.get('document_type') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const category = formData.get('category') as string || '';
    const effectiveDate = formData.get('effective_date') as string || null;
    const expirationDate = formData.get('expiration_date') as string || null;
    const revisionNotes = formData.get('revision_notes') as string || '';
    const exchangeId = formData.get('exchange_id') ? parseInt(formData.get('exchange_id') as string) : null;
    const companyId = formData.get('company_id') ? parseInt(formData.get('company_id') as string) : user.company_id;

    // Generate file hash for duplicate detection
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check for duplicates
    const existingDoc = await c.env.DB.prepare(`
      SELECT id, title FROM documents WHERE file_hash = ? AND status != 'archived'
    `).bind(fileHash).first();

    if (existingDoc) {
      return c.json({
        success: false,
        error: 'Duplicate file detected',
        message: `This file already exists as "${existingDoc.title}" (ID: ${existingDoc.id})`,
      }, 409);
    }

    // Upload file to R2
    const fileName = file.name;
    const timestamp = Date.now();
    const r2Key = `documents/${user.company_id || 'global'}/${timestamp}_${fileName}`;

    await c.env.DOCUMENTS.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        uploadedBy: user.id.toString(),
        originalName: fileName,
      },
    });

    // Save document metadata to D1
    const documentId = await documentService.uploadDocument(c.env.DB, {
      document_type: documentType,
      title: title || fileName,
      description,
      category,
      file_name: fileName,
      file_path: r2Key,
      file_size: file.size,
      file_hash: fileHash,
      mime_type: file.type,
      version: '1.0',
      version_number: 1,
      is_current_version: 1,
      effective_date: effectiveDate,
      expiration_date: expirationDate,
      revision_notes: revisionNotes,
      exchange_id: exchangeId,
      company_id: companyId,
      visibility: 'all',
      uploaded_by: user.id,
      status: user.role_name === 'super_admin' ? 'approved' : 'pending_approval',
    });

    // Log the upload
    await documentService.logDocumentAccess(
      c.env.DB,
      documentId,
      user.id,
      'upload',
      c.req.header('cf-connecting-ip'),
      c.req.header('user-agent')
    );

    // Send notification for new exchange documents
    if (documentType === 'exchange_rule') {
      await documentService.sendDocumentNotification(
        c.env.DB,
        documentId,
        'new_version',
        'all_companies',
        undefined,
        `New ${category} rule book uploaded: ${title || fileName}`
      );
    }

    return c.json({
      success: true,
      data: { id: documentId, file_hash: fileHash },
      message: 'Document uploaded successfully',
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return c.json({
      success: false,
      error: 'Failed to upload document',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/documents/:id
 * Get document by ID and log access
 */
app.get('/:id', authenticate, authorize('documents.read'), async (c) => {
  try {
    const user = c.get('user');
    const documentId = parseInt(c.req.param('id'));

    const document = await documentService.getDocumentById(c.env.DB, documentId);

    if (!document) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }

    // Log access
    await documentService.logDocumentAccess(
      c.env.DB,
      documentId,
      user.id,
      'view',
      c.req.header('cf-connecting-ip'),
      c.req.header('user-agent')
    );

    return c.json({
      success: true,
      data: document,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'Failed to retrieve document',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/documents/:id/download
 * Download document file from R2
 */
app.get('/:id/download', authenticate, authorize('documents.read'), async (c) => {
  try {
    const user = c.get('user');
    const documentId = parseInt(c.req.param('id'));

    const document = await documentService.getDocumentById(c.env.DB, documentId);

    if (!document) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }

    // Check access permissions
    if (document.company_id && user.company_id !== document.company_id && user.role_name !== 'super_admin') {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    // Get file from R2
    const object = await c.env.DOCUMENTS.get(document.file_path);

    if (!object) {
      return c.json({ success: false, error: 'File not found in storage' }, 404);
    }

    // Log the download
    await documentService.logDocumentAccess(
      c.env.DB,
      documentId,
      user.id,
      'download',
      c.req.header('cf-connecting-ip'),
      c.req.header('user-agent')
    );

    // Return file with proper headers
    return new Response(object.body, {
      headers: {
        'Content-Type': document.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${document.file_name}"`,
        'Content-Length': document.file_size?.toString() || '',
      },
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return c.json({
      success: false,
      error: 'Failed to download document',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/documents/:id/versions
 * Get document version history
 */
app.get('/:id/versions', authenticate, authorize('documents.read'), async (c) => {
  try {
    const documentId = parseInt(c.req.param('id'));
    const versions = await documentService.getDocumentVersions(c.env.DB, documentId);

    return c.json({
      success: true,
      data: versions,
      count: versions.length,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'Failed to retrieve document versions',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/documents/:id/approve
 * Approve a document
 */
app.post('/:id/approve', authenticate, authorize('documents.approve'), async (c) => {
  try {
    const user = c.get('user');
    const documentId = parseInt(c.req.param('id'));

    await documentService.approveDocument(c.env.DB, documentId, user.id);

    return c.json({
      success: true,
      message: 'Document approved successfully',
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'Failed to approve document',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/documents/:id/archive
 * Archive a document
 */
app.post('/:id/archive', authenticate, authorize('documents.delete'), async (c) => {
  try {
    const documentId = parseInt(c.req.param('id'));

    await documentService.archiveDocument(c.env.DB, documentId);

    return c.json({
      success: true,
      message: 'Document archived successfully',
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'Failed to archive document',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/documents/recent
 * Get recently added documents
 */
app.get('/recent/list', authenticate, authorize('documents.read'), async (c) => {
  try {
    const user = c.get('user');
    const limit = parseInt(c.req.query('limit') || '10');

    const documents = await documentService.getRecentDocuments(
      c.env.DB,
      limit,
      user.company_id
    );

    return c.json({
      success: true,
      data: documents,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'Failed to retrieve recent documents',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/documents/expiring
 * Get documents expiring soon
 */
app.get('/expiring/list', authenticate, authorize('documents.read'), async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '30');
    const documents = await documentService.getExpiringDocuments(c.env.DB, days);

    return c.json({
      success: true,
      data: documents,
      count: documents.length,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'Failed to retrieve expiring documents',
      message: error.message,
    }, 500);
  }
});

export default app;

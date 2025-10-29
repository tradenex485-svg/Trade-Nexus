/**
 * Document Management Service
 * Handles ICE/CFTC rule books, internal compliance documents, versioning
 */

export interface Document {
  id?: number;
  document_type: string;
  title: string;
  description?: string;
  category?: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_hash?: string;
  mime_type?: string;
  version: string;
  version_number: number;
  previous_version_id?: number;
  is_current_version: number;
  effective_date?: string;
  expiration_date?: string;
  revision_notes?: string;
  change_summary?: string;
  exchange_id?: number;
  company_id?: number;
  visibility: string;
  uploaded_by: number;
  approved_by?: number;
  approved_at?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Upload a new document
 */
export async function uploadDocument(
  db: any,
  document: Omit<Document, 'id' | 'created_at' | 'updated_at'>
): Promise<number> {
  const result = await db.prepare(`
    INSERT INTO documents (
      document_type, title, description, category,
      file_name, file_path, file_size, file_hash, mime_type,
      version, version_number, previous_version_id, is_current_version,
      effective_date, expiration_date, revision_notes, change_summary,
      exchange_id, company_id, visibility,
      uploaded_by, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    document.document_type,
    document.title,
    document.description || null,
    document.category || null,
    document.file_name,
    document.file_path,
    document.file_size || null,
    document.file_hash || null,
    document.mime_type || null,
    document.version,
    document.version_number,
    document.previous_version_id || null,
    document.is_current_version,
    document.effective_date || null,
    document.expiration_date || null,
    document.revision_notes || null,
    document.change_summary || null,
    document.exchange_id || null,
    document.company_id || null,
    document.visibility,
    document.uploaded_by,
    document.status
  ).run();

  return result.meta.last_row_id as number;
}

/**
 * Get documents with filtering
 */
export async function getDocuments(
  db: any,
  filters?: {
    document_type?: string;
    category?: string;
    status?: string;
    exchange_id?: number;
    company_id?: number;
    current_version_only?: boolean;
    visibility?: string;
  }
): Promise<any[]> {
  let query = `SELECT * FROM documents WHERE 1=1`;
  const params: any[] = [];

  if (filters?.document_type) {
    query += ` AND document_type = ?`;
    params.push(filters.document_type);
  }

  if (filters?.category) {
    query += ` AND category = ?`;
    params.push(filters.category);
  }

  if (filters?.status) {
    query += ` AND status = ?`;
    params.push(filters.status);
  }

  if (filters?.exchange_id !== undefined) {
    query += ` AND (exchange_id = ? OR exchange_id IS NULL)`;
    params.push(filters.exchange_id);
  }

  if (filters?.company_id !== undefined) {
    query += ` AND (company_id = ? OR company_id IS NULL)`;
    params.push(filters.company_id);
  }

  if (filters?.current_version_only) {
    query += ` AND is_current_version = 1`;
  }

  if (filters?.visibility) {
    query += ` AND visibility = ?`;
    params.push(filters.visibility);
  }

  query += ` ORDER BY created_at DESC`;

  const result = await db.prepare(query).bind(...params).all();
  return result.results;
}

/**
 * Get document by ID
 */
export async function getDocumentById(db: any, documentId: number): Promise<any> {
  const result = await db.prepare(`
    SELECT * FROM documents WHERE id = ?
  `).bind(documentId).first();

  return result;
}

/**
 * Get document version history
 */
export async function getDocumentVersions(db: any, documentId: number): Promise<any[]> {
  // Get all versions in the chain
  const result = await db.prepare(`
    WITH RECURSIVE version_chain AS (
      -- Start with the current document
      SELECT * FROM documents WHERE id = ?
      UNION ALL
      -- Recursively get previous versions
      SELECT d.* FROM documents d
      INNER JOIN version_chain vc ON d.id = vc.previous_version_id
    )
    SELECT * FROM version_chain
    ORDER BY version_number DESC
  `).bind(documentId).all();

  return result.results;
}

/**
 * Approve a document
 */
export async function approveDocument(
  db: any,
  documentId: number,
  approvedBy: number
): Promise<void> {
  await db.prepare(`
    UPDATE documents
    SET status = 'approved',
        approved_by = ?,
        approved_at = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(approvedBy, documentId).run();
}

/**
 * Log document access
 */
export async function logDocumentAccess(
  db: any,
  documentId: number,
  userId: number,
  action: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await db.prepare(`
    INSERT INTO document_access_log (
      document_id, user_id, action, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?)
  `).bind(
    documentId,
    userId,
    action,
    ipAddress || null,
    userAgent || null
  ).run();
}

/**
 * Send document notification
 */
export async function sendDocumentNotification(
  db: any,
  documentId: number,
  notificationType: string,
  recipientType: string,
  companyId?: number,
  message?: string
): Promise<void> {
  await db.prepare(`
    INSERT INTO document_notifications (
      document_id, notification_type, recipient_type, company_id, message
    ) VALUES (?, ?, ?, ?, ?)
  `).bind(
    documentId,
    notificationType,
    recipientType,
    companyId || null,
    message || null
  ).run();
}

/**
 * Get recent documents
 */
export async function getRecentDocuments(
  db: any,
  limit: number = 10,
  companyId?: number
): Promise<any[]> {
  let query = `
    SELECT * FROM documents
    WHERE is_current_version = 1
    AND status = 'approved'
  `;

  const params: any[] = [];

  if (companyId) {
    query += ` AND (company_id = ? OR company_id IS NULL)`;
    params.push(companyId);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);

  const result = await db.prepare(query).bind(...params).all();
  return result.results;
}

/**
 * Archive a document
 */
export async function archiveDocument(
  db: any,
  documentId: number
): Promise<void> {
  await db.prepare(`
    UPDATE documents
    SET status = 'archived',
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(documentId).run();
}

/**
 * Get expiring documents
 */
export async function getExpiringDocuments(
  db: any,
  daysAhead: number = 30
): Promise<any[]> {
  const result = await db.prepare(`
    SELECT * FROM documents
    WHERE is_current_version = 1
    AND status = 'approved'
    AND expiration_date IS NOT NULL
    AND expiration_date <= date('now', '+' || ? || ' days')
    AND expiration_date >= date('now')
    ORDER BY expiration_date ASC
  `).bind(daysAhead).all();

  return result.results;
}

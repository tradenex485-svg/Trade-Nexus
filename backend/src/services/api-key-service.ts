/**
 * API Key Management Service
 * Handles creation, validation, and management of API keys for system integrations
 */

import { hashPassword } from './auth-service';

export interface ApiKey {
  id: number;
  key_name: string;
  key_prefix: string;
  company_id?: number;
  created_by: number;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  is_active: number;
  scopes?: string;
  rate_limit: number;
  ip_whitelist?: string;
  description?: string;
}

export interface CreateApiKeyRequest {
  key_name: string;
  company_id?: number;
  scopes?: string[];
  rate_limit?: number;
  ip_whitelist?: string[];
  description?: string;
  expires_in_days?: number;
}

export interface CreateApiKeyResponse {
  id: number;
  api_key: string; // Full key - only returned once!
  key_prefix: string;
  key_name: string;
  expires_at?: string;
  scopes?: string[];
}

/**
 * Generate a cryptographically secure API key
 */
function generateApiKey(): string {
  // Generate 32 random bytes
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);

  // Convert to base64url (URL-safe base64)
  const base64 = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `sk_live_${base64}`;
}

/**
 * Create a new API key
 */
export async function createApiKey(
  db: any,
  request: CreateApiKeyRequest,
  createdBy: number
): Promise<CreateApiKeyResponse> {
  // Generate API key
  const apiKey = generateApiKey();
  const keyPrefix = apiKey.substring(0, 16); // "sk_live_12345678"

  // Hash the key for storage (using same PBKDF2 as passwords)
  const keyHash = await hashPassword(apiKey);

  // Calculate expiration
  const expiresAt = request.expires_in_days
    ? (() => {
        const date = new Date();
        date.setDate(date.getDate() + request.expires_in_days);
        return date.toISOString();
      })()
    : null;

  // Insert into database
  const result = await db.prepare(`
    INSERT INTO api_keys (
      key_name, key_hash, key_prefix, company_id,
      created_by, expires_at, scopes, rate_limit,
      ip_whitelist, description, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).bind(
    request.key_name,
    keyHash,
    keyPrefix,
    request.company_id || null,
    createdBy,
    expiresAt,
    request.scopes ? JSON.stringify(request.scopes) : null,
    request.rate_limit || 1000,
    request.ip_whitelist ? JSON.stringify(request.ip_whitelist) : null,
    request.description || null
  ).run();

  return {
    id: result.meta.last_row_id,
    api_key: apiKey, // Return full key ONLY on creation
    key_prefix: keyPrefix,
    key_name: request.key_name,
    expires_at: expiresAt || undefined,
    scopes: request.scopes,
  };
}

/**
 * Validate an API key and return key details if valid
 */
export async function validateApiKey(
  db: any,
  apiKey: string
): Promise<ApiKey | null> {
  const keyPrefix = apiKey.substring(0, 16);

  // Get key by prefix first (faster lookup)
  const storedKey = await db.prepare(`
    SELECT * FROM api_keys
    WHERE key_prefix = ? AND is_active = 1
    LIMIT 1
  `).bind(keyPrefix).first();

  if (!storedKey) {
    return null;
  }

  // Check if expired
  if (storedKey.expires_at && new Date(storedKey.expires_at) < new Date()) {
    return null;
  }

  // Verify hash
  const keyHash = await hashPassword(apiKey);
  if (keyHash !== storedKey.key_hash) {
    return null;
  }

  return storedKey as ApiKey;
}

/**
 * Log API key usage
 */
export async function logApiKeyUsage(
  db: any,
  apiKeyId: number,
  request: {
    endpoint: string;
    method: string;
    ip_address?: string;
    user_agent?: string;
    response_status: number;
    response_time_ms?: number;
    request_size?: number;
    response_size?: number;
    error_message?: string;
  }
): Promise<void> {
  await db.prepare(`
    INSERT INTO api_key_usage (
      api_key_id, endpoint, method, ip_address, user_agent,
      response_status, response_time_ms, request_size,
      response_size, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    apiKeyId,
    request.endpoint,
    request.method,
    request.ip_address || null,
    request.user_agent || null,
    request.response_status,
    request.response_time_ms || null,
    request.request_size || null,
    request.response_size || null,
    request.error_message || null
  ).run();
}

/**
 * Check rate limit for an API key
 */
export async function checkRateLimit(
  db: any,
  apiKeyId: number,
  rateLimit: number
): Promise<{ allowed: boolean; current_usage: number; limit: number }> {
  // Get usage count in last hour
  const usage = await db.prepare(`
    SELECT COUNT(*) as count
    FROM api_key_usage
    WHERE api_key_id = ?
      AND request_timestamp >= datetime('now', '-1 hour')
  `).bind(apiKeyId).first();

  const currentUsage = usage?.count || 0;

  return {
    allowed: currentUsage < rateLimit,
    current_usage: currentUsage,
    limit: rateLimit,
  };
}

/**
 * Check IP whitelist for an API key
 */
export async function checkIpWhitelist(
  apiKey: ApiKey,
  ipAddress: string
): Promise<boolean> {
  if (!apiKey.ip_whitelist) {
    return true; // No whitelist = allow all
  }

  try {
    const whitelist = JSON.parse(apiKey.ip_whitelist);
    return whitelist.includes(ipAddress);
  } catch {
    return false;
  }
}

/**
 * Get all API keys with usage stats
 */
export async function getApiKeys(
  db: any,
  filters?: {
    company_id?: number;
    is_active?: boolean;
  }
): Promise<any[]> {
  let query = `SELECT * FROM v_api_keys_summary WHERE 1=1`;
  const params: any[] = [];

  if (filters?.company_id !== undefined) {
    query += ` AND company_id = ?`;
    params.push(filters.company_id);
  }

  if (filters?.is_active !== undefined) {
    query += ` AND is_active = ?`;
    params.push(filters.is_active ? 1 : 0);
  }

  query += ` ORDER BY created_at DESC`;

  const result = await db.prepare(query).bind(...params).all();
  return result.results;
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeApiKey(
  db: any,
  apiKeyId: number
): Promise<void> {
  await db.prepare(`
    UPDATE api_keys
    SET is_active = 0
    WHERE id = ?
  `).bind(apiKeyId).run();
}

/**
 * Update API key settings
 */
export async function updateApiKey(
  db: any,
  apiKeyId: number,
  updates: {
    key_name?: string;
    scopes?: string[];
    rate_limit?: number;
    ip_whitelist?: string[];
    description?: string;
    expires_at?: string;
  }
): Promise<void> {
  const setClauses: string[] = [];
  const params: any[] = [];

  if (updates.key_name !== undefined) {
    setClauses.push('key_name = ?');
    params.push(updates.key_name);
  }

  if (updates.scopes !== undefined) {
    setClauses.push('scopes = ?');
    params.push(JSON.stringify(updates.scopes));
  }

  if (updates.rate_limit !== undefined) {
    setClauses.push('rate_limit = ?');
    params.push(updates.rate_limit);
  }

  if (updates.ip_whitelist !== undefined) {
    setClauses.push('ip_whitelist = ?');
    params.push(JSON.stringify(updates.ip_whitelist));
  }

  if (updates.description !== undefined) {
    setClauses.push('description = ?');
    params.push(updates.description);
  }

  if (updates.expires_at !== undefined) {
    setClauses.push('expires_at = ?');
    params.push(updates.expires_at);
  }

  if (setClauses.length === 0) {
    return;
  }

  params.push(apiKeyId);

  await db.prepare(`
    UPDATE api_keys
    SET ${setClauses.join(', ')}
    WHERE id = ?
  `).bind(...params).run();
}

/**
 * Get API key usage statistics
 */
export async function getApiKeyUsageStats(
  db: any,
  apiKeyId: number,
  hours: number = 24
): Promise<{
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time_ms: number;
  endpoints: Array<{ endpoint: string; count: number }>;
}> {
  const stats = await db.prepare(`
    SELECT
      COUNT(*) as total_requests,
      SUM(CASE WHEN response_status < 400 THEN 1 ELSE 0 END) as successful_requests,
      SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as failed_requests,
      AVG(response_time_ms) as avg_response_time_ms
    FROM api_key_usage
    WHERE api_key_id = ?
      AND request_timestamp >= datetime('now', '-${hours} hours')
  `).bind(apiKeyId).first();

  const endpoints = await db.prepare(`
    SELECT endpoint, COUNT(*) as count
    FROM api_key_usage
    WHERE api_key_id = ?
      AND request_timestamp >= datetime('now', '-${hours} hours')
    GROUP BY endpoint
    ORDER BY count DESC
    LIMIT 10
  `).bind(apiKeyId).all();

  return {
    total_requests: stats?.total_requests || 0,
    successful_requests: stats?.successful_requests || 0,
    failed_requests: stats?.failed_requests || 0,
    avg_response_time_ms: stats?.avg_response_time_ms || 0,
    endpoints: endpoints.results,
  };
}

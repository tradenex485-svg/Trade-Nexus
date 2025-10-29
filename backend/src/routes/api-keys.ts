/**
 * API Keys Routes
 * Manage API keys for system integrations
 */

import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';
import {
  createApiKey,
  getApiKeys,
  revokeApiKey,
  updateApiKey,
  getApiKeyUsageStats,
} from '../services/api-key-service';

const app = new Hono();

/**
 * GET /api/api-keys
 * Get all API keys (with usage stats)
 */
app.get('/', authenticate, authorize('api_keys.read'), async (c) => {
  try {
    const user = c.get('user');
    const companyId = c.req.query('company_id');
    const isActive = c.req.query('is_active');

    const filters: any = {};

    // Super admin can see all keys, others only their company
    if (user.role_id !== 3) {
      filters.company_id = user.company_id;
    } else if (companyId) {
      filters.company_id = parseInt(companyId);
    }

    if (isActive !== undefined) {
      filters.is_active = isActive === 'true';
    }

    const keys = await getApiKeys(c.env.DB, filters);

    // Parse JSON fields
    const parsedKeys = keys.map((key: any) => ({
      ...key,
      scopes: key.scopes ? JSON.parse(key.scopes) : null,
      ip_whitelist: key.ip_whitelist ? JSON.parse(key.ip_whitelist) : null,
    }));

    return c.json({
      success: true,
      data: parsedKeys,
      count: parsedKeys.length,
    });
  } catch (error: any) {
    console.error('[API] Error getting API keys:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve API keys',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/api-keys
 * Create a new API key
 */
app.post('/', authenticate, authorize('api_keys.create'), async (c) => {
  try {
    const user = c.get('user');
    const {
      key_name,
      company_id,
      scopes,
      rate_limit,
      ip_whitelist,
      description,
      expires_in_days,
    } = await c.req.json();

    // Validation
    if (!key_name) {
      return c.json({
        success: false,
        error: 'key_name is required',
      }, 400);
    }

    // Use user's company if not specified (or if user is not super admin)
    const effectiveCompanyId = (user.role_id === 3 && company_id) ? company_id : user.company_id;

    const result = await createApiKey(c.env.DB, {
      key_name,
      company_id: effectiveCompanyId,
      scopes,
      rate_limit,
      ip_whitelist,
      description,
      expires_in_days,
    }, user.id);

    return c.json({
      success: true,
      message: 'API key created successfully. IMPORTANT: Save this key now - it will not be shown again!',
      data: result,
    }, 201);
  } catch (error: any) {
    console.error('[API] Error creating API key:', error);
    return c.json({
      success: false,
      error: 'Failed to create API key',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/api-keys/:id
 * Get a specific API key details
 */
app.get('/:id', authenticate, authorize('api_keys.read'), async (c) => {
  try {
    const user = c.get('user');
    const keyId = parseInt(c.req.param('id'));

    let query = `
      SELECT * FROM v_api_keys_summary
      WHERE id = ?
    `;
    const params: any[] = [keyId];

    // Filter by company if not super admin
    if (user.role_id !== 3) {
      query += ` AND company_id = ?`;
      params.push(user.company_id);
    }

    const key = await c.env.DB.prepare(query).bind(...params).first();

    if (!key) {
      return c.json({
        success: false,
        error: 'API key not found',
      }, 404);
    }

    // Parse JSON fields
    const parsedKey = {
      ...key,
      scopes: key.scopes ? JSON.parse(key.scopes) : null,
      ip_whitelist: key.ip_whitelist ? JSON.parse(key.ip_whitelist) : null,
    };

    return c.json({
      success: true,
      data: parsedKey,
    });
  } catch (error: any) {
    console.error('[API] Error getting API key:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve API key',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/api-keys/:id/usage
 * Get usage statistics for an API key
 */
app.get('/:id/usage', authenticate, authorize('api_keys.read'), async (c) => {
  try {
    const user = c.get('user');
    const keyId = parseInt(c.req.param('id'));
    const hours = parseInt(c.req.query('hours') || '24');

    // Verify access to this key
    let query = `SELECT * FROM api_keys WHERE id = ?`;
    const params: any[] = [keyId];

    if (user.role_id !== 3) {
      query += ` AND company_id = ?`;
      params.push(user.company_id);
    }

    const key = await c.env.DB.prepare(query).bind(...params).first();

    if (!key) {
      return c.json({
        success: false,
        error: 'API key not found',
      }, 404);
    }

    const stats = await getApiKeyUsageStats(c.env.DB, keyId, hours);

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[API] Error getting API key usage:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve API key usage',
      message: error.message,
    }, 500);
  }
});

/**
 * PUT /api/api-keys/:id
 * Update an API key
 */
app.put('/:id', authenticate, authorize('api_keys.update'), async (c) => {
  try {
    const user = c.get('user');
    const keyId = parseInt(c.req.param('id'));
    const {
      key_name,
      scopes,
      rate_limit,
      ip_whitelist,
      description,
      expires_at,
    } = await c.req.json();

    // Verify access to this key
    let query = `SELECT * FROM api_keys WHERE id = ?`;
    const params: any[] = [keyId];

    if (user.role_id !== 3) {
      query += ` AND company_id = ?`;
      params.push(user.company_id);
    }

    const key = await c.env.DB.prepare(query).bind(...params).first();

    if (!key) {
      return c.json({
        success: false,
        error: 'API key not found',
      }, 404);
    }

    await updateApiKey(c.env.DB, keyId, {
      key_name,
      scopes,
      rate_limit,
      ip_whitelist,
      description,
      expires_at,
    });

    return c.json({
      success: true,
      message: 'API key updated successfully',
    });
  } catch (error: any) {
    console.error('[API] Error updating API key:', error);
    return c.json({
      success: false,
      error: 'Failed to update API key',
      message: error.message,
    }, 500);
  }
});

/**
 * DELETE /api/api-keys/:id
 * Revoke (deactivate) an API key
 */
app.delete('/:id', authenticate, authorize('api_keys.delete'), async (c) => {
  try {
    const user = c.get('user');
    const keyId = parseInt(c.req.param('id'));

    // Verify access to this key
    let query = `SELECT * FROM api_keys WHERE id = ?`;
    const params: any[] = [keyId];

    if (user.role_id !== 3) {
      query += ` AND company_id = ?`;
      params.push(user.company_id);
    }

    const key = await c.env.DB.prepare(query).bind(...params).first();

    if (!key) {
      return c.json({
        success: false,
        error: 'API key not found',
      }, 404);
    }

    await revokeApiKey(c.env.DB, keyId);

    return c.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error: any) {
    console.error('[API] Error revoking API key:', error);
    return c.json({
      success: false,
      error: 'Failed to revoke API key',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/api-keys/stats/summary
 * Get overall API key statistics
 */
app.get('/stats/summary', authenticate, authorize('api_keys.read'), async (c) => {
  try {
    const user = c.get('user');

    let query = `
      SELECT
        COUNT(*) as total_keys,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_keys,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as revoked_keys,
        SUM(CASE WHEN expires_at < datetime('now') THEN 1 ELSE 0 END) as expired_keys,
        SUM(CASE WHEN expires_at <= datetime('now', '+7 days') AND expires_at > datetime('now') THEN 1 ELSE 0 END) as expiring_soon
      FROM api_keys
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user.role_id !== 3) {
      query += ` AND company_id = ?`;
      params.push(user.company_id);
    }

    const stats = await c.env.DB.prepare(query).bind(...params).first();

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[API] Error getting API key stats:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve API key statistics',
      message: error.message,
    }, 500);
  }
});

export default app;

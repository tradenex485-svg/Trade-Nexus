/**
 * Exchange Management Routes
 * Super Admin only - manages exchanges/regulatory bodies
 */

import { Hono } from 'hono';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';

type Bindings = {
  DB: D1Database;
  CACHE: KVNamespace;
};

const exchangesRoutes = new Hono<{ Bindings: Bindings }>();

// Cache configuration
const CACHE_TTL = 300; // 5 minutes
const CACHE_KEY_PREFIX = 'exchanges:';

// Get all exchanges (public endpoint - filtered to active exchanges only when not authenticated)
exchangesRoutes.get('/', optionalAuth, async (c) => {
  const user = c.get('user'); // Will be undefined if not authenticated
  const startTime = Date.now();
  const cacheKey = `${CACHE_KEY_PREFIX}all`;

  try {
    // Try cache first
    const cached = await c.env.CACHE.get(cacheKey, 'json');
    if (cached) {
      const responseTime = Date.now() - startTime;
      c.header('X-Cache-Status', 'HIT');
      c.header('X-Response-Time', `${responseTime}ms`);
      c.header('Cache-Control', `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`);

      return c.json(cached);
    }

    // Cache miss - fetch from database
    // If not authenticated, only return active exchanges
    const query = user
      ? `SELECT
          id, exchange_code, exchange_name, regulatory_body, country,
          description, website, contact_email, contact_phone, is_active,
          created_at, updated_at
        FROM exchanges
        ORDER BY exchange_name`
      : `SELECT
          id, exchange_code, exchange_name, regulatory_body, country,
          description, website, contact_email, contact_phone, is_active,
          created_at, updated_at
        FROM exchanges
        WHERE is_active = 1
        ORDER BY exchange_name`;

    const result = await c.env.DB.prepare(query).all();

    const response = {
      success: true,
      data: result.results || [],
      count: result.results?.length || 0,
    };

    // Store in cache
    await c.env.CACHE.put(cacheKey, JSON.stringify(response), {
      expirationTtl: CACHE_TTL,
    });

    const responseTime = Date.now() - startTime;
    c.header('X-Cache-Status', 'MISS');
    c.header('X-Response-Time', `${responseTime}ms`);
    c.header('Cache-Control', `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`);

    return c.json(response);
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('Error fetching exchanges:', error);
    c.header('X-Response-Time', `${responseTime}ms`);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get exchange by ID
exchangesRoutes.get('/:id', authenticate, authorize('exchanges.read'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const exchange = await c.env.DB.prepare(`
      SELECT
        id, exchange_code, exchange_name, regulatory_body, country,
        description, website, contact_email, contact_phone, is_active,
        created_at, updated_at
      FROM exchanges
      WHERE id = ?
    `).bind(id).first();

    if (!exchange) {
      return c.json({ success: false, error: 'Exchange not found' }, 404);
    }

    // Get company count for this exchange
    const companyCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE exchange_id = ?
    `).bind(id).first<{ count: number }>();

    return c.json({
      success: true,
      exchange: {
        ...exchange,
        company_count: companyCount?.count || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching exchange:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create new exchange
exchangesRoutes.post('/', authenticate, authorize('exchanges.create'), async (c) => {
  try {
    const body = await c.req.json();
    const {
      exchange_code,
      exchange_name,
      regulatory_body,
      country,
      description,
      website,
      contact_email,
      contact_phone,
    } = body;

    // Validate required fields
    if (!exchange_code || !exchange_name) {
      return c.json({
        success: false,
        error: 'Exchange code and name are required',
      }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO exchanges (
        exchange_code, exchange_name, regulatory_body, country,
        description, website, contact_email, contact_phone
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      exchange_code,
      exchange_name,
      regulatory_body || null,
      country || null,
      description || null,
      website || null,
      contact_email || null,
      contact_phone || null
    ).run();

    // Invalidate cache
    await c.env.CACHE.delete(`${CACHE_KEY_PREFIX}all`);

    return c.json({
      success: true,
      message: 'Exchange created successfully',
      id: result.meta.last_row_id,
    }, 201);
  } catch (error: any) {
    console.error('Error creating exchange:', error);
    if (error.message?.includes('UNIQUE')) {
      return c.json({
        success: false,
        error: 'Exchange code already exists',
      }, 400);
    }
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update exchange
exchangesRoutes.put('/:id', authenticate, authorize('exchanges.update'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    // Check if exchange exists
    const existing = await c.env.DB.prepare('SELECT id FROM exchanges WHERE id = ?')
      .bind(id).first();

    if (!existing) {
      return c.json({ success: false, error: 'Exchange not found' }, 404);
    }

    const {
      exchange_code,
      exchange_name,
      regulatory_body,
      country,
      description,
      website,
      contact_email,
      contact_phone,
      is_active,
    } = body;

    await c.env.DB.prepare(`
      UPDATE exchanges
      SET exchange_code = ?,
          exchange_name = ?,
          regulatory_body = ?,
          country = ?,
          description = ?,
          website = ?,
          contact_email = ?,
          contact_phone = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      exchange_code,
      exchange_name,
      regulatory_body || null,
      country || null,
      description || null,
      website || null,
      contact_email || null,
      contact_phone || null,
      is_active !== undefined ? is_active : 1,
      id
    ).run();

    // Invalidate cache
    await c.env.CACHE.delete(`${CACHE_KEY_PREFIX}all`);
    await c.env.CACHE.delete(`${CACHE_KEY_PREFIX}${id}`);

    return c.json({
      success: true,
      message: 'Exchange updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating exchange:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete exchange (soft delete by deactivating)
exchangesRoutes.delete('/:id', authenticate, authorize('exchanges.delete'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    // Check if exchange has companies
    const companyCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE exchange_id = ? AND is_active = 1
    `).bind(id).first<{ count: number }>();

    if (companyCount && companyCount.count > 0) {
      return c.json({
        success: false,
        error: 'Cannot delete exchange with active companies',
      }, 400);
    }

    // Soft delete by deactivating
    await c.env.DB.prepare(`
      UPDATE exchanges
      SET is_active = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(id).run();

    // Invalidate cache
    await c.env.CACHE.delete(`${CACHE_KEY_PREFIX}all`);
    await c.env.CACHE.delete(`${CACHE_KEY_PREFIX}${id}`);

    return c.json({
      success: true,
      message: 'Exchange deactivated successfully',
    });
  } catch (error: any) {
    console.error('Error deleting exchange:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get exchange statistics
exchangesRoutes.get('/:id/stats', authenticate, authorize('exchanges.read'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const stats = await c.env.DB.prepare(`
      SELECT
        COUNT(DISTINCT c.id) as total_companies,
        COUNT(DISTINCT CASE WHEN c.is_active = 1 THEN c.id END) as active_companies,
        COUNT(DISTINCT ta.user_id) as total_traders,
        COUNT(DISTINCT cl.id) as total_company_limits
      FROM exchanges e
      LEFT JOIN companies c ON e.id = c.exchange_id
      LEFT JOIN trader_assignments ta ON c.id = ta.company_id
      LEFT JOIN company_limits cl ON c.id = cl.company_id
      WHERE e.id = ?
      GROUP BY e.id
    `).bind(id).first();

    return c.json({
      success: true,
      stats: stats || {
        total_companies: 0,
        active_companies: 0,
        total_traders: 0,
        total_company_limits: 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching exchange stats:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export { exchangesRoutes };

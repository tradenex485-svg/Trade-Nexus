import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';

export const mappingRoutes = new Hono();

/**
 * GET /api/mapping
 * Get all mappings
 * Requires: position_limits.read permission
 */
mappingRoutes.get('/', authenticate, authorize('position_limits.read'), async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT *
      FROM mapping
      WHERE deleted_at IS NULL
      ORDER BY market_location
    `).all();

    return c.json({
      success: true,
      data: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /api/mapping/:id
 * Get single mapping by ID
 * Requires: position_limits.read permission
 */
mappingRoutes.get('/:id', authenticate, authorize('position_limits.read'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const mapping = await c.env.DB.prepare(`
      SELECT *
      FROM mapping
      WHERE id = ? AND deleted_at IS NULL
    `).bind(id).first();

    if (!mapping) {
      return c.json({
        success: false,
        message: 'Mapping not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: mapping,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * POST /api/mapping
 * Create new mapping
 * Requires: position_limits.write permission
 */
mappingRoutes.post('/', authenticate, authorize('position_limits.write'), async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.contract_name || !body.market_location || !body.commodity_code) {
      return c.json({
        success: false,
        message: 'Missing required fields: contract_name, market_location, commodity_code',
      }, 400);
    }

    // Check if mapping already exists
    const existing = await c.env.DB.prepare(`
      SELECT id
      FROM mapping
      WHERE market_location = ? AND commodity_code = ? AND deleted_at IS NULL
    `).bind(body.market_location, body.commodity_code).first();

    if (existing) {
      return c.json({
        success: false,
        message: 'Mapping already exists for this market location and commodity code',
      }, 409);
    }

    // Insert new mapping
    const result = await c.env.DB.prepare(`
      INSERT INTO mapping (
        contract_name, market_location, commodity_code, unit_of_trading,
        aggregate_1_positive_correlation, aggregate_2_negative_correlation
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      body.contract_name,
      body.market_location,
      body.commodity_code,
      body.unit_of_trading || null,
      body.aggregate_1_positive_correlation || null,
      body.aggregate_2_negative_correlation || null
    ).run();

    // Get the created mapping
    const created = await c.env.DB.prepare(`
      SELECT *
      FROM mapping
      WHERE id = ?
    `).bind(result.meta.last_row_id).first();

    return c.json({
      success: true,
      message: 'Mapping created successfully',
      data: created,
    }, 201);

  } catch (error: any) {
    console.error('Create mapping error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * PUT /api/mapping/:id
 * Update mapping
 * Requires: position_limits.write permission
 */
mappingRoutes.put('/:id', authenticate, authorize('position_limits.write'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    // Check if mapping exists
    const existing = await c.env.DB.prepare(`
      SELECT id
      FROM mapping
      WHERE id = ? AND deleted_at IS NULL
    `).bind(id).first();

    if (!existing) {
      return c.json({
        success: false,
        message: 'Mapping not found',
      }, 404);
    }

    // Update mapping
    await c.env.DB.prepare(`
      UPDATE mapping
      SET
        contract_name = ?,
        market_location = ?,
        commodity_code = ?,
        unit_of_trading = ?,
        aggregate_1_positive_correlation = ?,
        aggregate_2_negative_correlation = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      body.contract_name,
      body.market_location,
      body.commodity_code,
      body.unit_of_trading || null,
      body.aggregate_1_positive_correlation || null,
      body.aggregate_2_negative_correlation || null,
      id
    ).run();

    // Get updated mapping
    const updated = await c.env.DB.prepare(`
      SELECT *
      FROM mapping
      WHERE id = ?
    `).bind(id).first();

    return c.json({
      success: true,
      message: 'Mapping updated successfully',
      data: updated,
    });

  } catch (error: any) {
    console.error('Update mapping error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * DELETE /api/mapping/:id
 * Soft delete mapping
 * Requires: position_limits.delete permission
 */
mappingRoutes.delete('/:id', authenticate, authorize('position_limits.delete'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    // Check if mapping exists
    const existing = await c.env.DB.prepare(`
      SELECT id
      FROM mapping
      WHERE id = ? AND deleted_at IS NULL
    `).bind(id).first();

    if (!existing) {
      return c.json({
        success: false,
        message: 'Mapping not found',
      }, 404);
    }

    // Soft delete (set deleted_at)
    await c.env.DB.prepare(`
      UPDATE mapping
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(id).run();

    return c.json({
      success: true,
      message: 'Mapping deleted successfully',
    });

  } catch (error: any) {
    console.error('Delete mapping error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /api/mapping/commodity/:code
 * Get mappings by commodity code
 * Requires: position_limits.read permission
 */
mappingRoutes.get('/commodity/:code', authenticate, authorize('position_limits.read'), async (c) => {
  try {
    const code = c.req.param('code');

    const result = await c.env.DB.prepare(`
      SELECT *
      FROM mapping
      WHERE commodity_code = ? AND deleted_at IS NULL
      ORDER BY market_location
    `).bind(code).all();

    return c.json({
      success: true,
      data: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /api/mapping/market/:location
 * Get mappings by market location
 * Requires: position_limits.read permission
 */
mappingRoutes.get('/market/:location', authenticate, authorize('position_limits.read'), async (c) => {
  try {
    const location = c.req.param('location');

    const result = await c.env.DB.prepare(`
      SELECT *
      FROM mapping
      WHERE market_location = ? AND deleted_at IS NULL
    `).bind(location).all();

    return c.json({
      success: true,
      data: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

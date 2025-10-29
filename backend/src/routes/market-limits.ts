import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

export const marketLimitsRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/market-limits
 * Get all market limits with optional filtering
 */
marketLimitsRoutes.get('/', async (c) => {
  try {
    const isActive = c.req.query('is_active');
    const exchangeCode = c.req.query('exchange_code');
    const commodityCode = c.req.query('commodity_code');
    const limit = parseInt(c.req.query('limit') || '1000');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = `
      SELECT
        id,
        rule,
        contract_name,
        commodity_code,
        market_type,
        contract_size,
        unit_of_trading,
        spot_month_limit,
        spot_month_limit2,
        spot_month_conditional_limit,
        spot_month_accountability_level,
        single_month_accountability_level,
        single_month_accountability_level2,
        all_month_accountability_level,
        all_month_accountability_level2,
        aggregate_1_positive_correlation,
        aggregate_2_negative_correlation,
        exchange_reportable_level,
        exchange_code,
        is_parent,
        is_active,
        effective_date,
        created_at,
        updated_at
      FROM market_limits
      WHERE 1=1
    `;

    const bindings: any[] = [];

    // Filter by active status
    if (isActive !== undefined && isActive !== null) {
      query += ` AND is_active = ?`;
      bindings.push(isActive === 'true' || isActive === '1' ? 1 : 0);
    }

    // Filter by exchange code
    if (exchangeCode) {
      query += ` AND exchange_code = ?`;
      bindings.push(exchangeCode);
    }

    // Filter by commodity code
    if (commodityCode) {
      query += ` AND commodity_code = ?`;
      bindings.push(commodityCode);
    }

    query += ` ORDER BY exchange_code, commodity_code, effective_date DESC LIMIT ? OFFSET ?`;
    bindings.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...bindings).all();

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM market_limits WHERE 1=1`;
    const countBindings: any[] = [];

    if (isActive !== undefined && isActive !== null) {
      countQuery += ` AND is_active = ?`;
      countBindings.push(isActive === 'true' || isActive === '1' ? 1 : 0);
    }

    if (exchangeCode) {
      countQuery += ` AND exchange_code = ?`;
      countBindings.push(exchangeCode);
    }

    if (commodityCode) {
      countQuery += ` AND commodity_code = ?`;
      countBindings.push(commodityCode);
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countBindings).first();

    return c.json({
      success: true,
      data: result.results,
      total: countResult?.total || 0,
      limit,
      offset
    });

  } catch (error: any) {
    console.error('Get market limits error:', error);
    return c.json({
      success: false,
      error: 'Failed to get market limits',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/market-limits/:id
 * Get single market limit by ID
 */
marketLimitsRoutes.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const query = `
      SELECT
        id,
        rule,
        contract_name,
        commodity_code,
        market_type,
        contract_size,
        unit_of_trading,
        spot_month_limit,
        spot_month_limit2,
        spot_month_conditional_limit,
        spot_month_accountability_level,
        single_month_accountability_level,
        single_month_accountability_level2,
        all_month_accountability_level,
        all_month_accountability_level2,
        aggregate_1_positive_correlation,
        aggregate_2_negative_correlation,
        exchange_reportable_level,
        exchange_code,
        is_parent,
        is_active,
        effective_date,
        created_at,
        updated_at
      FROM market_limits
      WHERE id = ?
    `;

    const limit = await c.env.DB.prepare(query).bind(id).first();

    if (!limit) {
      return c.json({
        success: false,
        error: 'Market limit not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: limit
    });

  } catch (error: any) {
    console.error('Get market limit error:', error);
    return c.json({
      success: false,
      error: 'Failed to get market limit',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/market-limits/commodity/:commodity_code
 * Get market limits by commodity code
 */
marketLimitsRoutes.get('/commodity/:commodity_code', async (c) => {
  try {
    const commodityCode = c.req.param('commodity_code');

    const query = `
      SELECT
        id,
        rule,
        contract_name,
        commodity_code,
        market_type,
        contract_size,
        unit_of_trading,
        spot_month_limit,
        spot_month_limit2,
        spot_month_conditional_limit,
        spot_month_accountability_level,
        single_month_accountability_level,
        single_month_accountability_level2,
        all_month_accountability_level,
        all_month_accountability_level2,
        aggregate_1_positive_correlation,
        aggregate_2_negative_correlation,
        exchange_reportable_level,
        exchange_code,
        is_parent,
        is_active,
        effective_date,
        created_at,
        updated_at
      FROM market_limits
      WHERE commodity_code = ?
      AND is_active = 1
      ORDER BY effective_date DESC
    `;

    const result = await c.env.DB.prepare(query).bind(commodityCode).all();

    return c.json({
      success: true,
      data: result.results,
      count: result.results.length
    });

  } catch (error: any) {
    console.error('Get market limits by commodity error:', error);
    return c.json({
      success: false,
      error: 'Failed to get market limits',
      message: error.message
    }, 500);
  }
});

/**
 * POST /api/market-limits
 * Create a new market limit
 */
marketLimitsRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.contract_name || !body.commodity_code) {
      return c.json({
        success: false,
        error: 'Missing required fields: contract_name, commodity_code'
      }, 400);
    }

    const query = `
      INSERT INTO market_limits (
        rule,
        contract_name,
        commodity_code,
        market_type,
        contract_size,
        unit_of_trading,
        spot_month_limit,
        spot_month_limit2,
        spot_month_conditional_limit,
        spot_month_accountability_level,
        single_month_accountability_level,
        single_month_accountability_level2,
        all_month_accountability_level,
        all_month_accountability_level2,
        aggregate_1_positive_correlation,
        aggregate_2_negative_correlation,
        exchange_reportable_level,
        exchange_code,
        is_parent,
        is_active,
        effective_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await c.env.DB.prepare(query).bind(
      body.rule || null,
      body.contract_name,
      body.commodity_code,
      body.market_type || null,
      body.contract_size || null,
      body.unit_of_trading || null,
      body.spot_month_limit || null,
      body.spot_month_limit2 || null,
      body.spot_month_conditional_limit || null,
      body.spot_month_accountability_level || null,
      body.single_month_accountability_level || null,
      body.single_month_accountability_level2 || null,
      body.all_month_accountability_level || null,
      body.all_month_accountability_level2 || null,
      body.aggregate_1_positive_correlation || null,
      body.aggregate_2_negative_correlation || null,
      body.exchange_reportable_level || null,
      body.exchange_code || null,
      body.is_parent || 0,
      body.is_active !== undefined ? body.is_active : 1,
      body.effective_date || new Date().toISOString().split('T')[0]
    ).run();

    return c.json({
      success: true,
      message: 'Market limit created successfully',
      id: result.meta.last_row_id
    }, 201);

  } catch (error: any) {
    console.error('Create market limit error:', error);
    return c.json({
      success: false,
      error: 'Failed to create market limit',
      message: error.message
    }, 500);
  }
});

/**
 * PUT /api/market-limits/:id
 * Update a market limit
 */
marketLimitsRoutes.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    // Check if limit exists
    const existing = await c.env.DB.prepare(`
      SELECT id FROM market_limits WHERE id = ?
    `).bind(id).first();

    if (!existing) {
      return c.json({
        success: false,
        error: 'Market limit not found'
      }, 404);
    }

    const query = `
      UPDATE market_limits
      SET
        rule = ?,
        contract_name = ?,
        commodity_code = ?,
        market_type = ?,
        contract_size = ?,
        unit_of_trading = ?,
        spot_month_limit = ?,
        spot_month_limit2 = ?,
        spot_month_conditional_limit = ?,
        spot_month_accountability_level = ?,
        single_month_accountability_level = ?,
        single_month_accountability_level2 = ?,
        all_month_accountability_level = ?,
        all_month_accountability_level2 = ?,
        aggregate_1_positive_correlation = ?,
        aggregate_2_negative_correlation = ?,
        exchange_reportable_level = ?,
        exchange_code = ?,
        is_parent = ?,
        is_active = ?,
        effective_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await c.env.DB.prepare(query).bind(
      body.rule || null,
      body.contract_name,
      body.commodity_code,
      body.market_type || null,
      body.contract_size || null,
      body.unit_of_trading || null,
      body.spot_month_limit || null,
      body.spot_month_limit2 || null,
      body.spot_month_conditional_limit || null,
      body.spot_month_accountability_level || null,
      body.single_month_accountability_level || null,
      body.single_month_accountability_level2 || null,
      body.all_month_accountability_level || null,
      body.all_month_accountability_level2 || null,
      body.aggregate_1_positive_correlation || null,
      body.aggregate_2_negative_correlation || null,
      body.exchange_reportable_level || null,
      body.exchange_code || null,
      body.is_parent || 0,
      body.is_active !== undefined ? body.is_active : 1,
      body.effective_date || null,
      id
    ).run();

    return c.json({
      success: true,
      message: 'Market limit updated successfully'
    });

  } catch (error: any) {
    console.error('Update market limit error:', error);
    return c.json({
      success: false,
      error: 'Failed to update market limit',
      message: error.message
    }, 500);
  }
});

/**
 * DELETE /api/market-limits/:id
 * Delete a market limit (soft delete by setting is_active = 0)
 */
marketLimitsRoutes.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    // Check if limit exists
    const limit = await c.env.DB.prepare(`
      SELECT id FROM market_limits WHERE id = ?
    `).bind(id).first();

    if (!limit) {
      return c.json({
        success: false,
        error: 'Market limit not found'
      }, 404);
    }

    // Soft delete by setting is_active = 0
    await c.env.DB.prepare(`
      UPDATE market_limits
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(id).run();

    return c.json({
      success: true,
      message: 'Market limit deactivated successfully'
    });

  } catch (error: any) {
    console.error('Delete market limit error:', error);
    return c.json({
      success: false,
      error: 'Failed to delete market limit',
      message: error.message
    }, 500);
  }
});

import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

export const positionLimitsRoutes = new Hono<{ Bindings: Bindings }>();

// Get all position limits from D1 database
positionLimitsRoutes.get('/', async (c) => {
  const limitTypeMap = { 'spot': 1, 'one-month': 2, 'all-month': 3, 'spot-plus': 4 };
  const limitType = c.req.query('limit_type') || 'spot';
  const limitTypeNum = limitTypeMap[limitType as keyof typeof limitTypeMap] || 1;
  const prioritization = c.req.query('prioritization');
  const search = c.req.query('search')?.toLowerCase();

  // Pagination parameters
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('page_size') || '50');
  const offset = (page - 1) * pageSize;

  try {
    // Build WHERE clause
    let whereConditions = ['lc.limit_type = ?', 'lc.is_active = 1', 'lc.is_parent = 1'];
    const params: any[] = [limitTypeNum];

    if (prioritization && prioritization !== 'all') {
      whereConditions.push('lc.prioritization = ?');
      params.push(prioritization);
    }

    if (search) {
      whereConditions.push('(LOWER(lc.mkt_index) LIKE ? OR LOWER(m.market_location) LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM limit_calculations lc
      LEFT JOIN mapping m ON lc.mkt_index = m.market_location
      WHERE ${whereClause}
    `;
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
    const total = countResult?.total || 0;

    // Get paginated data
    let query = `
      SELECT
        lc.*,
        m.market_location as mkt_loc_name,
        lc.pos_lots as position,
        lc.limit_lots as "limit",
        lc.pos_pct as utilization,
        DATE(lc.as_of_date) as as_of_date
      FROM limit_calculations lc
      LEFT JOIN mapping m ON lc.mkt_index = m.market_location
      WHERE ${whereClause}
      ORDER BY lc.pos_pct DESC
      LIMIT ? OFFSET ?
    `;

    const result = await c.env.DB.prepare(query).bind(...params, pageSize, offset).all();

    return c.json({
      data: result.results || [],
      meta: {
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize),
        limit_type: limitType,
      },
    });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Failed to fetch position limits', details: (error as Error).message }, 500);
  }
});

// Get position limit by market index
positionLimitsRoutes.get('/:mkt_index', async (c) => {
  const mktIndex = c.req.param('mkt_index');

  try {
    const result = await c.env.DB.prepare(`
      SELECT
        lc.*,
        m.market_location as mkt_loc_name,
        lc.pos_lots as position,
        lc.limit_lots as "limit",
        lc.pos_pct as utilization
      FROM limit_calculations lc
      LEFT JOIN mapping m ON lc.mkt_index = m.market_location
      WHERE lc.mkt_index = ? AND lc.is_active = 1 AND lc.is_parent = 1
      ORDER BY lc.created_at DESC
      LIMIT 1
    `).bind(mktIndex).first();

    if (!result) {
      return c.json({ error: 'Position not found' }, 404);
    }

    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Failed to fetch position', details: (error as Error).message }, 500);
  }
});

// Get status counts from database
positionLimitsRoutes.get('/status/counts', async (c) => {
  const limitTypeMap = { 'spot': 1, 'one-month': 2, 'all-month': 3, 'spot-plus': 4 };
  const limitType = c.req.query('limit_type') || 'spot';
  const limitTypeNum = limitTypeMap[limitType as keyof typeof limitTypeMap] || 1;

  try {
    const result = await c.env.DB.prepare(`
      SELECT
        SUM(CASE WHEN prioritization = 'Monitor' THEN 1 ELSE 0 END) as monitor,
        SUM(CASE WHEN prioritization = 'Validate' THEN 1 ELSE 0 END) as validate,
        SUM(CASE WHEN prioritization = 'Remediate' THEN 1 ELSE 0 END) as remediate,
        SUM(CASE WHEN prioritization = 'Breached' OR prioritization = 'breached' THEN 1 ELSE 0 END) as breached,
        COUNT(*) as total
      FROM limit_calculations
      WHERE limit_type = ? AND is_active = 1 AND is_parent = 1
    `).bind(limitTypeNum).first();

    return c.json(result || { monitor: 0, validate: 0, remediate: 0, breached: 0, total: 0 });
  } catch (error) {
    return c.json({ error: 'Failed to fetch status counts', details: (error as Error).message }, 500);
  }
});

// Get chart data for a specific limit type
positionLimitsRoutes.get('/charts/:limit_type', async (c) => {
  const limitTypeMap = { 'spot-month': 1, 'one-month': 2, 'all-month': 3, 'spot-plus-month': 4 };
  const limitType = c.req.param('limit_type');
  const limitTypeNum = limitTypeMap[limitType as keyof typeof limitTypeMap] || 1;

  try {
    const result = await c.env.DB.prepare(`
      SELECT
        lc.mkt_index as name,
        lc.pos_lots as position,
        lc.limit_lots as "limit",
        lc.pos_pct as utilization
      FROM limit_calculations lc
      WHERE lc.limit_type = ? AND lc.is_active = 1 AND lc.is_parent = 1
      ORDER BY lc.pos_pct DESC
      LIMIT 10
    `).bind(limitTypeNum).all();

    return c.json(result.results || []);
  } catch (error) {
    return c.json({ error: 'Failed to fetch chart data', details: (error as Error).message }, 500);
  }
});

// Get time series data from archived calculations
positionLimitsRoutes.get('/time-series/:mkt_index', async (c) => {
  const mktIndex = c.req.param('mkt_index');
  const days = parseInt(c.req.query('days') || '30');

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await c.env.DB.prepare(`
      SELECT
        DATE(as_of_date) as date,
        pos_lots as position,
        pos_pct as utilization,
        limit_lots as "limit"
      FROM limit_calculation_series
      WHERE mkt_index = ?
        AND as_of_date >= ?
        AND is_parent = 1
      ORDER BY as_of_date ASC
    `).bind(mktIndex, startDate.toISOString().split('T')[0]).all();

    if (!result.results || result.results.length === 0) {
      return c.json({ error: 'No historical data found for this market' }, 404);
    }

    return c.json(result.results);
  } catch (error) {
    return c.json({ error: 'Failed to fetch time series data', details: (error as Error).message }, 500);
  }
});

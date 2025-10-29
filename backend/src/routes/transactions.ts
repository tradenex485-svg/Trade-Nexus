import { Hono } from 'hono';
import { checkRegulatoryCompliance } from '../services/regulatory-compliance';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

export const transactionsRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/transactions
 * Get all transactions with optional date filtering
 */
transactionsRoutes.get('/', async (c) => {
  try {
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const limit = parseInt(c.req.query('limit') || '1000');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = `
      SELECT
        t.id,
        t.trade_date,
        t.market_location as mkt_loc,
        t.contract_month,
        t.base_delta_notnl_nd,
        t.index_uom,
        t.exchange,
        t.status,
        t.frequency,
        m.contract_name as product,
        m.commodity_code,
        t.created_at
      FROM transactions t
      LEFT JOIN mapping m ON t.market_location = m.market_location
      WHERE 1=1
    `;

    const bindings: any[] = [];

    if (startDate) {
      query += ` AND t.trade_date >= ?`;
      bindings.push(startDate);
    }

    if (endDate) {
      query += ` AND t.trade_date <= ?`;
      bindings.push(endDate);
    }

    query += ` ORDER BY t.trade_date DESC, t.created_at DESC LIMIT ? OFFSET ?`;
    bindings.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...bindings).all();

    // Transform the data to match the expected frontend format
    const transactions = result.results.map((row: any) => ({
      id: row.id,
      trade_date: row.trade_date,
      mkt_loc: row.mkt_loc,
      product: row.product || row.commodity_code || 'Unknown',
      quantity: Math.abs(row.base_delta_notnl_nd || 0),
      price: null, // Price not stored in transactions table
      side: (row.base_delta_notnl_nd || 0) >= 0 ? 'BUY' : 'SELL',
      contract_month: row.contract_month,
      index_uom: row.index_uom,
      exchange: row.exchange,
      status: row.status,
      created_at: row.created_at
    }));

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM transactions t WHERE 1=1`;
    const countBindings: any[] = [];

    if (startDate) {
      countQuery += ` AND t.trade_date >= ?`;
      countBindings.push(startDate);
    }

    if (endDate) {
      countQuery += ` AND t.trade_date <= ?`;
      countBindings.push(endDate);
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countBindings).first();

    return c.json({
      success: true,
      data: transactions,
      total: countResult?.total || 0,
      limit,
      offset
    });

  } catch (error: any) {
    console.error('Get transactions error:', error);
    return c.json({
      success: false,
      error: 'Failed to get transactions',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/transactions/:id
 * Get single transaction by ID
 */
transactionsRoutes.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const query = `
      SELECT
        t.id,
        t.trade_date,
        t.market_location as mkt_loc,
        t.contract_month,
        t.base_delta_notnl_nd,
        t.index_uom,
        t.exchange,
        t.status,
        t.frequency,
        m.contract_name as product,
        m.commodity_code,
        t.created_at
      FROM transactions t
      LEFT JOIN mapping m ON t.market_location = m.market_location
      WHERE t.id = ?
    `;

    const transaction = await c.env.DB.prepare(query).bind(id).first();

    if (!transaction) {
      return c.json({
        success: false,
        error: 'Transaction not found'
      }, 404);
    }

    // Transform to match frontend format
    const result = {
      id: transaction.id,
      trade_date: transaction.trade_date,
      mkt_loc: transaction.mkt_loc,
      product: transaction.product || transaction.commodity_code || 'Unknown',
      quantity: Math.abs(transaction.base_delta_notnl_nd || 0),
      price: null,
      side: (transaction.base_delta_notnl_nd || 0) >= 0 ? 'BUY' : 'SELL',
      contract_month: transaction.contract_month,
      index_uom: transaction.index_uom,
      exchange: transaction.exchange,
      status: transaction.status,
      created_at: transaction.created_at
    };

    return c.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Get transaction error:', error);
    return c.json({
      success: false,
      error: 'Failed to get transaction',
      message: error.message
    }, 500);
  }
});

/**
 * POST /api/transactions
 * Create a new transaction with pre-trade validation
 */
transactionsRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.market_location || !body.contract_month || body.base_delta_notnl_nd === undefined || !body.trade_date) {
      return c.json({
        success: false,
        error: 'Missing required fields: market_location, contract_month, base_delta_notnl_nd, trade_date'
      }, 400);
    }

    // Exchange validation - exchange_id is now required
    if (!body.exchange_id) {
      return c.json({
        success: false,
        error: 'exchange_id is required'
      }, 400);
    }

    // Verify exchange exists and is active
    const exchange = await c.env.DB.prepare(`
      SELECT id, exchange_code, exchange_name, is_active
      FROM exchanges
      WHERE id = ?
    `).bind(body.exchange_id).first();

    if (!exchange) {
      return c.json({
        success: false,
        error: 'Invalid exchange_id: Exchange not found'
      }, 400);
    }

    if (!exchange.is_active) {
      return c.json({
        success: false,
        error: `Exchange ${exchange.exchange_code} is not currently active`
      }, 400);
    }

    // Get commodity code from mapping table
    const mapping = await c.env.DB.prepare(`
      SELECT commodity_code, contract_name
      FROM mapping
      WHERE market_location = ?
      LIMIT 1
    `).bind(body.market_location).first();

    if (!mapping) {
      return c.json({
        success: false,
        error: `Invalid market_location: No commodity mapping found for ${body.market_location}`
      }, 400);
    }

    const commodityCode = mapping.commodity_code;

    // Get current position for this commodity
    const currentPositionResult = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(base_delta_notnl_nd), 0) as net_position
      FROM transactions
      WHERE market_location = ?
        AND exchange_id = ?
        AND status = 0
    `).bind(body.market_location, body.exchange_id).first();

    const currentPosition = currentPositionResult?.net_position || 0;
    const projectedPosition = currentPosition + body.base_delta_notnl_nd;

    // Determine limit category based on contract month
    const contractDate = new Date(body.contract_month);
    const today = new Date();
    const daysToExpiry = Math.floor((contractDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let limitCategory: 'spot_month' | 'single_month' | 'all_month' = 'all_month';
    if (daysToExpiry <= 30) {
      limitCategory = 'spot_month';
    } else if (daysToExpiry <= 90) {
      limitCategory = 'single_month';
    }

    // Pre-trade regulatory compliance check
    const complianceCheck = await checkRegulatoryCompliance(c.env.DB, {
      commodityCode,
      marketLocation: body.market_location,
      limitCategory,
      currentPosition,
      projectedPosition,
      exchangeId: body.exchange_id,
      companyId: body.company_id,
      traderId: body.trader_id
    });

    // Handle compliance violations
    if (!complianceCheck.compliant) {
      const criticalViolations = complianceCheck.violations.filter(v => v.severity === 'critical');

      if (criticalViolations.length > 0 && complianceCheck.enforcement_action === 'block_trade') {
        // Block trade due to critical position limit violation
        return c.json({
          success: false,
          error: 'Trade blocked due to regulatory position limit violation',
          compliance: {
            compliant: false,
            violations: complianceCheck.violations,
            warnings: complianceCheck.warnings,
            enforcement_action: 'block_trade'
          }
        }, 403); // 403 Forbidden
      } else if (complianceCheck.enforcement_action === 'require_approval') {
        // Trade requires manager approval
        return c.json({
          success: false,
          error: 'Trade requires manager approval due to accountability level breach',
          compliance: {
            compliant: false,
            violations: complianceCheck.violations,
            warnings: complianceCheck.warnings,
            enforcement_action: 'require_approval',
            requires_approval: true
          }
        }, 202); // 202 Accepted but pending approval
      }
    }

    // Insert transaction with exchange_id
    const query = `
      INSERT INTO transactions (
        market_location,
        contract_month,
        base_delta_notnl_nd,
        index_uom,
        trade_date,
        status,
        frequency,
        exchange,
        exchange_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await c.env.DB.prepare(query).bind(
      body.market_location,
      body.contract_month,
      body.base_delta_notnl_nd,
      body.index_uom || null,
      body.trade_date,
      body.status || 0,
      body.frequency || 0,
      exchange.exchange_code, // Keep legacy TEXT column for backward compatibility
      body.exchange_id
    ).run();

    // Return success with compliance info
    return c.json({
      success: true,
      message: 'Transaction created successfully',
      id: result.meta.last_row_id,
      exchange: {
        id: exchange.id,
        code: exchange.exchange_code,
        name: exchange.exchange_name
      },
      compliance: {
        compliant: complianceCheck.compliant,
        warnings: complianceCheck.warnings,
        reportable: complianceCheck.reportable
      }
    }, 201);

  } catch (error: any) {
    console.error('Create transaction error:', error);
    return c.json({
      success: false,
      error: 'Failed to create transaction',
      message: error.message
    }, 500);
  }
});

/**
 * DELETE /api/transactions/:id
 * Delete a transaction
 */
transactionsRoutes.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    // Check if transaction exists
    const transaction = await c.env.DB.prepare(`
      SELECT id FROM transactions WHERE id = ?
    `).bind(id).first();

    if (!transaction) {
      return c.json({
        success: false,
        error: 'Transaction not found'
      }, 404);
    }

    await c.env.DB.prepare(`
      DELETE FROM transactions WHERE id = ?
    `).bind(id).run();

    return c.json({
      success: true,
      message: 'Transaction deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete transaction error:', error);
    return c.json({
      success: false,
      error: 'Failed to delete transaction',
      message: error.message
    }, 500);
  }
});

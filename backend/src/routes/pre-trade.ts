import { Hono } from 'hono';
import {
  validateTrade,
  batchValidateTrades,
  getValidationHistory,
  getValidationStats,
  type TradeInput,
} from '../services/pre-trade-service';
import { optionalAuth, authenticate } from '../middleware/auth';
import { TokenPayload } from '../services/auth-service';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

export const preTradeRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/pre-trade/validate
 * Validate a single trade
 */
preTradeRoutes.post('/validate', optionalAuth, async (c) => {
  try {
    const user = c.get('user') as TokenPayload | undefined;
    const body = await c.req.json();

    // Validate required fields
    if (
      !body.marketLocation ||
      !body.commodityCode ||
      !body.contractMonth ||
      !body.tradeSide ||
      body.quantity === undefined ||
      body.limitType === undefined
    ) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields',
        },
        400
      );
    }

    const tradeInput: TradeInput = {
      userId: user?.userId,
      marketLocation: body.marketLocation,
      commodityCode: body.commodityCode,
      contractMonth: body.contractMonth,
      tradeSide: body.tradeSide.toUpperCase(),
      quantity: parseFloat(body.quantity),
      limitType: parseInt(body.limitType),
    };

    const result = await validateTrade(c.env.DB, tradeInput);

    return c.json({
      success: true,
      validation: result,
    });
  } catch (error: any) {
    console.error('Pre-trade validation error:', error);
    return c.json(
      {
        success: false,
        error: 'Validation failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/pre-trade/batch-validate
 * Validate multiple trades at once
 */
preTradeRoutes.post('/batch-validate', optionalAuth, async (c) => {
  try {
    const user = c.get('user') as TokenPayload | undefined;
    const body = await c.req.json();

    if (!body.trades || !Array.isArray(body.trades)) {
      return c.json(
        {
          success: false,
          error: 'trades array is required',
        },
        400
      );
    }

    const tradeInputs: TradeInput[] = body.trades.map((trade: any) => ({
      userId: user?.userId,
      marketLocation: trade.marketLocation,
      commodityCode: trade.commodityCode,
      contractMonth: trade.contractMonth,
      tradeSide: trade.tradeSide.toUpperCase(),
      quantity: parseFloat(trade.quantity),
      limitType: parseInt(trade.limitType),
    }));

    const results = await batchValidateTrades(c.env.DB, tradeInputs);

    return c.json({
      success: true,
      validations: results,
      summary: {
        total: results.length,
        approved: results.filter((r) => r.validationStatus === 'approved').length,
        requiresApproval: results.filter((r) => r.validationStatus === 'requires_approval')
          .length,
        blocked: results.filter((r) => r.validationStatus === 'blocked').length,
      },
    });
  } catch (error: any) {
    console.error('Batch validation error:', error);
    return c.json(
      {
        success: false,
        error: 'Batch validation failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/pre-trade/history
 * Get validation check history
 */
preTradeRoutes.get('/history', optionalAuth, async (c) => {
  try {
    const user = c.get('user') as TokenPayload | undefined;
    const status = c.req.query('status');
    const startDate = c.req.query('start_date');
    const limit = parseInt(c.req.query('limit') || '100');

    const filters: any = { limit };
    if (user) filters.userId = user.userId;
    if (status) filters.status = status;
    if (startDate) filters.startDate = startDate;

    const checks = await getValidationHistory(c.env.DB, filters);

    return c.json({
      success: true,
      data: checks,
      count: checks.length,
    });
  } catch (error: any) {
    console.error('Get validation history error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get validation history',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/pre-trade/history/:id
 * Get specific validation check details
 */
preTradeRoutes.get('/history/:id', optionalAuth, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const user = c.get('user') as TokenPayload | undefined;

    let query = `
      SELECT ptc.*, u.name as user_name
      FROM pre_trade_checks ptc
      LEFT JOIN users u ON ptc.user_id = u.id
      WHERE ptc.id = ?
    `;

    const bindings: any[] = [id];

    if (user) {
      query += ` AND (ptc.user_id = ? OR ptc.user_id IS NULL)`;
      bindings.push(user.userId);
    }

    const check = await c.env.DB.prepare(query).bind(...bindings).first();

    if (!check) {
      return c.json(
        {
          success: false,
          error: 'Validation check not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      check,
    });
  } catch (error: any) {
    console.error('Get validation check error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get validation check',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/pre-trade/stats
 * Get validation statistics
 */
preTradeRoutes.get('/stats', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '7');

    const stats = await getValidationStats(c.env.DB, days);

    return c.json({
      success: true,
      stats,
      period: {
        days,
        start_date: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
      },
    });
  } catch (error: any) {
    console.error('Get validation stats error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get validation stats',
        message: error.message,
      },
      500
    );
  }
});

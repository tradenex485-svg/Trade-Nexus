/**
 * CFTC Phase 8: Pre-Trade Validation API Routes
 *
 * Endpoints for pre-trade validation:
 * - POST /api/pre-trade-validation/validate - Validate single trade
 * - POST /api/pre-trade-validation/batch - Validate multiple trades
 * - GET /api/pre-trade-validation/stats - Get validation statistics
 */

import { Hono } from 'hono';
import { AppContext } from '../types';
import { PreTradeValidationService } from '../services/pre-trade-validation-service';

const app = new Hono<AppContext>();

/**
 * POST /api/pre-trade-validation/validate
 * Validate a single trade before execution
 */
app.post('/validate', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const {
      market_code,
      contract_month,
      quantity,
      deal_type,
      counterparty,
      trade_date,
    } = body;

    if (!market_code || !contract_month || quantity === undefined) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: market_code, contract_month, quantity',
        },
        400
      );
    }

    const service = new PreTradeValidationService(c.env.DB);

    const result = await service.validateTrade({
      market_code,
      contract_month,
      quantity: parseFloat(quantity),
      deal_type,
      counterparty,
      trade_date,
      company_id: user.company_id,
      user_id: user.id,
    });

    // Enforce hard blocking - return 403 Forbidden if trade is blocked
    if (result.is_blocked) {
      return c.json({
        success: false,
        validation: result,
        blocked: true,
        message: result.block_reason || 'Trade execution blocked due to position limit breach',
        timestamp: new Date().toISOString(),
      }, 403);
    }

    return c.json({
      success: true,
      validation: result,
      blocked: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error validating trade:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Failed to validate trade',
      },
      500
    );
  }
});

/**
 * POST /api/pre-trade-validation/batch
 * Validate multiple trades (with optional cumulative simulation)
 */
app.post('/batch', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { trades, simulate_cumulative } = body;

    if (!trades || !Array.isArray(trades) || trades.length === 0) {
      return c.json(
        {
          success: false,
          error: 'Invalid trades array',
        },
        400
      );
    }

    // Add company_id and user_id to each trade
    const tradesWithContext = trades.map((trade: any) => ({
      ...trade,
      company_id: user.company_id,
      user_id: user.id,
    }));

    const service = new PreTradeValidationService(c.env.DB);

    const result = await service.validateBatch({
      trades: tradesWithContext,
      simulate_cumulative: simulate_cumulative || false,
    });

    // Check if any trades are blocked
    const blockedTrades = result.results.filter(r => r.is_blocked);
    const hasBlockedTrades = blockedTrades.length > 0;

    if (hasBlockedTrades) {
      return c.json({
        success: false,
        validation: result,
        blocked: true,
        message: `${blockedTrades.length} trade(s) blocked due to position limit breaches`,
        blocked_trades: blockedTrades.map((r, idx) => ({
          trade_index: idx,
          reason: r.block_reason,
          market_code: tradesWithContext[idx].market_code,
          contract_month: tradesWithContext[idx].contract_month,
        })),
        timestamp: new Date().toISOString(),
      }, 403);
    }

    return c.json({
      success: true,
      validation: result,
      blocked: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error validating batch:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Failed to validate batch',
      },
      500
    );
  }
});

/**
 * GET /api/pre-trade-validation/stats
 * Get pre-trade validation statistics
 */
app.get('/stats', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { start_date, end_date } = c.req.query();

    // Query audit trail for validation statistics
    const validationQuery = `
      SELECT
        COUNT(*) as total_validations,
        SUM(CASE WHEN action = 'APPROVE' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN action = 'REJECT' THEN 1 ELSE 0 END) as rejected
      FROM audit_trail
      WHERE event_type = 'VALIDATION'
        AND entity_type = 'TRADE'
        AND company_id = ?
        ${start_date ? 'AND timestamp >= ?' : ''}
        ${end_date ? 'AND timestamp <= ?' : ''}
    `;

    const bindings = [user.company_id];
    if (start_date) bindings.push(start_date);
    if (end_date) bindings.push(end_date);

    const result = await c.env.DB.prepare(validationQuery)
      .bind(...bindings)
      .first();

    // Get recent rejections
    const recentRejectionsQuery = `
      SELECT
        metadata,
        timestamp
      FROM audit_trail
      WHERE event_type = 'VALIDATION'
        AND entity_type = 'TRADE'
        AND action = 'REJECT'
        AND company_id = ?
      ORDER BY timestamp DESC
      LIMIT 10
    `;

    const recentRejections = await c.env.DB.prepare(recentRejectionsQuery)
      .bind(user.company_id)
      .all();

    const stats = {
      total_validations: (result as any)?.total_validations || 0,
      approved: (result as any)?.approved || 0,
      rejected: (result as any)?.rejected || 0,
      approval_rate: 0,
      recent_rejections: recentRejections.results.map((r: any) => ({
        metadata: r.metadata ? JSON.parse(r.metadata) : {},
        timestamp: r.timestamp,
      })),
    };

    if (stats.total_validations > 0) {
      stats.approval_rate = (stats.approved / stats.total_validations) * 100;
    }

    return c.json({
      success: true,
      stats,
      date_range: {
        start: start_date || 'beginning',
        end: end_date || 'now',
      },
    });
  } catch (error: any) {
    console.error('Error getting validation stats:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Failed to get validation statistics',
      },
      500
    );
  }
});

export default app;

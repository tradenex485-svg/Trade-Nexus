import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';

type Bindings = {
  DB: D1Database;
  CACHE: KVNamespace;
  DOCUMENTS: R2Bucket;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
  FRONTEND_URL?: string;
  SENTRY_DSN?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  DATABASE_ENCRYPTION_KEY?: string;
};

export const riskThresholdsRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/risk-thresholds
 * Get all risk thresholds
 */
riskThresholdsRoutes.get('/', authenticate, async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT * FROM risk_thresholds
      WHERE is_active = 1
      ORDER BY min_utilization_pct ASC
    `).all();

    return c.json({
      success: true,
      data: result.results,
      count: result.results.length,
    });
  } catch (error: any) {
    console.error('Get risk thresholds error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get risk thresholds',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/risk-thresholds/:id
 * Get specific risk threshold
 */
riskThresholdsRoutes.get('/:id', authenticate, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const threshold = await c.env.DB.prepare(`
      SELECT * FROM risk_thresholds WHERE id = ?
    `)
      .bind(id)
      .first();

    if (!threshold) {
      return c.json(
        {
          success: false,
          error: 'Risk threshold not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      threshold,
    });
  } catch (error: any) {
    console.error('Get risk threshold error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get risk threshold',
        message: error.message,
      },
      500
    );
  }
});

/**
 * PUT /api/risk-thresholds/:id
 * Update risk threshold
 */
riskThresholdsRoutes.put('/:id', authenticate, authorize('system.configure'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    // Check if threshold exists
    const existing = await c.env.DB.prepare(`
      SELECT id FROM risk_thresholds WHERE id = ?
    `)
      .bind(id)
      .first();

    if (!existing) {
      return c.json(
        {
          success: false,
          error: 'Risk threshold not found',
        },
        404
      );
    }

    // Update threshold
    await c.env.DB.prepare(`
      UPDATE risk_thresholds
      SET threshold_name = ?,
          threshold_type = ?,
          min_utilization_pct = ?,
          max_utilization_pct = ?,
          description = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
      .bind(
        body.threshold_name,
        body.threshold_type,
        body.min_utilization_pct,
        body.max_utilization_pct,
        body.description || null,
        body.is_active ? 1 : 0,
        id
      )
      .run();

    return c.json({
      success: true,
      message: 'Risk threshold updated successfully',
    });
  } catch (error: any) {
    console.error('Update risk threshold error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to update risk threshold',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/risk-thresholds
 * Create new risk threshold
 */
riskThresholdsRoutes.post('/', authenticate, authorize('system.configure'), async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (
      !body.threshold_name ||
      !body.threshold_type ||
      body.min_utilization_pct === undefined ||
      body.max_utilization_pct === undefined
    ) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields',
        },
        400
      );
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO risk_thresholds (
        threshold_name, threshold_type, min_utilization_pct, max_utilization_pct, description, is_active
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)
      .bind(
        body.threshold_name,
        body.threshold_type,
        body.min_utilization_pct,
        body.max_utilization_pct,
        body.description || null,
        body.is_active !== false ? 1 : 0
      )
      .run();

    return c.json(
      {
        success: true,
        message: 'Risk threshold created successfully',
        id: result.meta.last_row_id,
      },
      201
    );
  } catch (error: any) {
    console.error('Create risk threshold error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create risk threshold',
        message: error.message,
      },
      500
    );
  }
});

/**
 * DELETE /api/risk-thresholds/:id
 * Soft delete risk threshold
 */
riskThresholdsRoutes.delete('/:id', authenticate, authorize('system.configure'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    // Soft delete by setting is_active to 0
    await c.env.DB.prepare(`
      UPDATE risk_thresholds
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
      .bind(id)
      .run();

    return c.json({
      success: true,
      message: 'Risk threshold deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete risk threshold error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to delete risk threshold',
        message: error.message,
      },
      500
    );
  }
});

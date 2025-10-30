import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';
import { runStressTest } from '../services/risk-analytics';

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

export const riskScenariosRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/risk-scenarios
 * Get all risk scenarios
 */
riskScenariosRoutes.get('/', authenticate, async (c) => {
  try {
    const includeInactive = c.req.query('include_inactive') === 'true';

    const query = includeInactive
      ? 'SELECT * FROM risk_scenarios ORDER BY severity DESC, scenario_name ASC'
      : 'SELECT * FROM risk_scenarios WHERE is_active = 1 ORDER BY severity DESC, scenario_name ASC';

    const result = await c.env.DB.prepare(query).all();

    return c.json({
      success: true,
      data: result.results,
      count: result.results.length,
    });
  } catch (error: any) {
    console.error('Get risk scenarios error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get risk scenarios',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/risk-scenarios/:id
 * Get specific risk scenario
 */
riskScenariosRoutes.get('/:id', authenticate, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const scenario = await c.env.DB.prepare(`
      SELECT * FROM risk_scenarios WHERE id = ?
    `)
      .bind(id)
      .first();

    if (!scenario) {
      return c.json(
        {
          success: false,
          error: 'Scenario not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      scenario,
    });
  } catch (error: any) {
    console.error('Get risk scenario error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get risk scenario',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/risk-scenarios
 * Create new risk scenario
 */
riskScenariosRoutes.post('/', authenticate, authorize('system.configure'), async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.scenario_name || !body.scenario_type || !body.parameters) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: scenario_name, scenario_type, parameters',
        },
        400
      );
    }

    // Validate parameters is valid JSON
    const params = typeof body.parameters === 'string'
      ? JSON.parse(body.parameters)
      : body.parameters;

    const result = await c.env.DB.prepare(`
      INSERT INTO risk_scenarios (
        scenario_name, scenario_type, description, parameters, severity, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        body.scenario_name,
        body.scenario_type,
        body.description || null,
        JSON.stringify(params),
        body.severity || 'medium',
        body.is_active !== false ? 1 : 0,
        body.user_id || null
      )
      .run();

    return c.json(
      {
        success: true,
        message: 'Risk scenario created successfully',
        id: result.meta.last_row_id,
      },
      201
    );
  } catch (error: any) {
    console.error('Create risk scenario error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create risk scenario',
        message: error.message,
      },
      500
    );
  }
});

/**
 * PUT /api/risk-scenarios/:id
 * Update risk scenario (only custom scenarios can be updated)
 */
riskScenariosRoutes.put('/:id', authenticate, authorize('system.configure'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    // Check if scenario exists and is not a system scenario
    const existing = await c.env.DB.prepare(`
      SELECT id, is_system_scenario FROM risk_scenarios WHERE id = ?
    `)
      .bind(id)
      .first();

    if (!existing) {
      return c.json(
        {
          success: false,
          error: 'Risk scenario not found',
        },
        404
      );
    }

    if (existing.is_system_scenario === 1) {
      return c.json(
        {
          success: false,
          error: 'System scenarios cannot be modified',
        },
        403
      );
    }

    const params = typeof body.parameters === 'string'
      ? JSON.parse(body.parameters)
      : body.parameters;

    await c.env.DB.prepare(`
      UPDATE risk_scenarios
      SET scenario_name = ?,
          scenario_type = ?,
          description = ?,
          parameters = ?,
          severity = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
      .bind(
        body.scenario_name,
        body.scenario_type,
        body.description || null,
        JSON.stringify(params),
        body.severity || 'medium',
        body.is_active !== false ? 1 : 0,
        id
      )
      .run();

    return c.json({
      success: true,
      message: 'Risk scenario updated successfully',
    });
  } catch (error: any) {
    console.error('Update risk scenario error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to update risk scenario',
        message: error.message,
      },
      500
    );
  }
});

/**
 * DELETE /api/risk-scenarios/:id
 * Delete risk scenario (only custom scenarios can be deleted)
 */
riskScenariosRoutes.delete('/:id', authenticate, authorize('system.configure'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    // Check if scenario exists and is not a system scenario
    const existing = await c.env.DB.prepare(`
      SELECT id, is_system_scenario FROM risk_scenarios WHERE id = ?
    `)
      .bind(id)
      .first();

    if (!existing) {
      return c.json(
        {
          success: false,
          error: 'Risk scenario not found',
        },
        404
      );
    }

    if (existing.is_system_scenario === 1) {
      return c.json(
        {
          success: false,
          error: 'System scenarios cannot be deleted',
        },
        403
      );
    }

    // Soft delete by setting is_active to 0
    await c.env.DB.prepare(`
      UPDATE risk_scenarios
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
      .bind(id)
      .run();

    return c.json({
      success: true,
      message: 'Risk scenario deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete risk scenario error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to delete risk scenario',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/risk-scenarios/:id/run
 * Run stress test for a scenario
 */
riskScenariosRoutes.post('/:id/run', authenticate, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    // Check if scenario exists
    const scenario = await c.env.DB.prepare(`
      SELECT id FROM risk_scenarios WHERE id = ? AND is_active = 1
    `)
      .bind(id)
      .first();

    if (!scenario) {
      return c.json(
        {
          success: false,
          error: 'Active scenario not found',
        },
        404
      );
    }

    // Run stress test
    const result = await runStressTest(c.env.DB, id);

    return c.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Run stress test error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to run stress test',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/risk-scenarios/:id/results
 * Get historical results for a scenario
 */
riskScenariosRoutes.get('/:id/results', authenticate, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const limit = parseInt(c.req.query('limit') || '10');

    const results = await c.env.DB.prepare(`
      SELECT * FROM risk_scenario_results
      WHERE scenario_id = ?
      ORDER BY run_at DESC
      LIMIT ?
    `)
      .bind(id, limit)
      .all();

    return c.json({
      success: true,
      data: results.results,
      count: results.results.length,
    });
  } catch (error: any) {
    console.error('Get scenario results error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get scenario results',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/risk-scenarios/run-all
 * Run all active scenarios
 */
riskScenariosRoutes.post('/run-all', authenticate, async (c) => {
  try {
    // Get all active scenarios
    const scenarios = await c.env.DB.prepare(`
      SELECT id, scenario_name FROM risk_scenarios WHERE is_active = 1
    `).all();

    const results = [];

    for (const scenario of scenarios.results) {
      try {
        const result = await runStressTest(c.env.DB, (scenario as any).id);
        results.push({
          scenario_id: (scenario as any).id,
          scenario_name: (scenario as any).scenario_name,
          success: true,
          result,
        });
      } catch (error: any) {
        results.push({
          scenario_id: (scenario as any).id,
          scenario_name: (scenario as any).scenario_name,
          success: false,
          error: error.message,
        });
      }
    }

    return c.json({
      success: true,
      results,
      total_scenarios: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
  } catch (error: any) {
    console.error('Run all scenarios error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to run all scenarios',
        message: error.message,
      },
      500
    );
  }
});

/**
 * Aggregation API Routes
 * Endpoints for cross-commodity position aggregation and economic equivalence
 */

import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';
import {
  calculateAllAggregatedPositions,
  calculateGroupAggregation,
  getAggregatedPositions,
  calculateEconomicEquivalence,
  checkSpreadNetting,
  getCommodityRelationships,
  getAggregationGroups,
  getGroupMembers,
} from '../services/aggregation-service';

const app = new Hono();

/**
 * GET /api/aggregation/groups
 * Get all aggregation groups
 */
app.get('/groups', authenticate, async (c) => {
  try {
    const groups = await getAggregationGroups(c.env.DB);

    return c.json({
      success: true,
      data: groups,
      count: groups.length,
    });
  } catch (error: any) {
    console.error('[API] Error getting aggregation groups:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve aggregation groups',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/aggregation/groups/:id/members
 * Get members of a specific aggregation group
 */
app.get('/groups/:id/members', authenticate, async (c) => {
  try {
    const groupId = parseInt(c.req.param('id'));
    const members = await getGroupMembers(c.env.DB, groupId);

    return c.json({
      success: true,
      data: members,
      count: members.length,
    });
  } catch (error: any) {
    console.error('[API] Error getting group members:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve group members',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/aggregation/positions
 * Get aggregated positions with filtering
 */
app.get('/positions', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const groupCode = c.req.query('group_code');
    const companyId = c.req.query('company_id');
    const limit = parseInt(c.req.query('limit') || '100');

    const positions = await getAggregatedPositions(c.env.DB, {
      group_code: groupCode,
      company_id: companyId ? parseInt(companyId) : undefined,
      limit,
    });

    return c.json({
      success: true,
      data: positions,
      count: positions.length,
    });
  } catch (error: any) {
    console.error('[API] Error getting aggregated positions:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve aggregated positions',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/aggregation/calculate
 * Trigger aggregation calculation
 */
app.post('/calculate', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const { company_id, calculation_type } = await c.req.json().catch(() => ({}));

    // If calculation_type is specified, run limit calculations
    if (calculation_type) {
      const { calculateSpotMonthLimits, calculateOneMonthLimits, calculateAllMonthLimits } = await import('../services/limit-calculator');

      let count = 0;
      if (calculation_type === 'spot_month' || calculation_type === 'all') {
        count += await calculateSpotMonthLimits(c.env.DB);
      }
      if (calculation_type === 'one_month' || calculation_type === 'all') {
        count += await calculateOneMonthLimits(c.env.DB);
      }
      if (calculation_type === 'all_month' || calculation_type === 'all') {
        count += await calculateAllMonthLimits(c.env.DB);
      }

      return c.json({
        success: true,
        message: `Calculated ${count} limit calculations`,
        data: { calculations_created: count },
      });
    }

    const count = await calculateAllAggregatedPositions(
      c.env.DB,
      company_id
    );

    return c.json({
      success: true,
      message: `Calculated ${count} aggregated positions`,
      data: { positions_calculated: count },
    });
  } catch (error: any) {
    console.error('[API] Error calculating positions:', error);
    return c.json({
      success: false,
      error: 'Failed to calculate positions',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/aggregation/equivalence
 * Calculate economic equivalence between two commodities
 */
app.post('/equivalence', authenticate, async (c) => {
  try {
    const { commodity_a, commodity_b, position_a } = await c.req.json();

    if (!commodity_a || !commodity_b || position_a === undefined) {
      return c.json({
        success: false,
        error: 'commodity_a, commodity_b, and position_a are required',
      }, 400);
    }

    const equivalentPosition = await calculateEconomicEquivalence(
      c.env.DB,
      commodity_a,
      commodity_b,
      position_a
    );

    return c.json({
      success: true,
      data: {
        commodity_a,
        commodity_b,
        position_a,
        position_b_equivalent: equivalentPosition,
        conversion_rate: equivalentPosition / position_a,
      },
    });
  } catch (error: any) {
    console.error('[API] Error calculating equivalence:', error);
    return c.json({
      success: false,
      error: 'Failed to calculate economic equivalence',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /api/aggregation/spread-netting
 * Check if spread positions can be netted
 */
app.post('/spread-netting', authenticate, async (c) => {
  try {
    const { commodity_a, commodity_b, position_a, position_b } = await c.req.json();

    if (!commodity_a || !commodity_b || position_a === undefined || position_b === undefined) {
      return c.json({
        success: false,
        error: 'commodity_a, commodity_b, position_a, and position_b are required',
      }, 400);
    }

    const netting = await checkSpreadNetting(
      c.env.DB,
      commodity_a,
      commodity_b,
      position_a,
      position_b
    );

    return c.json({
      success: true,
      data: netting,
    });
  } catch (error: any) {
    console.error('[API] Error checking spread netting:', error);
    return c.json({
      success: false,
      error: 'Failed to check spread netting',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/aggregation/relationships/:commodity
 * Get commodity relationships for a specific commodity
 */
app.get('/relationships/:commodity', authenticate, async (c) => {
  try {
    const commodityCode = c.req.param('commodity');
    const relationships = await getCommodityRelationships(c.env.DB, commodityCode);

    return c.json({
      success: true,
      data: relationships,
      count: relationships.length,
    });
  } catch (error: any) {
    console.error('[API] Error getting commodity relationships:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve commodity relationships',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/aggregation/stats
 * Get aggregation statistics
 */
app.get('/stats', authenticate, async (c) => {
  try {
    const stats = await c.env.DB.prepare(`
      SELECT
        COUNT(DISTINCT ag.id) as total_groups,
        COUNT(DISTINCT agm.commodity_code) as total_commodities,
        COUNT(DISTINCT cr.id) as total_relationships,
        COUNT(DISTINCT ap.id) as total_aggregated_positions,
        SUM(CASE WHEN ap.utilization_pct >= 100 THEN 1 ELSE 0 END) as breached_aggregations
      FROM aggregation_groups ag
      LEFT JOIN aggregation_group_members agm ON ag.id = agm.group_id AND agm.is_active = 1
      LEFT JOIN commodity_relationships cr ON cr.is_active = 1
      LEFT JOIN aggregated_positions ap ON ag.id = ap.group_id AND ap.is_active = 1
      WHERE ag.is_active = 1
    `).first();

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[API] Error getting aggregation stats:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve aggregation statistics',
      message: error.message,
    }, 500);
  }
});

export default app;

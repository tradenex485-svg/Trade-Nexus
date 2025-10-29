import { Hono } from 'hono';
import { optionalAuth } from '../middleware/auth';
import { TokenPayload } from '../services/auth-service';
import { CacheService, CacheKeys, CacheTTL } from '../services/cache-service';
import { markCacheHit } from '../middleware/performance';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

export const dashboardRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/dashboard/overview
 * Get real-time dashboard overview with aggregate statistics
 */
dashboardRoutes.get('/overview', optionalAuth, async (c) => {
  try {
    const user = c.get('user') as TokenPayload | undefined;
    const exchangeId = c.req.query('exchange_id') ? parseInt(c.req.query('exchange_id')!) : null;
    const cache = new CacheService(c.env.SESSIONS, c.env.DB);

    // Use cache with 1-minute TTL for dashboard data (include exchange_id in cache key)
    const overview = await cache.getOrCompute(
      `${CacheKeys.dashboardOverview()}_ex${exchangeId || 'all'}`,
      async () => {
        // Build WHERE clause for exchange filtering
        const exchangeJoin = exchangeId ? `
          JOIN market_limits ml ON lc.reporting_limit_code = ml.commodity_code
        ` : '';
        const exchangeWhere = exchangeId ? `AND ml.exchange_id = ${exchangeId}` : '';

        // Get total positions
        const totalPositions = await c.env.DB.prepare(`
          SELECT COUNT(*) as count
          FROM limit_calculations lc
          ${exchangeJoin}
          WHERE lc.is_active = 1 ${exchangeWhere}
        `).first();

        // Get counts by prioritization
        const byPrioritization = await c.env.DB.prepare(`
          SELECT lc.prioritization, COUNT(*) as count
          FROM limit_calculations lc
          ${exchangeJoin}
          WHERE lc.is_active = 1 ${exchangeWhere}
          GROUP BY lc.prioritization
        `).all();

        // Get counts by limit type
        const byLimitType = await c.env.DB.prepare(`
          SELECT
            CASE lc.limit_type
              WHEN 1 THEN 'Spot Month'
              WHEN 2 THEN 'One Month'
              WHEN 3 THEN 'All Month'
              ELSE 'Unknown'
            END as type,
            COUNT(*) as count
          FROM limit_calculations lc
          ${exchangeJoin}
          WHERE lc.is_active = 1 ${exchangeWhere}
          GROUP BY lc.limit_type
        `).all();

        // Get top 10 highest utilization positions
        const topRisks = await c.env.DB.prepare(`
          SELECT
            lc.reporting_limit_code,
            lc.mkt_index,
            lc.pos_lots,
            lc.limit_lots,
            lc.pos_pct,
            lc.prioritization,
            lc.limit_type,
            e.exchange_code,
            e.exchange_name
          FROM limit_calculations lc
          LEFT JOIN market_limits ml ON lc.reporting_limit_code = ml.commodity_code
          LEFT JOIN exchanges e ON ml.exchange_id = e.id
          WHERE lc.is_active = 1 ${exchangeId ? `AND ml.exchange_id = ${exchangeId}` : ''}
          ORDER BY lc.pos_pct DESC
          LIMIT 10
        `).all();

        // Get average utilization
        const avgUtilization = await c.env.DB.prepare(`
          SELECT AVG(lc.pos_pct) as avg_pct
          FROM limit_calculations lc
          ${exchangeJoin}
          WHERE lc.is_active = 1 ${exchangeWhere}
        `).first();

        // Get recent alerts (last 5)
        const recentAlerts = await c.env.DB.prepare(`
          SELECT
            id, title, severity, commodity_code, utilization_pct, created_at
          FROM alerts
          ORDER BY created_at DESC
          LIMIT 5
        `).all();

        // Parse prioritization counts
        const prioritizationMap: any = {
          Monitor: 0,
          Validate: 0,
          Remediate: 0,
          Breached: 0
        };

        for (const row of byPrioritization.results) {
          const r = row as any;
          prioritizationMap[r.prioritization] = r.count;
        }

        return {
          total_positions: totalPositions?.count || 0,
          by_prioritization: prioritizationMap,
          by_limit_type: byLimitType.results,
          average_utilization: avgUtilization?.avg_pct || 0,
          top_risks: topRisks.results,
          recent_alerts: recentAlerts.results
        };
      },
      { ttl: CacheTTL.SHORT }
    );

    // Get unread alerts count (user-specific, not cached)
    const unreadAlertsQuery = user
      ? `SELECT COUNT(*) as count FROM alerts WHERE read = 0 AND (user_id = ? OR user_id IS NULL)`
      : `SELECT COUNT(*) as count FROM alerts WHERE read = 0`;

    const unreadAlerts = await c.env.DB.prepare(unreadAlertsQuery)
      .bind(...(user ? [user.userId] : []))
      .first();

    // Mark cache hit if data was cached
    markCacheHit(c);

    return c.json({
      success: true,
      overview: {
        ...overview,
        unread_alerts: unreadAlerts?.count || 0,
      }
    });

  } catch (error: any) {
    console.error('Dashboard overview error:', error);
    return c.json({
      success: false,
      error: 'Failed to get dashboard overview',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/dashboard/by-commodity
 * Get position utilization grouped by commodity
 */
dashboardRoutes.get('/by-commodity', async (c) => {
  try {
    const limitType = parseInt(c.req.query('limit_type') || '1');
    const exchangeId = c.req.query('exchange_id') ? parseInt(c.req.query('exchange_id')!) : null;
    const cache = new CacheService(c.env.SESSIONS, c.env.DB);

    const data = await cache.getOrCompute(
      `${CacheKeys.dashboardByCommodity(limitType)}_ex${exchangeId || 'all'}`,
      async () => {
        const exchangeJoin = exchangeId ? `
          JOIN market_limits ml ON lc.reporting_limit_code = ml.commodity_code
        ` : '';
        const exchangeWhere = exchangeId ? `AND ml.exchange_id = ${exchangeId}` : '';

        const result = await c.env.DB.prepare(`
          SELECT
            lc.reporting_limit_code as commodity,
            COUNT(*) as position_count,
            AVG(lc.pos_pct) as avg_utilization,
            MAX(lc.pos_pct) as max_utilization,
            SUM(lc.pos_lots) as total_position,
            SUM(lc.limit_lots) as total_limit,
            SUM(CASE WHEN lc.prioritization = 'Breached' THEN 1 ELSE 0 END) as breached_count,
            SUM(CASE WHEN lc.prioritization = 'Remediate' THEN 1 ELSE 0 END) as remediate_count,
            SUM(CASE WHEN lc.prioritization = 'Validate' THEN 1 ELSE 0 END) as validate_count,
            SUM(CASE WHEN lc.prioritization = 'Monitor' THEN 1 ELSE 0 END) as monitor_count
          FROM limit_calculations lc
          ${exchangeJoin}
          WHERE lc.is_active = 1 AND lc.limit_type = ? ${exchangeWhere}
          GROUP BY lc.reporting_limit_code
          ORDER BY max_utilization DESC
        `).bind(limitType).all();

        return {
          data: result.results,
          count: result.results.length
        };
      },
      { ttl: CacheTTL.MEDIUM }
    );

    markCacheHit(c);

    return c.json({
      success: true,
      ...data
    });

  } catch (error: any) {
    console.error('By commodity error:', error);
    return c.json({
      success: false,
      error: 'Failed to get commodity data',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/dashboard/trending
 * Get historical trends (7-day, 30-day)
 */
dashboardRoutes.get('/trending', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '7');
    const commodityCode = c.req.query('commodity_code');
    const exchangeId = c.req.query('exchange_id') ? parseInt(c.req.query('exchange_id')!) : null;
    const cache = new CacheService(c.env.SESSIONS, c.env.DB);

    const data = await cache.getOrCompute(
      `${CacheKeys.dashboardTrending(days, commodityCode)}_ex${exchangeId || 'all'}`,
      async () => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

        const exchangeJoin = exchangeId ? `
          JOIN market_limits ml ON lcs.reporting_limit_code = ml.commodity_code
        ` : '';
        const exchangeWhere = exchangeId ? `AND ml.exchange_id = ${exchangeId}` : '';

        let query = `
          SELECT
            lcs.as_of_date,
            lcs.reporting_limit_code,
            AVG(lcs.pos_pct) as avg_utilization,
            MAX(lcs.pos_pct) as max_utilization,
            COUNT(*) as position_count,
            SUM(CASE WHEN lcs.prioritization = 'Breached' THEN 1 ELSE 0 END) as breached_count
          FROM limit_calculation_series lcs
          ${exchangeJoin}
          WHERE lcs.as_of_date >= ?
          ${exchangeWhere}
        `;

        const bindings: any[] = [cutoffDateStr];

        if (commodityCode) {
          query += ` AND lcs.reporting_limit_code = ?`;
          bindings.push(commodityCode);
        }

        query += `
          GROUP BY lcs.as_of_date, lcs.reporting_limit_code
          ORDER BY lcs.as_of_date ASC, lcs.reporting_limit_code ASC
        `;

        const result = await c.env.DB.prepare(query).bind(...bindings).all();

        // Get daily summary
        const dailyExchangeJoin = exchangeId ? `
          JOIN market_limits ml ON lcs.reporting_limit_code = ml.commodity_code
        ` : '';
        const dailyExchangeWhere = exchangeId ? `AND ml.exchange_id = ${exchangeId}` : '';

        const dailySummary = await c.env.DB.prepare(`
          SELECT
            lcs.as_of_date,
            AVG(lcs.pos_pct) as avg_utilization,
            MAX(lcs.pos_pct) as max_utilization,
            COUNT(*) as position_count
          FROM limit_calculation_series lcs
          ${dailyExchangeJoin}
          WHERE lcs.as_of_date >= ?
          ${dailyExchangeWhere}
          GROUP BY lcs.as_of_date
          ORDER BY lcs.as_of_date ASC
        `).bind(cutoffDateStr).all();

        return {
          data: result.results,
          daily_summary: dailySummary.results,
          period: {
            start_date: cutoffDateStr,
            end_date: new Date().toISOString().split('T')[0],
            days
          }
        };
      },
      { ttl: CacheTTL.LONG } // Hourly cache for historical data
    );

    markCacheHit(c);

    return c.json({
      success: true,
      ...data
    });

  } catch (error: any) {
    console.error('Trending error:', error);
    return c.json({
      success: false,
      error: 'Failed to get trending data',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/dashboard/heatmap
 * Get heatmap data for risk visualization
 */
dashboardRoutes.get('/heatmap', async (c) => {
  try {
    const limitType = parseInt(c.req.query('limit_type') || '1');

    const result = await c.env.DB.prepare(`
      SELECT
        reporting_limit_code,
        mkt_index,
        pos_pct,
        prioritization,
        pos_lots,
        limit_lots,
        CASE
          WHEN pos_pct >= 100 THEN 'critical'
          WHEN pos_pct >= 90 THEN 'high'
          WHEN pos_pct >= 75 THEN 'medium'
          WHEN pos_pct >= 50 THEN 'low'
          ELSE 'minimal'
        END as risk_level
      FROM limit_calculations
      WHERE is_active = 1 AND limit_type = ?
      ORDER BY pos_pct DESC
    `).bind(limitType).all();

    return c.json({
      success: true,
      data: result.results,
      count: result.results.length
    });

  } catch (error: any) {
    console.error('Heatmap error:', error);
    return c.json({
      success: false,
      error: 'Failed to get heatmap data',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/dashboard/concentration
 * Get concentration risk analysis
 */
dashboardRoutes.get('/concentration', async (c) => {
  try {
    // Concentration by commodity
    const byCommodity = await c.env.DB.prepare(`
      SELECT
        reporting_limit_code,
        SUM(pos_lots) as total_position,
        COUNT(*) as contract_count,
        AVG(pos_pct) as avg_utilization
      FROM limit_calculations
      WHERE is_active = 1
      GROUP BY reporting_limit_code
      ORDER BY total_position DESC
      LIMIT 15
    `).all();

    // Concentration by exchange (if available)
    const byExchange = await c.env.DB.prepare(`
      SELECT
        ml.exchange_code as exchange,
        COUNT(DISTINCT lc.reporting_limit_code) as commodity_count,
        COUNT(*) as position_count,
        AVG(lc.pos_pct) as avg_utilization
      FROM limit_calculations lc
      JOIN market_limits ml ON lc.reporting_limit_code = ml.commodity_code
      WHERE lc.is_active = 1
      GROUP BY ml.exchange_code
      ORDER BY position_count DESC
    `).all();

    // Concentration by contract month
    const byContractMonth = await c.env.DB.prepare(`
      SELECT
        contract_month,
        COUNT(*) as position_count,
        SUM(pos_lots) as total_position,
        AVG(pos_pct) as avg_utilization
      FROM limit_calculations
      WHERE is_active = 1
      GROUP BY contract_month
      ORDER BY contract_month ASC
    `).all();

    return c.json({
      success: true,
      concentration: {
        by_commodity: byCommodity.results,
        by_exchange: byExchange.results,
        by_contract_month: byContractMonth.results
      }
    });

  } catch (error: any) {
    console.error('Concentration error:', error);
    return c.json({
      success: false,
      error: 'Failed to get concentration data',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/dashboard/commodity/:code
 * Get detailed data for specific commodity
 */
dashboardRoutes.get('/commodity/:code', async (c) => {
  try {
    const commodityCode = c.req.param('code');

    // Current positions for this commodity
    const positions = await c.env.DB.prepare(`
      SELECT
        id,
        mkt_index,
        contract_month,
        pos_lots,
        limit_lots,
        pos_pct,
        prioritization,
        limit_type,
        total_buy,
        total_sale,
        as_of_date
      FROM limit_calculations
      WHERE is_active = 1 AND reporting_limit_code = ?
      ORDER BY pos_pct DESC
    `).bind(commodityCode).all();

    // Historical trend for this commodity (last 30 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const history = await c.env.DB.prepare(`
      SELECT
        as_of_date,
        AVG(pos_pct) as avg_utilization,
        MAX(pos_pct) as max_utilization,
        SUM(pos_lots) as total_position
      FROM limit_calculation_series
      WHERE reporting_limit_code = ? AND as_of_date >= ?
      GROUP BY as_of_date
      ORDER BY as_of_date ASC
    `).bind(commodityCode, cutoffDate.toISOString().split('T')[0]).all();

    // Recent alerts for this commodity
    const alerts = await c.env.DB.prepare(`
      SELECT id, title, severity, utilization_pct, created_at
      FROM alerts
      WHERE commodity_code = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(commodityCode).all();

    // Market limit info
    const marketLimit = await c.env.DB.prepare(`
      SELECT
        commodity_code,
        contract_name,
        spot_month_limit,
        single_month_accountability_level,
        all_month_accountability_level,
        unit_of_trading,
        exchange_code
      FROM market_limits
      WHERE commodity_code = ?
      LIMIT 1
    `).bind(commodityCode).first();

    return c.json({
      success: true,
      commodity_code: commodityCode,
      positions: positions.results,
      history: history.results,
      alerts: alerts.results,
      market_limit: marketLimit
    });

  } catch (error: any) {
    console.error('Commodity detail error:', error);
    return c.json({
      success: false,
      error: 'Failed to get commodity data',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/dashboard/ice-positions
 * Get ICE exchange positions with net long/short calculations
 */
dashboardRoutes.get('/ice-positions', async (c) => {
  try {
    const marketLocation = c.req.query('market_location');
    const cache = new CacheService(c.env.SESSIONS, c.env.DB);

    const data = await cache.getOrCompute(
      `${CacheKeys.dashboardOverview()}_ice_positions_${marketLocation || 'all'}`,
      async () => {
        // Build market location filter (no longer filtering by exchange)
        const marketFilter = marketLocation ? `AND lc.mkt_index = ?` : '';
        const bindings = marketLocation ? [marketLocation] : [];

        // Get aggregated positions by commodity (for bar chart)
        // Show net position per commodity (can be positive or negative)
        const positions = await c.env.DB.prepare(`
          SELECT
            lc.reporting_limit_code as commodity,
            SUM(lc.total_buy) as total_long,
            SUM(lc.total_sale) as total_short,
            SUM(lc.total_buy - lc.total_sale) as net_position,
            COUNT(*) as position_count,
            AVG(lc.pos_pct) as avg_utilization
          FROM limit_calculations lc
          WHERE lc.is_active = 1 ${marketFilter}
          GROUP BY lc.reporting_limit_code
          HAVING ABS(SUM(lc.total_buy - lc.total_sale)) > 0
          ORDER BY ABS(SUM(lc.total_buy - lc.total_sale)) DESC
          LIMIT 20
        `).bind(...bindings).all();

        // Get detailed table data
        const tableData = await c.env.DB.prepare(`
          SELECT
            lc.mkt_index as market_location,
            lc.contract_month as period,
            CASE lc.limit_type
              WHEN 1 THEN '0-4'
              WHEN 2 THEN '0-1'
              WHEN 3 THEN '0-All'
              ELSE 'Unknown'
            END as limit_type,
            lc.pos_lots as current_utilization_lots,
            lc.pos_pct as current_utilization_pct,
            (lc.limit_lots - lc.pos_lots) as remaining_utilization_lots,
            CASE
              WHEN lc.limit_lots > 0 THEN ((lc.limit_lots - lc.pos_lots) / lc.limit_lots * 100)
              ELSE 0
            END as remaining_utilization_pct,
            lc.reporting_limit_code as commodity,
            lc.prioritization
          FROM limit_calculations lc
          WHERE lc.is_active = 1 ${marketFilter}
          ORDER BY lc.pos_pct DESC
          LIMIT 50
        `).bind(...bindings).all();

        // Get available market locations for filter
        const marketLocations = await c.env.DB.prepare(`
          SELECT DISTINCT lc.mkt_index as market_location
          FROM limit_calculations lc
          WHERE lc.is_active = 1
          ORDER BY lc.mkt_index
        `).all();

        return {
          positions: positions.results,
          tableData: tableData.results,
          marketLocations: marketLocations.results
        };
      },
      { ttl: CacheTTL.SHORT }
    );

    markCacheHit(c);

    return c.json({
      success: true,
      ...data
    });

  } catch (error: any) {
    console.error('ICE positions error:', error);
    return c.json({
      success: false,
      error: 'Failed to get ICE positions',
      message: error.message
    }, 500);
  }
});

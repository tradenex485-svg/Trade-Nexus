import { Hono } from 'hono';
import {
  calculateHistoricalVaR,
  calculateParametricVaR,
  calculateMonteCarloVaR,
  calculateConcentrationMetrics,
  calculateCommodityCorrelations,
  saveVaRHistory,
} from '../services/risk-analytics';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

export const riskMetricsRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/risk-metrics/var
 * Calculate current portfolio VaR using multiple methods
 */
riskMetricsRoutes.get('/var', async (c) => {
  try {
    const method = c.req.query('method') || 'all'; // 'historical', 'parametric', 'monte_carlo', 'all'
    const confidenceLevel = parseInt(c.req.query('confidence') || '95');
    const lookbackDays = parseInt(c.req.query('lookback') || '30');

    let result: any = {};

    if (method === 'historical' || method === 'all') {
      result.historical = await calculateHistoricalVaR(c.env.DB, confidenceLevel, lookbackDays);
    }

    if (method === 'parametric' || method === 'all') {
      result.parametric = await calculateParametricVaR(c.env.DB, confidenceLevel, lookbackDays);
    }

    if (method === 'monte_carlo' || method === 'all') {
      result.monte_carlo = await calculateMonteCarloVaR(c.env.DB, confidenceLevel, 1000);
    }

    return c.json({
      success: true,
      var: result,
      parameters: {
        confidence_level: confidenceLevel,
        lookback_days: lookbackDays,
        method,
      },
    });
  } catch (error: any) {
    console.error('Calculate VaR error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to calculate VaR',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/risk-metrics/concentration
 * Get portfolio concentration metrics
 */
riskMetricsRoutes.get('/concentration', async (c) => {
  try {
    const metrics = await calculateConcentrationMetrics(c.env.DB);

    return c.json({
      success: true,
      concentration: metrics,
    });
  } catch (error: any) {
    console.error('Calculate concentration error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to calculate concentration metrics',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/risk-metrics/correlations
 * Get commodity correlations
 */
riskMetricsRoutes.get('/correlations', async (c) => {
  try {
    const lookbackDays = parseInt(c.req.query('lookback') || '30');
    const correlations = await calculateCommodityCorrelations(c.env.DB, lookbackDays);

    return c.json({
      success: true,
      correlations,
      lookback_days: lookbackDays,
    });
  } catch (error: any) {
    console.error('Calculate correlations error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to calculate correlations',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/risk-metrics/dashboard
 * Get comprehensive risk dashboard data
 */
riskMetricsRoutes.get('/dashboard', async (c) => {
  try {
    // Calculate all metrics in parallel
    const [varHistorical, varParametric, varMonteCarlo, concentration] = await Promise.all([
      calculateHistoricalVaR(c.env.DB, 95, 30),
      calculateParametricVaR(c.env.DB, 95, 30),
      calculateMonteCarloVaR(c.env.DB, 95, 1000),
      calculateConcentrationMetrics(c.env.DB),
    ]);

    // Get portfolio metrics
    const portfolioMetrics = await c.env.DB.prepare(`
      SELECT
        SUM(pos_lots) as total_exposure,
        SUM(limit_lots) as total_limit,
        AVG(pos_pct) as avg_utilization,
        COUNT(*) as total_positions,
        SUM(CASE WHEN pos_pct >= 100 THEN 1 ELSE 0 END) as breached,
        SUM(CASE WHEN pos_pct >= 90 AND pos_pct < 100 THEN 1 ELSE 0 END) as near_breach
      FROM limit_calculations
      WHERE is_active = 1 AND limit_type = 1
    `).first();

    // Save VaR history
    await saveVaRHistory(c.env.DB, varHistorical, varParametric, varMonteCarlo, concentration);

    return c.json({
      success: true,
      dashboard: {
        var: {
          historical_95: varHistorical.var_95,
          historical_99: varHistorical.var_99,
          parametric_95: varParametric.var_95,
          parametric_99: varParametric.var_99,
          monte_carlo_95: varMonteCarlo.var_95,
          monte_carlo_99: varMonteCarlo.var_99,
        },
        concentration: {
          herfindahl_index: concentration.herfindahl_index,
          top_5_concentration_pct: concentration.top_5_concentration_pct,
          top_10_concentration_pct: concentration.top_10_concentration_pct,
          largest_position_pct: concentration.largest_position_pct,
          diversification_ratio: concentration.diversification_ratio,
        },
        portfolio: {
          total_exposure: portfolioMetrics.total_exposure || 0,
          total_limit: portfolioMetrics.total_limit || 0,
          avg_utilization: portfolioMetrics.avg_utilization || 0,
          total_positions: portfolioMetrics.total_positions || 0,
          breached: portfolioMetrics.breached || 0,
          near_breach: portfolioMetrics.near_breach || 0,
        },
        concentration_breakdown: {
          by_commodity: concentration.concentration_by_commodity,
          by_exchange: concentration.concentration_by_exchange,
        },
      },
    });
  } catch (error: any) {
    console.error('Risk dashboard error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to generate risk dashboard',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/risk-metrics/var-history
 * Get historical VaR data
 */
riskMetricsRoutes.get('/var-history', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '30');

    const history = await c.env.DB.prepare(`
      SELECT * FROM portfolio_var_history
      WHERE DATE(as_of_date) >= DATE('now', '-' || ? || ' days')
      ORDER BY as_of_date ASC
    `)
      .bind(days)
      .all();

    return c.json({
      success: true,
      history: history.results,
      count: history.results.length,
    });
  } catch (error: any) {
    console.error('Get VaR history error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get VaR history',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/risk-metrics/trends
 * Get risk trend indicators
 */
riskMetricsRoutes.get('/trends', async (c) => {
  try {
    // Get rolling metrics (30, 60, 90 days)
    const metrics30 = await c.env.DB.prepare(`
      SELECT
        AVG(var_95_historical) as avg_var_95,
        AVG(portfolio_utilization_pct) as avg_utilization,
        AVG(concentration_score) as avg_concentration
      FROM portfolio_var_history
      WHERE DATE(as_of_date) >= DATE('now', '-30 days')
    `).first();

    const metrics60 = await c.env.DB.prepare(`
      SELECT
        AVG(var_95_historical) as avg_var_95,
        AVG(portfolio_utilization_pct) as avg_utilization,
        AVG(concentration_score) as avg_concentration
      FROM portfolio_var_history
      WHERE DATE(as_of_date) >= DATE('now', '-60 days')
    `).first();

    const metrics90 = await c.env.DB.prepare(`
      SELECT
        AVG(var_95_historical) as avg_var_95,
        AVG(portfolio_utilization_pct) as avg_utilization,
        AVG(concentration_score) as avg_concentration
      FROM portfolio_var_history
      WHERE DATE(as_of_date) >= DATE('now', '-90 days')
    `).first();

    // Get latest metrics
    const latest = await c.env.DB.prepare(`
      SELECT * FROM portfolio_var_history
      ORDER BY as_of_date DESC
      LIMIT 1
    `).first();

    return c.json({
      success: true,
      trends: {
        current: latest,
        rolling_30d: metrics30,
        rolling_60d: metrics60,
        rolling_90d: metrics90,
      },
    });
  } catch (error: any) {
    console.error('Get trends error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get risk trends',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/risk-metrics/risk-decomposition
 * Get risk contribution by commodity
 */
riskMetricsRoutes.get('/risk-decomposition', async (c) => {
  try {
    // Get risk contribution for each commodity
    const decomposition = await c.env.DB.prepare(`
      SELECT
        reporting_limit_code as commodity,
        COUNT(*) as position_count,
        SUM(pos_lots) as total_exposure,
        AVG(pos_pct) as avg_utilization,
        MAX(pos_pct) as max_utilization,
        SUM(CASE WHEN pos_pct >= 90 THEN 1 ELSE 0 END) as high_risk_positions
      FROM limit_calculations
      WHERE is_active = 1 AND limit_type = 1
      GROUP BY reporting_limit_code
      ORDER BY total_exposure DESC
    `).all();

    // Calculate total exposure
    const total = await c.env.DB.prepare(`
      SELECT SUM(pos_lots) as total FROM limit_calculations
      WHERE is_active = 1 AND limit_type = 1
    `).first();

    const totalExposure = total.total || 1;

    // Add risk contribution percentage
    const enrichedData = (decomposition.results || []).map((item: any) => ({
      ...item,
      risk_contribution_pct: (item.total_exposure / totalExposure) * 100,
    }));

    return c.json({
      success: true,
      decomposition: enrichedData,
      total_exposure: totalExposure,
    });
  } catch (error: any) {
    console.error('Get risk decomposition error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get risk decomposition',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/risk-metrics/calculate-all
 * Calculate and save all risk metrics
 */
riskMetricsRoutes.post('/calculate-all', async (c) => {
  try {
    // Calculate all VaR methods
    const [varHistorical, varParametric, varMonteCarlo] = await Promise.all([
      calculateHistoricalVaR(c.env.DB, 95, 30),
      calculateParametricVaR(c.env.DB, 95, 30),
      calculateMonteCarloVaR(c.env.DB, 95, 1000),
    ]);

    // Calculate concentration and correlations
    const [concentration, correlations] = await Promise.all([
      calculateConcentrationMetrics(c.env.DB),
      calculateCommodityCorrelations(c.env.DB, 30),
    ]);

    // Save VaR history
    await saveVaRHistory(c.env.DB, varHistorical, varParametric, varMonteCarlo, concentration);

    return c.json({
      success: true,
      message: 'All risk metrics calculated and saved successfully',
      summary: {
        var_historical_95: varHistorical.var_95,
        var_parametric_95: varParametric.var_95,
        var_monte_carlo_95: varMonteCarlo.var_95,
        concentration_score: concentration.herfindahl_index,
        correlations_calculated: correlations.length,
      },
    });
  } catch (error: any) {
    console.error('Calculate all metrics error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to calculate all metrics',
        message: error.message,
      },
      500
    );
  }
});

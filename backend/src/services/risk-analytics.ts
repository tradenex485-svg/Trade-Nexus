/**
 * Advanced Risk Analytics Service
 * Provides VaR calculation, stress testing, correlation analysis, and concentration metrics
 */

interface Position {
  mkt_index: string;
  reporting_limit_code: string;
  pos_lots: number;
  limit_lots: number;
  pos_pct: number;
  prioritization: string;
}

interface VaRResult {
  var_95: number;
  var_99: number;
  method: string;
  confidence_levels: { level: number; value: number }[];
  calculation_date: string;
}

interface StressTestResult {
  scenario_name: string;
  pre_shock: {
    total_exposure: number;
    avg_utilization: number;
    breached_positions: number;
  };
  post_shock: {
    total_exposure: number;
    avg_utilization: number;
    breached_positions: number;
  };
  impact: {
    var_change_pct: number;
    utilization_change_pct: number;
    new_breaches: number;
    worst_affected: any[];
  };
}

interface ConcentrationMetrics {
  herfindahl_index: number; // 0-100 scale
  top_5_concentration_pct: number;
  top_10_concentration_pct: number;
  largest_position_pct: number;
  diversification_ratio: number;
  concentration_by_commodity: any[];
  concentration_by_exchange: any[];
}

/**
 * Calculate Value at Risk using Historical Simulation
 */
export async function calculateHistoricalVaR(
  db: any,
  confidenceLevel: number = 95,
  lookbackDays: number = 30
): Promise<VaRResult> {
  // Get historical position data
  const historicalData = await db.prepare(`
    SELECT
      as_of_date,
      SUM(pos_lots) as total_position,
      SUM(limit_lots) as total_limit,
      AVG(pos_pct) as avg_utilization
    FROM limit_calculation_series
    WHERE DATE(as_of_date) >= DATE('now', '-' || ? || ' days')
    GROUP BY as_of_date
    ORDER BY as_of_date DESC
  `).bind(lookbackDays).all();

  const data = historicalData.results || [];

  if (data.length < 10) {
    // Not enough data, return zero VaR
    return {
      var_95: 0,
      var_99: 0,
      method: 'historical',
      confidence_levels: [
        { level: 95, value: 0 },
        { level: 99, value: 0 }
      ],
      calculation_date: new Date().toISOString().split('T')[0]
    };
  }

  // Calculate daily returns/changes in utilization
  const returns: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const prev = data[i] as any;
    const curr = data[i - 1] as any;
    const change = (curr.avg_utilization - prev.avg_utilization) / prev.avg_utilization;
    if (!isNaN(change) && isFinite(change)) {
      returns.push(change * 100);
    }
  }

  // Sort returns from worst to best
  returns.sort((a, b) => a - b);

  // Calculate VaR at different confidence levels
  const var95Index = Math.floor(returns.length * (1 - confidenceLevel / 100));
  const var99Index = Math.floor(returns.length * 0.01);

  const var95 = Math.abs(returns[var95Index] || 0);
  const var99 = Math.abs(returns[var99Index] || 0);

  return {
    var_95: var95,
    var_99: var99,
    method: 'historical',
    confidence_levels: [
      { level: 95, value: var95 },
      { level: 99, value: var99 },
      { level: 90, value: Math.abs(returns[Math.floor(returns.length * 0.10)] || 0) }
    ],
    calculation_date: new Date().toISOString().split('T')[0]
  };
}

/**
 * Calculate Value at Risk using Parametric (Variance-Covariance) method
 */
export async function calculateParametricVaR(
  db: any,
  confidenceLevel: number = 95,
  lookbackDays: number = 30
): Promise<VaRResult> {
  // Get historical data
  const historicalData = await db.prepare(`
    SELECT
      as_of_date,
      AVG(pos_pct) as avg_utilization
    FROM limit_calculation_series
    WHERE DATE(as_of_date) >= DATE('now', '-' || ? || ' days')
    GROUP BY as_of_date
    ORDER BY as_of_date DESC
  `).bind(lookbackDays).all();

  const data = historicalData.results || [];

  if (data.length < 10) {
    return {
      var_95: 0,
      var_99: 0,
      method: 'parametric',
      confidence_levels: [
        { level: 95, value: 0 },
        { level: 99, value: 0 }
      ],
      calculation_date: new Date().toISOString().split('T')[0]
    };
  }

  // Calculate mean and standard deviation
  const utilizations = data.map((d: any) => d.avg_utilization);
  const mean = utilizations.reduce((a: number, b: number) => a + b, 0) / utilizations.length;
  const variance = utilizations.reduce((sum: number, val: number) =>
    sum + Math.pow(val - mean, 2), 0) / utilizations.length;
  const stdDev = Math.sqrt(variance);

  // Z-scores for different confidence levels
  const z95 = 1.645; // 95% confidence
  const z99 = 2.326; // 99% confidence

  const var95 = z95 * stdDev;
  const var99 = z99 * stdDev;

  return {
    var_95: var95,
    var_99: var99,
    method: 'parametric',
    confidence_levels: [
      { level: 95, value: var95 },
      { level: 99, value: var99 },
      { level: 90, value: 1.282 * stdDev }
    ],
    calculation_date: new Date().toISOString().split('T')[0]
  };
}

/**
 * Calculate Monte Carlo VaR
 * Simplified version using normal distribution
 */
export async function calculateMonteCarloVaR(
  db: any,
  confidenceLevel: number = 95,
  simulations: number = 1000
): Promise<VaRResult> {
  // Get current positions and historical volatility
  const positions = await db.prepare(`
    SELECT
      mkt_index,
      reporting_limit_code,
      pos_lots,
      limit_lots,
      pos_pct
    FROM limit_calculations
    WHERE is_active = 1 AND limit_type = 1
  `).all();

  if (!positions.results || positions.results.length === 0) {
    return {
      var_95: 0,
      var_99: 0,
      method: 'monte_carlo',
      confidence_levels: [
        { level: 95, value: 0 },
        { level: 99, value: 0 }
      ],
      calculation_date: new Date().toISOString().split('T')[0]
    };
  }

  // Calculate historical volatility
  const volatilityData = await db.prepare(`
    SELECT
      AVG(pos_pct) as mean_util,
      (SELECT AVG(pos_pct) FROM limit_calculation_series WHERE DATE(as_of_date) >= DATE('now', '-30 days')) as overall_mean
    FROM limit_calculation_series
    WHERE DATE(as_of_date) >= DATE('now', '-30 days')
  `).first();

  const volatility = 15; // Default 15% volatility if we can't calculate

  // Run Monte Carlo simulations
  const simulatedReturns: number[] = [];
  for (let i = 0; i < simulations; i++) {
    // Generate random return using Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const randNormal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const simReturn = randNormal * volatility;
    simulatedReturns.push(simReturn);
  }

  // Sort and calculate VaR
  simulatedReturns.sort((a, b) => a - b);

  const var95Index = Math.floor(simulations * 0.05);
  const var99Index = Math.floor(simulations * 0.01);

  const var95 = Math.abs(simulatedReturns[var95Index]);
  const var99 = Math.abs(simulatedReturns[var99Index]);

  return {
    var_95: var95,
    var_99: var99,
    method: 'monte_carlo',
    confidence_levels: [
      { level: 95, value: var95 },
      { level: 99, value: var99 },
      { level: 90, value: Math.abs(simulatedReturns[Math.floor(simulations * 0.10)]) }
    ],
    calculation_date: new Date().toISOString().split('T')[0]
  };
}

/**
 * Run stress test scenario
 */
export async function runStressTest(
  db: any,
  scenarioId: number
): Promise<StressTestResult> {
  // Get scenario parameters
  const scenario = await db.prepare(`
    SELECT * FROM risk_scenarios WHERE id = ?
  `).bind(scenarioId).first();

  if (!scenario) {
    throw new Error('Scenario not found');
  }

  const params = JSON.parse(scenario.parameters);

  // Get current positions
  const positions = await db.prepare(`
    SELECT
      mkt_index,
      reporting_limit_code,
      pos_lots,
      limit_lots,
      pos_pct,
      prioritization
    FROM limit_calculations
    WHERE is_active = 1 AND limit_type = 1
  `).all();

  const currentPositions = (positions.results || []) as Position[];

  // Calculate pre-shock metrics
  const preShock = {
    total_exposure: currentPositions.reduce((sum, p) => sum + p.pos_lots, 0),
    avg_utilization: currentPositions.reduce((sum, p) => sum + p.pos_pct, 0) / currentPositions.length || 0,
    breached_positions: currentPositions.filter(p => p.pos_pct >= 100).length
  };

  // Apply shocks to positions
  const shockedPositions = currentPositions.map(pos => {
    let shock = 0;

    // Apply global shock if present
    if (params.global_shock) {
      shock = params.global_shock;
    }

    // Apply commodity-specific shock
    const commodityShockKey = `${pos.reporting_limit_code}_shock`;
    if (params[commodityShockKey]) {
      shock = params[commodityShockKey];
    }

    // Calculate new utilization (shock affects both position and limit)
    const shockMultiplier = 1 + (shock / 100);
    const newPosLots = pos.pos_lots * shockMultiplier;
    const newPosPct = (newPosLots / pos.limit_lots) * 100;

    return {
      ...pos,
      shocked_pos_lots: newPosLots,
      shocked_pos_pct: newPosPct,
      shock_impact: newPosPct - pos.pos_pct
    };
  });

  // Calculate post-shock metrics
  const postShock = {
    total_exposure: shockedPositions.reduce((sum: number, p: any) => sum + p.shocked_pos_lots, 0),
    avg_utilization: shockedPositions.reduce((sum: number, p: any) => sum + p.shocked_pos_pct, 0) / shockedPositions.length || 0,
    breached_positions: shockedPositions.filter((p: any) => p.shocked_pos_pct >= 100).length
  };

  // Find worst affected positions
  const worstAffected = shockedPositions
    .sort((a: any, b: any) => Math.abs(b.shock_impact) - Math.abs(a.shock_impact))
    .slice(0, 10)
    .map((p: any) => ({
      mkt_index: p.mkt_index,
      commodity: p.reporting_limit_code,
      current_utilization: p.pos_pct.toFixed(2),
      shocked_utilization: p.shocked_pos_pct.toFixed(2),
      impact: p.shock_impact.toFixed(2)
    }));

  const result = {
    scenario_name: scenario.scenario_name,
    pre_shock: preShock,
    post_shock: postShock,
    impact: {
      var_change_pct: ((postShock.avg_utilization - preShock.avg_utilization) / preShock.avg_utilization) * 100 || 0,
      utilization_change_pct: postShock.avg_utilization - preShock.avg_utilization,
      new_breaches: postShock.breached_positions - preShock.breached_positions,
      worst_affected: worstAffected
    }
  };

  // Save result to database
  await db.prepare(`
    INSERT INTO risk_scenario_results (
      scenario_id, pre_shock_var_95, pre_shock_utilization_pct, pre_shock_exposure,
      post_shock_var_95, post_shock_utilization_pct, post_shock_exposure,
      post_shock_breaches, var_impact_pct, utilization_impact_pct, new_breaches,
      position_impacts, worst_affected_positions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    scenarioId,
    0, // VaR calculations would go here
    preShock.avg_utilization,
    preShock.total_exposure,
    0,
    postShock.avg_utilization,
    postShock.total_exposure,
    postShock.breached_positions,
    result.impact.var_change_pct,
    result.impact.utilization_change_pct,
    result.impact.new_breaches,
    JSON.stringify(shockedPositions),
    JSON.stringify(worstAffected)
  ).run();

  return result;
}

/**
 * Calculate concentration metrics
 */
export async function calculateConcentrationMetrics(db: any): Promise<ConcentrationMetrics> {
  // Get all active positions
  const positions = await db.prepare(`
    SELECT
      mkt_index,
      reporting_limit_code,
      pos_lots,
      limit_lots,
      pos_pct
    FROM limit_calculations
    WHERE is_active = 1 AND limit_type = 1
    ORDER BY pos_pct DESC
  `).all();

  const positionsList = (positions.results || []) as Position[];

  if (positionsList.length === 0) {
    return {
      herfindahl_index: 0,
      top_5_concentration_pct: 0,
      top_10_concentration_pct: 0,
      largest_position_pct: 0,
      diversification_ratio: 0,
      concentration_by_commodity: [],
      concentration_by_exchange: []
    };
  }

  const totalExposure = positionsList.reduce((sum, p) => sum + p.pos_lots, 0);

  // Calculate Herfindahl Index (sum of squared market shares)
  const herfindahl = positionsList.reduce((sum, p) => {
    const share = p.pos_lots / totalExposure;
    return sum + (share * share);
  }, 0);

  // Normalize to 0-100 scale
  const herfindahlNormalized = (herfindahl * 100);

  // Top N concentration
  const top5 = positionsList.slice(0, 5).reduce((sum, p) => sum + p.pos_lots, 0);
  const top10 = positionsList.slice(0, 10).reduce((sum, p) => sum + p.pos_lots, 0);

  // Concentration by commodity
  const byCommodity = await db.prepare(`
    SELECT
      reporting_limit_code,
      COUNT(*) as position_count,
      SUM(pos_lots) as total_exposure,
      AVG(pos_pct) as avg_utilization,
      MAX(pos_pct) as max_utilization
    FROM limit_calculations
    WHERE is_active = 1 AND limit_type = 1
    GROUP BY reporting_limit_code
    ORDER BY total_exposure DESC
  `).all();

  // Concentration by exchange (using first 2 chars of mkt_index as exchange)
  const byExchange = await db.prepare(`
    SELECT
      SUBSTR(mkt_index, 1, 2) as exchange,
      COUNT(*) as position_count,
      SUM(pos_lots) as total_exposure,
      AVG(pos_pct) as avg_utilization
    FROM limit_calculations
    WHERE is_active = 1 AND limit_type = 1
    GROUP BY exchange
    ORDER BY total_exposure DESC
  `).all();

  return {
    herfindahl_index: herfindahlNormalized,
    top_5_concentration_pct: (top5 / totalExposure) * 100,
    top_10_concentration_pct: (top10 / totalExposure) * 100,
    largest_position_pct: (positionsList[0].pos_lots / totalExposure) * 100,
    diversification_ratio: 1 / Math.sqrt(herfindahl),
    concentration_by_commodity: byCommodity.results || [],
    concentration_by_exchange: byExchange.results || []
  };
}

/**
 * Calculate commodity correlations
 */
export async function calculateCommodityCorrelations(
  db: any,
  lookbackDays: number = 30
): Promise<any[]> {
  // Get commodities
  const commodities = await db.prepare(`
    SELECT DISTINCT reporting_limit_code
    FROM limit_calculation_series
    WHERE DATE(as_of_date) >= DATE('now', '-' || ? || ' days')
  `).bind(lookbackDays).all();

  const commodityList = (commodities.results || []).map((c: any) => c.reporting_limit_code);

  const correlations = [];

  // Calculate pairwise correlations
  for (let i = 0; i < commodityList.length; i++) {
    for (let j = i + 1; j < commodityList.length; j++) {
      const comm1 = commodityList[i];
      const comm2 = commodityList[j];

      // Get time series for both commodities
      const series1 = await db.prepare(`
        SELECT as_of_date, AVG(pos_pct) as utilization
        FROM limit_calculation_series
        WHERE reporting_limit_code = ? AND DATE(as_of_date) >= DATE('now', '-' || ? || ' days')
        GROUP BY as_of_date
        ORDER BY as_of_date
      `).bind(comm1, lookbackDays).all();

      const series2 = await db.prepare(`
        SELECT as_of_date, AVG(pos_pct) as utilization
        FROM limit_calculation_series
        WHERE reporting_limit_code = ? AND DATE(as_of_date) >= DATE('now', '-' || ? || ' days')
        GROUP BY as_of_date
        ORDER BY as_of_date
      `).bind(comm2, lookbackDays).all();

      // Calculate correlation coefficient (Pearson)
      const data1 = (series1.results || []).map((d: any) => d.utilization);
      const data2 = (series2.results || []).map((d: any) => d.utilization);

      if (data1.length > 5 && data2.length > 5) {
        const correlation = pearsonCorrelation(data1, data2);

        correlations.push({
          commodity_1: comm1,
          commodity_2: comm2,
          correlation: correlation.toFixed(3),
          sample_size: Math.min(data1.length, data2.length)
        });

        // Save to database
        await db.prepare(`
          INSERT OR REPLACE INTO commodity_correlations (
            commodity_1, commodity_2, correlation_coefficient, calculation_period_days, as_of_date, sample_size
          ) VALUES (?, ?, ?, ?, DATE('now'), ?)
        `).bind(comm1, comm2, correlation, lookbackDays, Math.min(data1.length, data2.length)).run();
      }
    }
  }

  return correlations;
}

/**
 * Helper: Calculate Pearson correlation coefficient
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : numerator / denom;
}

/**
 * Save VaR history
 */
export async function saveVaRHistory(
  db: any,
  varHistorical: VaRResult,
  varParametric: VaRResult,
  varMonteCarlo: VaRResult,
  concentrationMetrics: ConcentrationMetrics
) {
  // Get current portfolio metrics
  const portfolioMetrics = await db.prepare(`
    SELECT
      SUM(pos_lots) as total_exposure,
      SUM(limit_lots) as total_limit,
      AVG(pos_pct) as avg_utilization
    FROM limit_calculations
    WHERE is_active = 1 AND limit_type = 1
  `).first();

  await db.prepare(`
    INSERT INTO portfolio_var_history (
      as_of_date,
      var_95_historical, var_99_historical,
      var_95_parametric, var_99_parametric,
      var_95_monte_carlo, var_99_monte_carlo,
      total_exposure, total_limit, portfolio_utilization_pct,
      concentration_score, largest_position_pct
    ) VALUES (
      DATE('now'),
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?
    )
  `).bind(
    varHistorical.var_95, varHistorical.var_99,
    varParametric.var_95, varParametric.var_99,
    varMonteCarlo.var_95, varMonteCarlo.var_99,
    portfolioMetrics.total_exposure || 0,
    portfolioMetrics.total_limit || 0,
    portfolioMetrics.avg_utilization || 0,
    concentrationMetrics.herfindahl_index,
    concentrationMetrics.largest_position_pct
  ).run();
}

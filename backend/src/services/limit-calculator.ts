// Limit Calculation Engine - Complete Laravel Port
// Implements parent-child aggregation, exemptions, cumulative tracking, and diminishing balance

interface MarketLimit {
  market_location: string;
  commodity_code: string;
  child_code: string;
  contract_name: string;
  contract_month: string;
  contract_size: number;
  reporting_limit_code: string;
  aggregate_1_positive_correlation: string;
  aggregate_2_negative_correlation: string;
  limit_lots: number;
  spot_month_conditional_limit: number;
  base_delta_notnl_nd: number;
  total_sale: number;
  total_buy: number;
  frequency: number;
  exchange: string;
  transaction_exchange: string;
}

interface Exemption {
  exemption_month: number;
}

export function getPrioritization(utilization: number, hasExemption: boolean = false): string {
  if (utilization >= 100) {
    return hasExemption ? 'Exemption Breached' : 'Breached';
  }
  if (utilization >= 80) return 'High Risk';
  if (utilization >= 60) return 'Early Warning';
  return 'Monitor';
}

// Apply diminishing balance logic for contracts that decrease over time
// Per CFTC spec: Position limits proportionally decrease as contract month progresses
function applyDiminishingBalance(
  position: number,
  contractMonth: string,
  calculationDate: Date = new Date()
): { diminishedPosition: number; diminishingFactor: number } {
  const contractDate = new Date(contractMonth);
  const year = contractDate.getFullYear();
  const month = contractDate.getMonth();

  // Get days in the contract month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Get current day of calculation
  const calcDay = calculationDate.getDate();

  // If calculation date is not in the contract month, no diminishing applies
  if (calculationDate.getFullYear() !== year || calculationDate.getMonth() !== month) {
    return { diminishedPosition: position, diminishingFactor: 1.0 };
  }

  // Calculate days remaining in month
  const daysRemaining = daysInMonth - calcDay + 1; // +1 to include current day

  // Calculate diminishing factor: days_remaining / days_in_month
  const diminishingFactor = daysRemaining / daysInMonth;

  // Apply factor to position
  const diminishedPosition = Math.floor(position * diminishingFactor);

  return { diminishedPosition, diminishingFactor };
}

// Get contract months for different limit types
async function getContractMonths(db: any, limitType: number): Promise<string[]> {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

  if (limitType === 1 || limitType === 3) {
    // Spot month or all month
    return [nextMonthStr];
  } else if (limitType === 4) {
    // Spot Plus Month - contract month is current + 2 months
    const spotPlusMonth = new Date();
    spotPlusMonth.setMonth(spotPlusMonth.getMonth() + 2);
    const spotPlusMonthStr = `${spotPlusMonth.getFullYear()}-${String(spotPlusMonth.getMonth() + 1).padStart(2, '0')}-01`;
    return [spotPlusMonthStr];
  } else if (limitType === 2) {
    // One month - get distinct contract months beyond spot
    const result = await db.prepare(`
      SELECT DISTINCT contract_month
      FROM temp_transactions
      WHERE contract_month > ?
      ORDER BY contract_month
    `).bind(nextMonthStr).all();

    return result.results?.map((r: any) => r.contract_month) || [];
  }

  return [nextMonthStr];
}

// Get today's lookup_id from monthly_schedules for conditional limits
async function getTodayLookupId(db: any): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const result = await db.prepare(`
    SELECT lookup_id
    FROM monthly_schedules
    WHERE dated = ?
  `).bind(today).first();

  return result?.lookup_id || 0;
}

// Get limit exemption for a commodity
async function getLimitExemption(
  db: any,
  commodityCode: string,
  limitType: number,
  isPositive: boolean
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const typeMap: {[key: number]: string} = {
    1: 'spot_month',
    2: 'one_month',
    3: 'all_month',
    4: 'spot_month' // Spot Plus uses same exemption column as Spot Month
  };

  const direction = isPositive ? 'buy' : 'sell';
  const column = `exemption_${direction}_${typeMap[limitType]}`;

  const result = await db.prepare(`
    SELECT ${column} as exemption_month
    FROM limit_exemptions
    WHERE commodity_code = ?
    AND start_date <= ?
    AND end_date >= ?
    AND deleted_at IS NULL
  `).bind(commodityCode, today, today).first();

  return result?.exemption_month || 0;
}

// Calculate positions for a specific type (parent, pos_child, nag_child)
async function calculatePositions(
  db: any,
  type: 'parent' | 'pos_child' | 'nag_child',
  contractMonths: string[],
  limitType: number,
  exchangeId?: number
): Promise<void> {
  const asOfDate = new Date().toISOString().split('T')[0];

  // Get today's lookup_id for conditional limits
  const lookupId = await getTodayLookupId(db);

  // Determine which correlation column to use
  let reportingCodeCol = '';
  let joinCondition = '';

  if (type === 'parent') {
    reportingCodeCol = 'm.aggregate_1_positive_correlation';
    joinCondition = `
      m.aggregate_1_positive_correlation = m.commodity_code
      AND m.aggregate_2_negative_correlation IS NULL
    `;
  } else if (type === 'pos_child') {
    reportingCodeCol = 'm.aggregate_1_positive_correlation';
    joinCondition = `
      m.aggregate_1_positive_correlation <> m.commodity_code
      AND m.aggregate_1_positive_correlation IS NOT NULL
    `;
  } else if (type === 'nag_child') {
    reportingCodeCol = 'm.aggregate_2_negative_correlation';
    joinCondition = `
      m.aggregate_2_negative_correlation <> m.commodity_code
      AND m.aggregate_2_negative_correlation IS NOT NULL
    `;
  }

  // Determine limit column
  let limitCol = '';
  let operator = '=';

  if (limitType === 1 || limitType === 4) {
    // Both Spot Month and Spot Plus Month use spot_month_limit
    limitCol = 'ml.spot_month_limit';
  } else if (limitType === 2) {
    limitCol = 'ml.single_month_accountability_level';
  } else if (limitType === 3) {
    limitCol = 'ml.all_month_accountability_level';
    operator = '>=';
  } else {
    throw new Error(`Invalid limit type: ${limitType}. Expected 1-4.`);
  }

  for (const contractMonth of contractMonths) {
    const date = new Date(contractMonth);
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth() + 1;

    // Build the query - include both regular and conditional limits
    let query = `
      SELECT
        m.market_location,
        tt.base_delta_notnl_nd,
        tt.total_sale,
        tt.total_buy,
        tt.contract_month,
        ml.contract_size,
        ${reportingCodeCol} as reporting_limit_code,
        m.commodity_code as child_code,
        m.contract_name,
        m.aggregate_1_positive_correlation,
        m.aggregate_2_negative_correlation,
        ${limitCol} as limit_lots,
        ml.spot_month_conditional_limit,
        ml.exchange_code as exchange,
        e.exchange_name,
        tt.frequency,
        tt.exchange as transaction_exchange
      FROM temp_transactions tt
      INNER JOIN mapping m ON m.market_location = tt.market_location
        AND ${joinCondition}
      INNER JOIN market_limits ml ON m.commodity_code = ml.commodity_code
        AND m.contract_name = ml.contract_name
      LEFT JOIN exchanges e ON ml.exchange_id = e.id
      WHERE m.unit_of_trading = 'MMBtu'
        AND tt.contract_month ${operator} ?
        AND m.deleted_at IS NULL
    `;

    // Add exchange filter if provided
    const queryParams: any[] = [contractMonth];
    if (exchangeId !== undefined) {
      if (!Number.isInteger(exchangeId) || exchangeId <= 0) {
        throw new Error(`Invalid exchange ID: ${exchangeId}. Expected positive integer.`);
      }
      query += ` AND ml.exchange_id = ?`;
      queryParams.push(exchangeId);
    }

    const marketLimits = await db.prepare(query).bind(...queryParams).all();

    if (!marketLimits.results || marketLimits.results.length === 0) continue;

    for (const marketLimit of marketLimits.results) {
      const ml = marketLimit as MarketLimit;

      // Validate critical fields exist
      if (!ml.contract_month || !ml.reporting_limit_code || !ml.child_code) {
        console.warn('[CALC] Skipping invalid market limit record - missing critical fields:', {
          contract_month: ml.contract_month,
          reporting_limit_code: ml.reporting_limit_code,
          child_code: ml.child_code
        });
        continue;
      }

      let spotMonthTypes = 1; // Default spot month limit
      const currentUpdate = ml.base_delta_notnl_nd || 0;

      // Get base limit
      let limitLots = ml.limit_lots || 0;

      // Check for conditional CME limits (for spot month and spot plus month)
      if ((limitType === 1 || limitType === 4) && ml.exchange === 'CME' && [4, 5, 6, 7].includes(lookupId)) {
        // Use conditional limit instead
        limitLots = ml.spot_month_conditional_limit || limitLots;
        spotMonthTypes = 2; // Conditional limit
      }

      // For children, get limit from parent commodity
      if (type !== 'parent') {
        const parentLimit = await db.prepare(`
          SELECT ${limitCol} as limit_lots, spot_month_conditional_limit, exchange_code as exchange
          FROM market_limits
          WHERE commodity_code = ?
        `).bind(ml.reporting_limit_code).first();

        limitLots = parentLimit?.limit_lots || 0;

        // Apply conditional limit for parent if applicable
        if ((limitType === 1 || limitType === 4) && parentLimit?.exchange === 'CME' && [4, 5, 6, 7].includes(lookupId)) {
          limitLots = parentLimit?.spot_month_conditional_limit || limitLots;
          spotMonthTypes = 2; // Conditional limit
        }
      }

      let limitLots1 = limitLots;
      let limitExemption = 0;
      let hasExemption = false;

      // Apply exemptions
      if (currentUpdate !== 0) {
        const isPositive = currentUpdate > 0;
        limitExemption = await getLimitExemption(db, ml.reporting_limit_code, limitType, isPositive);

        if (limitExemption > 0) {
          hasExemption = true;
          limitLots1 += limitExemption;

          // Update spot_month_types for exemptions (applies to both spot and spot plus)
          if (limitType === 1 || limitType === 4) {
            if (isPositive) {
              spotMonthTypes = spotMonthTypes === 2 ? 5 : 3; // 3=exemption buy, 5=conditional+exemption buy
            } else {
              spotMonthTypes = spotMonthTypes === 2 ? 6 : 4; // 4=exemption sell, 6=conditional+exemption sell
            }
          }
        }
      }

      // Get previous position for cumulative tracking
      const previous = await db.prepare(`
        SELECT id, pos_lots, as_of_date
        FROM limit_calculations
        WHERE child_code = ?
          AND reporting_limit_code = ?
          AND is_active = 1
          AND limit_type = ?
          AND strftime('%Y', contract_month) = ?
          AND strftime('%m', contract_month) = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(
        ml.child_code,
        ml.reporting_limit_code,
        limitType,
        currentYear.toString(),
        String(currentMonth).padStart(2, '0')
      ).first();

      let posLots = currentUpdate;

      if (previous) {
        // Only accumulate if it's the same as_of_date
        // Normalize both dates to handle different formats (DATE vs DATETIME)
        const previousDate = previous.as_of_date.split('T')[0].split(' ')[0];
        const currentDate = asOfDate.split('T')[0].split(' ')[0];

        if (previousDate === currentDate) {
          posLots = currentUpdate + (previous.pos_lots || 0);
        }

        // Deactivate previous record with optimistic locking
        const updateResult = await db.prepare(`
          UPDATE limit_calculations
          SET is_active = 0
          WHERE id = ? AND is_active = 1
        `).bind(previous.id).run();

        // If no rows updated, another process already handled this
        if (updateResult.meta.changes === 0) {
          console.warn(`[CALC] Concurrent modification detected for position ${ml.child_code}`);
          continue; // Skip this calculation
        }
      }

      // Apply diminishing balance for natural gas contracts (NG commodity code)
      // Diminishing balance applies to spot month only (limit_type === 1)
      // Per CFTC regulations: BOTH position AND limit decrease proportionally
      let diminishingFactor = 1.0;
      let originalPosLots = posLots;
      if (limitType === 1 && ml.reporting_limit_code === 'NG') {
        const result = applyDiminishingBalance(posLots, ml.contract_month, new Date());
        posLots = result.diminishedPosition;
        diminishingFactor = result.diminishingFactor;

        // Also apply diminishing factor to limits
        limitLots = Math.floor(limitLots * diminishingFactor);
        limitLots1 = Math.floor(limitLots1 * diminishingFactor);
      }

      // Calculate utilization
      const posPct = limitLots1 > 0 ? (posLots / limitLots1) * 100 : 0;

      // Calculate total position lots
      let totalPosLots = posLots;

      if (ml.reporting_limit_code !== ml.child_code) {
        // This is a child, totalPosLots = pos_lots
        totalPosLots = posLots;
      } else {
        // This is a parent, add up all children
        // Use pos_lots (not total_pos_lots) to avoid recursive totaling
        const childrenSum = await db.prepare(`
          SELECT SUM(pos_lots) as sum
          FROM limit_calculations
          WHERE child_code <> ?
            AND reporting_limit_code = ?
            AND is_active = 1
            AND limit_type = ?
            AND strftime('%Y', contract_month) = ?
            AND strftime('%m', contract_month) = ?
        `).bind(
          ml.child_code,
          ml.reporting_limit_code,
          limitType,
          currentYear.toString(),
          String(currentMonth).padStart(2, '0')
        ).first();

        totalPosLots = posLots + (childrenSum?.sum || 0);
      }

      const totalPosPct = limitLots1 > 0 ? (totalPosLots / limitLots1) * 100 : 0;
      const prioritization = getPrioritization(totalPosPct, hasExemption);

      // Insert new record
      await db.prepare(`
        INSERT INTO limit_calculations (
          mkt_index, as_of_date, contract_month, reporting_limit_code, child_code,
          limit_lots, limit_exemption, lot_size, current_update, total_sale, total_buy,
          pos_lots, pos_pct, total_pos_lots, total_pos_pct, prioritization,
          is_parent, frequency, spot_month_types, limit_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        ml.market_location,
        asOfDate,
        ml.contract_month,
        ml.reporting_limit_code,
        ml.child_code,
        limitLots,
        limitExemption,
        ml.contract_size || 0,
        currentUpdate,
        ml.total_sale || 0,
        ml.total_buy || 0,
        posLots,
        Math.round(posPct * 100000000) / 100000000,
        totalPosLots,
        Math.round(totalPosPct * 100000000) / 100000000,
        prioritization,
        type === 'parent' ? 1 : 0,
        ml.frequency || 0,
        spotMonthTypes,
        limitType
      ).run();
    }
  }
}

// Handle orphan parent records
async function createOrphanParents(db: any, limitType: number): Promise<void> {
  const asOfDate = new Date().toISOString().split('T')[0];

  // Find reporting codes that only have children (no parent record)
  const orphans = await db.prepare(`
    SELECT DISTINCT
      m.market_location,
      lc.contract_month,
      lc.reporting_limit_code,
      lc.reporting_limit_code as child_code,
      lc.limit_lots,
      lc.limit_exemption,
      lc.lot_size,
      lc.total_sale,
      lc.total_buy,
      lc.total_pos_lots,
      lc.total_pos_pct,
      lc.prioritization,
      lc.limit_type,
      lc.is_active
    FROM limit_calculations lc
    LEFT JOIN mapping m ON m.commodity_code = lc.reporting_limit_code
    WHERE lc.limit_type = ?
      AND lc.is_active = 1
      AND lc.reporting_limit_code IN (
        SELECT reporting_limit_code
        FROM limit_calculations
        WHERE limit_type = ? AND is_active = 1
        GROUP BY reporting_limit_code
        HAVING COUNT(*) = 1 AND MAX(child_code) <> reporting_limit_code
      )
  `).bind(limitType, limitType).all();

  if (!orphans.results) return;

  for (const orphan of orphans.results) {
    await db.prepare(`
      INSERT INTO limit_calculations (
        mkt_index, as_of_date, contract_month, reporting_limit_code, child_code,
        limit_lots, limit_exemption, lot_size, current_update, total_sale, total_buy,
        pos_lots, pos_pct, total_pos_lots, total_pos_pct, prioritization,
        is_parent, limit_type, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, 0, ?, ?, ?, 1, ?, 1)
    `).bind(
      orphan.market_location,
      asOfDate,
      orphan.contract_month,
      orphan.reporting_limit_code,
      orphan.child_code,
      orphan.limit_lots,
      orphan.limit_exemption,
      orphan.lot_size,
      orphan.total_sale,
      orphan.total_buy,
      orphan.total_pos_lots,
      orphan.total_pos_pct,
      orphan.prioritization,
      orphan.limit_type
    ).run();
  }
}

// Calculate spot month limits
export async function calculateSpotMonthLimits(db: any, exchangeId?: number): Promise<number> {
  console.log(`Starting Spot Month calculations${exchangeId ? ` for exchange ${exchangeId}` : ' (all exchanges)'}...`);
  const limitType = 1;

  try {
    const contractMonths = await getContractMonths(db, limitType);
    console.log(`Contract months: ${contractMonths.join(', ')}`);

    // Three-pass calculation
    await calculatePositions(db, 'pos_child', contractMonths, limitType, exchangeId);
    await calculatePositions(db, 'nag_child', contractMonths, limitType, exchangeId);
    await calculatePositions(db, 'parent', contractMonths, limitType, exchangeId);

    // Handle orphan parents
    await createOrphanParents(db, limitType);

    const count = await db.prepare(`
      SELECT COUNT(*) as count
      FROM limit_calculations
      WHERE limit_type = ? AND is_active = 1
    `).bind(limitType).first();

    console.log(`Calculated ${count?.count || 0} spot month limits`);
    return count?.count || 0;
  } catch (error: any) {
    console.error('Spot month calculation error:', error);
    throw error;
  }
}

// Calculate one month limits
export async function calculateOneMonthLimits(db: any, exchangeId?: number): Promise<number> {
  console.log(`Starting One Month calculations${exchangeId ? ` for exchange ${exchangeId}` : ' (all exchanges)'}...`);
  const limitType = 2;

  try {
    const contractMonths = await getContractMonths(db, limitType);
    console.log(`Contract months: ${contractMonths.join(', ')}`);

    await calculatePositions(db, 'pos_child', contractMonths, limitType, exchangeId);
    await calculatePositions(db, 'nag_child', contractMonths, limitType, exchangeId);
    await calculatePositions(db, 'parent', contractMonths, limitType, exchangeId);
    await createOrphanParents(db, limitType);

    const count = await db.prepare(`
      SELECT COUNT(*) as count
      FROM limit_calculations
      WHERE limit_type = ? AND is_active = 1
    `).bind(limitType).first();

    console.log(`Calculated ${count?.count || 0} one month limits`);
    return count?.count || 0;
  } catch (error: any) {
    console.error('One month calculation error:', error);
    throw error;
  }
}

// Calculate all month limits
export async function calculateAllMonthLimits(db: any, exchangeId?: number): Promise<number> {
  console.log(`Starting All Month calculations${exchangeId ? ` for exchange ${exchangeId}` : ' (all exchanges)'}...`);
  const limitType = 3;

  try {
    const contractMonths = await getContractMonths(db, limitType);
    console.log(`Contract months: ${contractMonths.join(', ')}`);

    await calculatePositions(db, 'pos_child', contractMonths, limitType, exchangeId);
    await calculatePositions(db, 'nag_child', contractMonths, limitType, exchangeId);
    await calculatePositions(db, 'parent', contractMonths, limitType, exchangeId);
    await createOrphanParents(db, limitType);

    const count = await db.prepare(`
      SELECT COUNT(*) as count
      FROM limit_calculations
      WHERE limit_type = ? AND is_active = 1
    `).bind(limitType).first();

    console.log(`Calculated ${count?.count || 0} all month limits`);
    return count?.count || 0;
  } catch (error: any) {
    console.error('All month calculation error:', error);
    throw error;
  }
}

// Calculate spot plus month limits (limit_type = 4)
export async function calculateSpotPlusMonthLimits(db: any, exchangeId?: number): Promise<number> {
  console.log(`Starting Spot Plus Month calculations${exchangeId ? ` for exchange ${exchangeId}` : ' (all exchanges)'}...`);
  const limitType = 4;

  try {
    const contractMonths = await getContractMonths(db, limitType);
    console.log(`Contract months: ${contractMonths.join(', ')}`);

    // Three-pass calculation
    await calculatePositions(db, 'pos_child', contractMonths, limitType, exchangeId);
    await calculatePositions(db, 'nag_child', contractMonths, limitType, exchangeId);
    await calculatePositions(db, 'parent', contractMonths, limitType, exchangeId);

    // Handle orphan parents
    await createOrphanParents(db, limitType);

    const count = await db.prepare(`
      SELECT COUNT(*) as count
      FROM limit_calculations
      WHERE limit_type = ? AND is_active = 1
    `).bind(limitType).first();

    console.log(`Calculated ${count?.count || 0} spot plus month limits`);
    return count?.count || 0;
  } catch (error: any) {
    console.error('Spot plus month calculation error:', error);
    throw error;
  }
}

// Export to time series
export async function exportToTimeSeries(db: any): Promise<number> {
  console.log('Exporting to time series...');

  const result = await db.prepare(`
    INSERT INTO limit_calculation_series
    (mkt_index, contract_month, reporting_limit_code, pos_lots, limit_lots, pos_pct,
     prioritization, limit_type, as_of_date, is_parent, total_pos_lots, total_pos_pct,
     current_update, limit_exemption, lot_size, total_sale, total_buy, child_code, frequency)
    SELECT mkt_index, contract_month, reporting_limit_code, pos_lots, limit_lots, pos_pct,
     prioritization, limit_type, as_of_date, is_parent, total_pos_lots, total_pos_pct,
     current_update, limit_exemption, lot_size, total_sale, total_buy, child_code, frequency
    FROM limit_calculations
    WHERE is_active = 1
  `).run();

  console.log(`Exported ${result.meta.changes || 0} records to time series`);
  return result.meta.changes || 0;
}

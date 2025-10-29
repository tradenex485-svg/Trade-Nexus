/**
 * Position Aggregation Service
 * Handles cross-commodity aggregation, economic equivalence, and complex position calculations
 */

export interface AggregationGroup {
  id: number;
  group_code: string;
  group_name: string;
  group_type: string;
  aggregation_method: string;
  conversion_required: number;
}

export interface ComponentPosition {
  commodity_code: string;
  position: number;
  conversion_factor: number;
  equivalent_position: number;
  weight: number;
  contribution: number;
}

export interface AggregatedPositionResult {
  group_id: number;
  group_code: string;
  total_position: number;
  total_contracts: number;
  components: ComponentPosition[];
  applicable_limit?: number;
  utilization_pct?: number;
}

/**
 * Calculate aggregated positions for all active groups
 */
export async function calculateAllAggregatedPositions(
  db: any,
  companyId?: number
): Promise<number> {
  console.log('[AGGREGATION] Calculating aggregated positions...');

  // Get all active aggregation groups
  const groups = await db.prepare(`
    SELECT * FROM aggregation_groups
    WHERE is_active = 1
      AND (effective_from IS NULL OR effective_from <= DATE('now'))
      AND (effective_to IS NULL OR effective_to >= DATE('now'))
  `).all();

  let calculatedCount = 0;

  for (const group of groups.results) {
    try {
      const result = await calculateGroupAggregation(db, group.id, companyId);
      if (result) {
        await saveAggregatedPosition(db, result, companyId);
        calculatedCount++;
      }
    } catch (error) {
      console.error(`[AGGREGATION] Error calculating group ${group.group_code}:`, error);
    }
  }

  console.log(`[AGGREGATION] Calculated ${calculatedCount} aggregated positions`);
  return calculatedCount;
}

/**
 * Calculate aggregated position for a specific group
 */
export async function calculateGroupAggregation(
  db: any,
  groupId: number,
  companyId?: number
): Promise<AggregatedPositionResult | null> {
  // Get group details
  const group = await db.prepare(`
    SELECT * FROM aggregation_groups WHERE id = ?
  `).bind(groupId).first();

  if (!group) {
    return null;
  }

  // Get group members with their conversion factors
  const members = await db.prepare(`
    SELECT
      agm.*,
      ml.contract_name
    FROM aggregation_group_members agm
    LEFT JOIN market_limits ml ON agm.commodity_code = ml.commodity_code
    WHERE agm.group_id = ?
      AND agm.is_active = 1
    ORDER BY agm.is_primary DESC, agm.commodity_code
  `).bind(groupId).all();

  if (!members.results || members.results.length === 0) {
    return null;
  }

  // Get current positions for member commodities
  const commodityCodes = members.results.map((m: any) => m.commodity_code);
  const placeholders = commodityCodes.map(() => '?').join(',');

  let positionQuery = `
    SELECT
      reporting_limit_code as commodity_code,
      SUM(pos_lots) as total_position
    FROM limit_calculations
    WHERE is_active = 1
      AND is_parent = 1
      AND reporting_limit_code IN (${placeholders})
  `;

  const params = [...commodityCodes];

  if (companyId) {
    positionQuery += ` AND company_id = ?`;
    params.push(companyId);
  }

  positionQuery += ` GROUP BY reporting_limit_code`;

  const positions = await db.prepare(positionQuery).bind(...params).all();

  // Build position map
  const positionMap: Record<string, number> = {};
  for (const pos of positions.results) {
    positionMap[pos.commodity_code] = pos.total_position || 0;
  }

  // Calculate aggregated position based on method
  const components: ComponentPosition[] = [];
  let totalPosition = 0;
  let totalContracts = 0;

  for (const member of members.results) {
    const position = positionMap[member.commodity_code] || 0;
    const conversionFactor = member.conversion_factor || 1.0;
    const weight = member.weight || 1.0;

    let equivalentPosition = position;
    let contribution = position;

    switch (group.aggregation_method) {
      case 'simple_sum':
        // Just add positions
        contribution = position;
        break;

      case 'net_equivalent':
        // Convert to equivalent units and sum
        equivalentPosition = position * conversionFactor;
        contribution = equivalentPosition;
        break;

      case 'weighted_sum':
        // Apply weights and conversion
        equivalentPosition = position * conversionFactor;
        contribution = equivalentPosition * weight;
        break;

      case 'max_single':
        // Take maximum single position (don't sum)
        equivalentPosition = position * conversionFactor;
        contribution = 0; // Will be handled separately
        break;
    }

    components.push({
      commodity_code: member.commodity_code,
      position: position,
      conversion_factor: conversionFactor,
      equivalent_position: equivalentPosition,
      weight: weight,
      contribution: contribution,
    });

    if (group.aggregation_method !== 'max_single') {
      totalPosition += contribution;
    }
    totalContracts += Math.abs(position);
  }

  // For max_single, find the maximum
  if (group.aggregation_method === 'max_single') {
    const maxComponent = components.reduce((max, comp) =>
      Math.abs(comp.equivalent_position) > Math.abs(max.equivalent_position) ? comp : max
    );
    totalPosition = maxComponent.equivalent_position;
    maxComponent.contribution = maxComponent.equivalent_position;
  }

  return {
    group_id: group.id,
    group_code: group.group_code,
    total_position: totalPosition,
    total_contracts: totalContracts,
    components: components,
  };
}

/**
 * Save aggregated position to database
 */
async function saveAggregatedPosition(
  db: any,
  result: AggregatedPositionResult,
  companyId?: number
): Promise<void> {
  // Deactivate old calculations for this group
  await db.prepare(`
    UPDATE aggregated_positions
    SET is_active = 0
    WHERE group_id = ?
      AND (company_id = ? OR (company_id IS NULL AND ? IS NULL))
  `).bind(result.group_id, companyId || null, companyId || null).run();

  // Insert new calculation
  await db.prepare(`
    INSERT INTO aggregated_positions (
      group_id, group_code, company_id,
      total_position, total_contracts,
      component_count, components,
      calculation_method, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'auto', 1)
  `).bind(
    result.group_id,
    result.group_code,
    companyId || null,
    result.total_position,
    result.total_contracts,
    result.components.length,
    JSON.stringify(result.components)
  ).run();
}

/**
 * Get aggregated positions with filtering
 */
export async function getAggregatedPositions(
  db: any,
  filters: {
    group_code?: string;
    company_id?: number;
    limit?: number;
  }
): Promise<any[]> {
  let query = `SELECT * FROM v_aggregated_position_summary WHERE 1=1`;
  const params: any[] = [];

  if (filters.group_code) {
    query += ` AND group_code = ?`;
    params.push(filters.group_code);
  }

  if (filters.company_id) {
    query += ` AND company_id = ?`;
    params.push(filters.company_id);
  }

  query += ` ORDER BY utilization_pct DESC LIMIT ?`;
  params.push(filters.limit || 100);

  const result = await db.prepare(query).bind(...params).all();
  return result.results;
}

/**
 * Calculate economic equivalence between two commodities
 */
export async function calculateEconomicEquivalence(
  db: any,
  commodityA: string,
  commodityB: string,
  positionA: number
): Promise<number> {
  // Check for direct relationship
  const relationship = await db.prepare(`
    SELECT conversion_ratio
    FROM commodity_relationships
    WHERE commodity_a = ?
      AND commodity_b = ?
      AND conversion_ratio IS NOT NULL
      AND is_active = 1
    LIMIT 1
  `).bind(commodityA, commodityB).first();

  if (relationship && relationship.conversion_ratio) {
    return positionA * relationship.conversion_ratio;
  }

  // Check for relationship through aggregation group
  const groupMapping = await db.prepare(`
    SELECT
      a.conversion_factor as factor_a,
      b.conversion_factor as factor_b
    FROM aggregation_group_members a
    JOIN aggregation_group_members b ON a.group_id = b.group_id
    WHERE a.commodity_code = ?
      AND b.commodity_code = ?
      AND a.is_active = 1
      AND b.is_active = 1
    LIMIT 1
  `).bind(commodityA, commodityB).first();

  if (groupMapping) {
    // Convert A to group base, then to B
    const ratio = groupMapping.factor_a / groupMapping.factor_b;
    return positionA * ratio;
  }

  // No equivalence found
  return positionA; // 1:1 fallback
}

/**
 * Check if positions can be netted for spread treatment
 */
export async function checkSpreadNetting(
  db: any,
  commodityA: string,
  commodityB: string,
  positionA: number,
  positionB: number
): Promise<{
  eligible: boolean;
  nettedPosition: number;
  relationship?: any;
}> {
  // Check for spread relationship
  const relationship = await db.prepare(`
    SELECT *
    FROM commodity_relationships
    WHERE ((commodity_a = ? AND commodity_b = ?)
       OR (commodity_b = ? AND commodity_a = ? AND is_bidirectional = 1))
      AND relationship_type = 'spread'
      AND netting_allowed = 1
      AND is_active = 1
    LIMIT 1
  `).bind(commodityA, commodityB, commodityA, commodityB).first();

  if (!relationship) {
    return {
      eligible: false,
      nettedPosition: positionA + positionB,
    };
  }

  // Calculate netted position
  // If positions are opposite (one long, one short), they can net
  const sameDirection = (positionA > 0 && positionB > 0) || (positionA < 0 && positionB < 0);

  if (sameDirection) {
    // Can't net if positions in same direction
    return {
      eligible: false,
      nettedPosition: positionA + positionB,
      relationship,
    };
  }

  // Net the positions
  const nettedPosition = positionA + positionB;

  return {
    eligible: true,
    nettedPosition: nettedPosition,
    relationship,
  };
}

/**
 * Get commodity relationships for a specific commodity
 */
export async function getCommodityRelationships(
  db: any,
  commodityCode: string
): Promise<any[]> {
  const result = await db.prepare(`
    SELECT * FROM v_commodity_network
    WHERE commodity_a = ? OR commodity_b = ?
    ORDER BY relationship_type, commodity_a, commodity_b
  `).bind(commodityCode, commodityCode).all();

  return result.results;
}

/**
 * Get all aggregation groups
 */
export async function getAggregationGroups(db: any): Promise<any[]> {
  const result = await db.prepare(`
    SELECT
      ag.*,
      COUNT(agm.id) as member_count
    FROM aggregation_groups ag
    LEFT JOIN aggregation_group_members agm ON ag.id = agm.group_id AND agm.is_active = 1
    WHERE ag.is_active = 1
    GROUP BY ag.id
    ORDER BY ag.group_type, ag.group_name
  `).all();

  return result.results;
}

/**
 * Get members of an aggregation group
 */
export async function getGroupMembers(db: any, groupId: number): Promise<any[]> {
  const result = await db.prepare(`
    SELECT
      agm.*,
      ml.contract_name,
      ml.spot_month_limit
    FROM aggregation_group_members agm
    LEFT JOIN market_limits ml ON agm.commodity_code = ml.commodity_code
    WHERE agm.group_id = ?
      AND agm.is_active = 1
    ORDER BY agm.is_primary DESC, agm.commodity_code
  `).bind(groupId).all();

  return result.results;
}

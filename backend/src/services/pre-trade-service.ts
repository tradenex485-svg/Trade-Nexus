/**
 * Pre-Trade Validation Service
 * Validates trades against position limits before execution
 * Enhanced with ICE, CFTC, CME, NYMEX regulatory compliance
 */

import {
  checkRegulatoryCompliance,
  recordBreachEvent,
  type ComplianceCheckResult,
  type RegulatoryViolation,
} from './regulatory-compliance';

export interface TradeInput {
  userId?: number;
  companyId?: number;
  marketLocation: string;
  commodityCode: string;
  contractMonth: string;
  tradeSide: 'BUY' | 'SELL';
  quantity: number;
  limitType: number; // 1=Spot, 2=One Month, 3=All Month
  exchangeId?: number; // Optional: specify exchange for rule enforcement
}

export interface ValidationResult {
  checkId?: number;
  validationStatus: 'approved' | 'requires_approval' | 'blocked';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  canProceed: boolean;

  currentPosition: number;
  currentLimit: number;
  currentUtilization: number;

  projectedPosition: number;
  projectedUtilization: number;

  utilizationChange: number;
  thresholdReached: string;
  requiresApproval: boolean;
  blockReason?: string;
  notes?: string;

  // Regulatory compliance fields
  regulatoryCompliant?: boolean;
  regulatoryViolations?: RegulatoryViolation[];
  regulatoryWarnings?: any[];
  reportable?: boolean;
  applicableRules?: any[];
}

/**
 * Get current position for a market location
 */
async function getCurrentPosition(
  db: any,
  marketLocation: string,
  contractMonth: string,
  limitType: number
): Promise<{ position: number; limit: number; utilization: number }> {
  // Query limit_calculations for current state
  const result = await db
    .prepare(
      `
    SELECT pos_lots, limit_lots, pos_pct
    FROM limit_calculations
    WHERE mkt_index = ?
      AND contract_month = ?
      AND limit_type = ?
      AND is_active = 1
    LIMIT 1
  `
    )
    .bind(marketLocation, contractMonth, limitType)
    .first();

  if (!result) {
    return { position: 0, limit: 0, utilization: 0 };
  }

  return {
    position: result.pos_lots || 0,
    limit: result.limit_lots || 0,
    utilization: result.pos_pct || 0,
  };
}

/**
 * Calculate projected position after trade
 */
function calculateProjectedPosition(
  currentPosition: number,
  tradeSide: 'BUY' | 'SELL',
  quantity: number
): number {
  if (tradeSide === 'BUY') {
    return currentPosition + quantity;
  } else {
    return currentPosition - quantity;
  }
}

/**
 * Get risk thresholds from database
 */
async function getRiskThresholds(db: any): Promise<any[]> {
  const result = await db
    .prepare(
      `
    SELECT * FROM risk_thresholds
    WHERE is_active = 1
    ORDER BY min_utilization_pct ASC
  `
    )
    .all();

  return result.results || [];
}

/**
 * Determine validation status based on projected utilization
 */
function determineValidationStatus(
  projectedUtilization: number,
  thresholds: any[]
): {
  status: 'approved' | 'requires_approval' | 'blocked';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  thresholdReached: string;
  requiresApproval: boolean;
} {
  for (const threshold of thresholds) {
    if (
      projectedUtilization >= threshold.min_utilization_pct &&
      projectedUtilization < threshold.max_utilization_pct
    ) {
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (projectedUtilization < 50) riskLevel = 'low';
      else if (projectedUtilization < 75) riskLevel = 'medium';
      else if (projectedUtilization < 90) riskLevel = 'high';
      else riskLevel = 'critical';

      return {
        status: threshold.threshold_type,
        riskLevel,
        thresholdReached: threshold.threshold_name,
        requiresApproval: threshold.threshold_type === 'require_approval',
      };
    }
  }

  // Default to block if no threshold matches
  return {
    status: 'blocked',
    riskLevel: 'critical',
    thresholdReached: 'Exceeded Maximum',
    requiresApproval: false,
  };
}

/**
 * Main pre-trade validation function with regulatory compliance
 */
export async function validateTrade(
  db: any,
  tradeInput: TradeInput
): Promise<ValidationResult> {
  try {
    // 1. Get current position
    const current = await getCurrentPosition(
      db,
      tradeInput.marketLocation,
      tradeInput.contractMonth,
      tradeInput.limitType
    );

    // 2. Calculate projected position
    const projectedPosition = calculateProjectedPosition(
      current.position,
      tradeInput.tradeSide,
      tradeInput.quantity
    );

    // 3. Calculate projected utilization
    const projectedUtilization =
      current.limit > 0 ? (Math.abs(projectedPosition) / current.limit) * 100 : 0;

    // 4. Get risk thresholds (legacy method)
    const thresholds = await getRiskThresholds(db);

    // 5. Determine validation status (legacy method)
    const validation = determineValidationStatus(projectedUtilization, thresholds);

    // 6. NEW: Check against exchange-specific regulatory rules
    const limitCategory =
      tradeInput.limitType === 1 ? 'spot_month' : tradeInput.limitType === 2 ? 'single_month' : 'all_month';

    const complianceCheck = await checkRegulatoryCompliance(db, {
      commodityCode: tradeInput.commodityCode,
      marketLocation: tradeInput.marketLocation,
      limitCategory,
      currentPosition: current.position,
      projectedPosition,
      exchangeId: tradeInput.exchangeId,
      companyId: tradeInput.companyId,
      traderId: tradeInput.userId,
    });

    // 7. Determine final validation status (regulatory rules take precedence)
    let finalStatus = validation.status;
    let finalRiskLevel = validation.riskLevel;
    let blockReason: string | undefined;
    let canProceed = validation.status !== 'blocked';

    if (!complianceCheck.compliant) {
      // Regulatory violation - apply enforcement action
      const criticalViolation = complianceCheck.violations.find((v) => v.severity === 'critical');

      if (criticalViolation) {
        if (criticalViolation.enforcement_action === 'block_trade') {
          finalStatus = 'blocked';
          canProceed = false;
          blockReason = criticalViolation.message;
        } else if (criticalViolation.enforcement_action === 'require_approval') {
          finalStatus = 'requires_approval';
          canProceed = false;
        }
        finalRiskLevel = criticalViolation.severity;
      } else if (complianceCheck.violations.length > 0) {
        // Non-critical violation - require approval
        const highViolation = complianceCheck.violations.find((v) => v.severity === 'high');
        if (highViolation && highViolation.enforcement_action === 'require_approval') {
          finalStatus = 'requires_approval';
          finalRiskLevel = 'high';
        }
      }

      // Record breach events for all violations
      for (const violation of complianceCheck.violations) {
        await recordBreachEvent(db, {
          company_id: tradeInput.companyId,
          trader_id: tradeInput.userId,
          regulatory_rule_id: violation.rule_id,
          breach_type: violation.violation_type,
          commodity_code: tradeInput.commodityCode,
          market_location: tradeInput.marketLocation,
          contract_month: tradeInput.contractMonth,
          limit_type: tradeInput.limitType,
          position_lots: projectedPosition,
          limit_value: violation.limit_value,
          utilization_pct: violation.utilization_pct,
          breach_amount: violation.excess_amount,
          severity: violation.severity,
          metadata: {
            rule_code: violation.rule_code,
            rule_reference: violation.rule_reference,
            enforcement_action: violation.enforcement_action,
            trade_side: tradeInput.tradeSide,
            quantity: tradeInput.quantity,
          },
        });
      }
    }

    // 8. Build comprehensive result with regulatory compliance data
    const result: ValidationResult = {
      validationStatus: finalStatus,
      riskLevel: finalRiskLevel,
      canProceed,

      currentPosition: current.position,
      currentLimit: current.limit,
      currentUtilization: current.utilization,

      projectedPosition,
      projectedUtilization,

      utilizationChange: projectedUtilization - current.utilization,
      thresholdReached: validation.thresholdReached,
      requiresApproval: finalStatus === 'requires_approval',
      blockReason,

      // Regulatory compliance fields
      regulatoryCompliant: complianceCheck.compliant,
      regulatoryViolations: complianceCheck.violations,
      regulatoryWarnings: complianceCheck.warnings,
      reportable: complianceCheck.reportable,
      applicableRules: complianceCheck.applicable_rules,
    };

    // Add block reason if not set by regulatory check
    if (!blockReason && finalStatus === 'blocked') {
      result.blockReason = `Trade would result in ${projectedUtilization.toFixed(
        1
      )}% utilization, exceeding the maximum allowed`;
    }

    // 9. Save validation check to database
    const checkId = await savePreTradeCheck(db, tradeInput, result);
    result.checkId = checkId;

    // 10. Log regulatory compliance check
    if (complianceCheck.violations.length > 0) {
      console.log(
        `[REGULATORY COMPLIANCE] Pre-trade check #${checkId}: ${complianceCheck.violations.length} violation(s) detected for ${tradeInput.commodityCode} ${limitCategory}`
      );
    }

    return result;
  } catch (error: any) {
    console.error('Pre-trade validation error:', error);
    throw new Error(`Validation failed: ${error.message}`);
  }
}

/**
 * Save pre-trade check to database
 */
async function savePreTradeCheck(
  db: any,
  tradeInput: TradeInput,
  validationResult: ValidationResult
): Promise<number> {
  const result = await db
    .prepare(
      `
    INSERT INTO pre_trade_checks (
      user_id, market_location, commodity_code, contract_month, trade_side, quantity, limit_type,
      current_position, current_limit, current_utilization_pct,
      projected_position, projected_utilization_pct,
      validation_status, risk_level, can_proceed,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .bind(
      tradeInput.userId || null,
      tradeInput.marketLocation,
      tradeInput.commodityCode,
      tradeInput.contractMonth,
      tradeInput.tradeSide,
      tradeInput.quantity,
      tradeInput.limitType,
      validationResult.currentPosition,
      validationResult.currentLimit,
      validationResult.currentUtilization,
      validationResult.projectedPosition,
      validationResult.projectedUtilization,
      validationResult.validationStatus,
      validationResult.riskLevel,
      validationResult.canProceed ? 1 : 0,
      validationResult.blockReason || validationResult.notes || null
    )
    .run();

  return result.meta.last_row_id;
}

/**
 * Batch validate multiple trades
 */
export async function batchValidateTrades(
  db: any,
  trades: TradeInput[]
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const trade of trades) {
    try {
      const result = await validateTrade(db, trade);
      results.push(result);
    } catch (error: any) {
      results.push({
        validationStatus: 'blocked',
        riskLevel: 'critical',
        canProceed: false,
        currentPosition: 0,
        currentLimit: 0,
        currentUtilization: 0,
        projectedPosition: 0,
        projectedUtilization: 0,
        utilizationChange: 0,
        thresholdReached: 'Error',
        requiresApproval: false,
        blockReason: error.message,
      });
    }
  }

  return results;
}

/**
 * Get validation check history
 */
export async function getValidationHistory(
  db: any,
  filters?: {
    userId?: number;
    status?: string;
    startDate?: string;
    limit?: number;
  }
): Promise<any[]> {
  let query = `
    SELECT ptc.*, u.name as user_name
    FROM pre_trade_checks ptc
    LEFT JOIN users u ON ptc.user_id = u.id
    WHERE 1=1
  `;

  const bindings: any[] = [];

  if (filters?.userId) {
    query += ` AND ptc.user_id = ?`;
    bindings.push(filters.userId);
  }

  if (filters?.status) {
    query += ` AND ptc.validation_status = ?`;
    bindings.push(filters.status);
  }

  if (filters?.startDate) {
    query += ` AND DATE(ptc.created_at) >= DATE(?)`;
    bindings.push(filters.startDate);
  }

  query += ` ORDER BY ptc.created_at DESC LIMIT ?`;
  bindings.push(filters?.limit || 100);

  const result = await db.prepare(query).bind(...bindings).all();

  return result.results || [];
}

/**
 * Get validation statistics
 */
export async function getValidationStats(
  db: any,
  days: number = 7
): Promise<any> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  const stats = await db
    .prepare(
      `
    SELECT
      COUNT(*) as total_checks,
      SUM(CASE WHEN validation_status = 'approved' THEN 1 ELSE 0 END) as auto_approved,
      SUM(CASE WHEN validation_status = 'requires_approval' THEN 1 ELSE 0 END) as requires_approval,
      SUM(CASE WHEN validation_status = 'blocked' THEN 1 ELSE 0 END) as blocked,
      AVG(projected_utilization_pct) as avg_projected_utilization
    FROM pre_trade_checks
    WHERE DATE(created_at) >= DATE(?)
  `
    )
    .bind(cutoffDateStr)
    .first();

  return stats;
}

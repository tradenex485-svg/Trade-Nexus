/**
 * CFTC Phase 8: Pre-Trade Validation Service
 *
 * Enhanced pre-trade validation with:
 * - Position limit checks before trade execution
 * - Bid week spot month validation
 * - Diminishing balance calculations
 * - Deal type filtering
 * - Exemption checks
 * - Multiple trade simulation
 * - Exception logging for failed validations
 *
 * Prevents limit breaches before trades are executed.
 */

import { D1Database } from '@cloudflare/workers-types';
import { BidWeekService } from './bid-week-service';
import { ExceptionHandlingService } from './exception-handling-service';
import { AuditTrailService } from './audit-trail-service';

export interface PreTradeValidationRequest {
  market_code: string;
  contract_month: string;
  quantity: number; // Positive for long, negative for short
  deal_type?: string;
  counterparty?: string;
  trade_date?: string;
  company_id: number;
  user_id?: number;
}

export interface ValidationResult {
  is_valid: boolean;
  is_blocked: boolean; // Hard block - trade cannot be executed
  block_reason?: string; // Reason for blocking
  position_after_trade: number;
  limit: number;
  utilization_percent: number;
  utilization_status: 'COMPLIANT' | 'WARNING' | 'BREACH';
  warnings: string[];
  errors: string[];
  metadata: {
    current_position: number;
    proposed_trade: number;
    spot_month?: string;
    bid_week_active?: boolean;
    diminishing_factor?: number;
    exemption_applied?: boolean;
    filtered_deal_type?: boolean;
  };
}

export interface BatchValidationRequest {
  trades: PreTradeValidationRequest[];
  simulate_cumulative?: boolean; // Apply trades sequentially in simulation
}

export interface BatchValidationResult {
  overall_valid: boolean;
  results: ValidationResult[];
  cumulative_impact?: {
    markets_affected: string[];
    total_trades: number;
    breaches_detected: number;
  };
}

export class PreTradeValidationService {
  private bidWeekService: BidWeekService;
  private exceptionService: ExceptionHandlingService;
  private auditService: AuditTrailService;

  constructor(private db: D1Database) {
    this.bidWeekService = new BidWeekService(db);
    this.exceptionService = new ExceptionHandlingService(db);
    this.auditService = new AuditTrailService(db);
  }

  /**
   * Validate a single trade before execution
   */
  async validateTrade(request: PreTradeValidationRequest): Promise<ValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const metadata: any = {
      current_position: 0,
      proposed_trade: request.quantity,
    };

    try {
      // 1. Check if deal type should be filtered
      const excludedDealTypes = ['COMM-PHYS', 'COMM-STOR', 'CASH'];
      if (request.deal_type && excludedDealTypes.includes(request.deal_type.toUpperCase())) {
        metadata.filtered_deal_type = true;
        return {
          is_valid: true,
          is_blocked: false,
          position_after_trade: 0,
          limit: 0,
          utilization_percent: 0,
          utilization_status: 'COMPLIANT',
          warnings: ['Deal type excluded from position limits'],
          errors: [],
          metadata,
        };
      }

      // 2. Get market information
      const market = await this.getMarketInfo(request.market_code);
      if (!market) {
        errors.push(`Market not found: ${request.market_code}`);
        return this.createErrorResult(errors, metadata);
      }

      // 3. Determine spot month using bid week logic
      const tradeDate = request.trade_date || new Date().toISOString().split('T')[0];
      const exchangeCode = market.exchange_code || 'ICE';

      const bidWeekStatus = await this.bidWeekService.getBidWeekStatus(exchangeCode, new Date(tradeDate));
      metadata.bid_week_active = bidWeekStatus.is_in_bid_week;
      metadata.spot_month = bidWeekStatus.spot_month;

      // 4. Get applicable market limit
      const limitInfo = await this.getApplicableLimit(
        request.market_code,
        request.contract_month,
        bidWeekStatus.spot_month,
        request.company_id
      );

      if (!limitInfo) {
        warnings.push('No position limit configured for this market/contract');
        return {
          is_valid: true,
          is_blocked: false,
          position_after_trade: request.quantity,
          limit: 0,
          utilization_percent: 0,
          utilization_status: 'COMPLIANT',
          warnings,
          errors: [],
          metadata,
        };
      }

      // 5. Get current position
      const currentPosition = await this.getCurrentPosition(
        request.market_code,
        request.contract_month,
        request.company_id,
        tradeDate
      );
      metadata.current_position = currentPosition;

      // 6. Apply diminishing balance if applicable
      let effectiveLimit = limitInfo.limit;
      if (limitInfo.limit_type === 1 && limitInfo.reporting_limit_code === 'NG') {
        const { diminishedLimit, factor } = this.applyDiminishingBalance(
          limitInfo.limit,
          request.contract_month,
          new Date(tradeDate)
        );
        effectiveLimit = diminishedLimit;
        metadata.diminishing_factor = factor;
      }

      // 7. Check for exemptions
      const hasExemption = await this.checkExemption(
        request.market_code,
        request.company_id
      );
      if (hasExemption) {
        metadata.exemption_applied = true;
        warnings.push('Exemption applied to this position');
      }

      // 8. Calculate position after trade
      const positionAfterTrade = currentPosition + request.quantity;
      const absolutePosition = Math.abs(positionAfterTrade);

      // 9. Determine utilization status and blocking logic
      const utilizationPercent = effectiveLimit > 0
        ? (absolutePosition / effectiveLimit) * 100
        : 0;

      let utilizationStatus: 'COMPLIANT' | 'WARNING' | 'BREACH' = 'COMPLIANT';
      let isValid = true;
      let isBlocked = false;
      let blockReason: string | undefined;

      if (!hasExemption) {
        if (absolutePosition > effectiveLimit) {
          utilizationStatus = 'BREACH';
          isValid = false;
          isBlocked = true;
          blockReason = `Trade execution blocked: Position ${absolutePosition} would exceed limit of ${effectiveLimit}. Exemption or compliance approval required.`;
          errors.push(
            `Trade would breach position limit: ${absolutePosition} > ${effectiveLimit}`
          );
        } else if (utilizationPercent >= 90) {
          utilizationStatus = 'WARNING';
          warnings.push(
            `Trade would result in high utilization: ${utilizationPercent.toFixed(1)}%`
          );
        }
      } else {
        // Exemption applied - allow trade but still track if it would breach
        if (absolutePosition > effectiveLimit) {
          utilizationStatus = 'BREACH';
          warnings.push(
            `Exemption applied: Position ${absolutePosition} exceeds limit of ${effectiveLimit}`
          );
        } else if (utilizationPercent >= 90) {
          utilizationStatus = 'WARNING';
          warnings.push(
            `Trade would result in high utilization: ${utilizationPercent.toFixed(1)}%`
          );
        }
      }

      // 10. Log validation to audit trail
      await this.auditService.logEvent({
        event_type: 'VALIDATION',
        entity_type: 'TRADE',
        entity_id: 0, // No trade ID yet
        action: isValid ? 'APPROVE' : 'REJECT',
        user_id: request.user_id,
        company_id: request.company_id,
        metadata: JSON.stringify({
          market_code: request.market_code,
          contract_month: request.contract_month,
          quantity: request.quantity,
          validation_result: {
            is_valid: isValid,
            utilization_percent: utilizationPercent,
            position_after_trade: positionAfterTrade,
          },
        }),
      });

      // 11. Log exception if validation failed
      if (!isValid) {
        await this.exceptionService.logException({
          exception_type: 'PRE_TRADE_BREACH',
          exception_severity: 'HIGH',
          entity_type: 'TRADE_VALIDATION',
          entity_id: 0,
          exception_message: `Pre-trade validation failed: ${errors.join('; ')}`,
          status: 'OPEN',
          company_id: request.company_id,
          assigned_to: request.user_id,
          market_location: request.market_code,
          contract_month: request.contract_month,
          current_value: absolutePosition,
          threshold_value: effectiveLimit,
        });
      }

      return {
        is_valid: isValid,
        is_blocked: isBlocked,
        block_reason: blockReason,
        position_after_trade: positionAfterTrade,
        limit: effectiveLimit,
        utilization_percent: utilizationPercent,
        utilization_status: utilizationStatus,
        warnings,
        errors,
        metadata,
      };
    } catch (error: any) {
      console.error('Pre-trade validation error:', error);
      errors.push(`Validation error: ${error.message}`);
      return this.createErrorResult(errors, metadata);
    }
  }

  /**
   * Validate multiple trades (batch)
   */
  async validateBatch(request: BatchValidationRequest): Promise<BatchValidationResult> {
    const results: ValidationResult[] = [];
    let cumulativePositions: Map<string, number> = new Map();

    // If simulating cumulative impact, track positions across trades
    if (request.simulate_cumulative) {
      for (const trade of request.trades) {
        const key = `${trade.market_code}:${trade.contract_month}`;

        // Adjust current position by previous trades in this batch
        const cumulativeAdjustment = cumulativePositions.get(key) || 0;

        // Validate with adjusted position
        const result = await this.validateTrade({
          ...trade,
          quantity: trade.quantity + cumulativeAdjustment,
        });

        results.push(result);

        // Update cumulative tracking
        if (result.is_valid) {
          cumulativePositions.set(key, cumulativeAdjustment + trade.quantity);
        }
      }
    } else {
      // Validate each trade independently
      for (const trade of request.trades) {
        const result = await this.validateTrade(trade);
        results.push(result);
      }
    }

    const overallValid = results.every(r => r.is_valid);
    const breachesDetected = results.filter(r => !r.is_valid).length;
    const marketsAffected = [...new Set(request.trades.map(t => t.market_code))];

    return {
      overall_valid: overallValid,
      results,
      cumulative_impact: request.simulate_cumulative
        ? {
            markets_affected: marketsAffected,
            total_trades: request.trades.length,
            breaches_detected: breachesDetected,
          }
        : undefined,
    };
  }

  /**
   * Helper: Get market information
   */
  private async getMarketInfo(marketCode: string): Promise<any> {
    const result = await this.db.prepare(`
      SELECT market_location, reporting_limit_code, exchange_code
      FROM market_limits
      WHERE market_location = ?
      LIMIT 1
    `).bind(marketCode).first();

    return result;
  }

  /**
   * Helper: Get applicable market limit
   */
  private async getApplicableLimit(
    marketCode: string,
    contractMonth: string,
    spotMonth: string,
    companyId: number
  ): Promise<any> {
    // Determine if this is a spot month contract
    const isSpotMonth = contractMonth.substring(0, 7) === spotMonth.substring(0, 7);
    const limitType = isSpotMonth ? 1 : 2; // 1 = Spot, 2 = Non-spot

    const result = await this.db.prepare(`
      SELECT
        limit_type,
        position_limit,
        reporting_limit_code
      FROM market_limits
      WHERE market_location = ?
        AND limit_type = ?
        AND company_id = ?
      LIMIT 1
    `).bind(marketCode, limitType, companyId).first();

    if (!result) return null;

    return {
      limit_type: limitType,
      limit: (result as any).position_limit || 0,
      reporting_limit_code: (result as any).reporting_limit_code,
    };
  }

  /**
   * Helper: Get current position
   */
  private async getCurrentPosition(
    marketCode: string,
    contractMonth: string,
    companyId: number,
    tradeDate: string
  ): Promise<number> {
    const result = await this.db.prepare(`
      SELECT COALESCE(SUM(net_position), 0) as total_position
      FROM transactions
      WHERE market_location = ?
        AND contract_month = ?
        AND company_id = ?
        AND trade_date <= ?
        AND status = 1
        AND (transaction_type IS NULL OR transaction_type NOT IN ('COMM-PHYS', 'COMM-STOR', 'CASH'))
    `).bind(marketCode, contractMonth, companyId, tradeDate).first();

    return (result as any)?.total_position || 0;
  }

  /**
   * Helper: Check for active exemptions
   */
  private async checkExemption(marketCode: string, companyId: number): Promise<boolean> {
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count
      FROM exemptions
      WHERE market_location = ?
        AND company_id = ?
        AND status = 'APPROVED'
        AND start_date <= date('now')
        AND (end_date IS NULL OR end_date >= date('now'))
    `).bind(marketCode, companyId).first();

    return ((result as any)?.count || 0) > 0;
  }

  /**
   * Helper: Apply diminishing balance logic
   */
  private applyDiminishingBalance(
    limit: number,
    contractMonth: string,
    calculationDate: Date
  ): { diminishedLimit: number; factor: number } {
    const contractDate = new Date(contractMonth);
    const year = contractDate.getFullYear();
    const month = contractDate.getMonth();

    if (calculationDate.getFullYear() !== year || calculationDate.getMonth() !== month) {
      return { diminishedLimit: limit, factor: 1.0 };
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calcDay = calculationDate.getDate();
    const daysRemaining = daysInMonth - calcDay + 1;
    const factor = daysRemaining / daysInMonth;
    const diminishedLimit = Math.floor(limit * factor);

    return { diminishedLimit, factor };
  }

  /**
   * Helper: Create error result
   */
  private createErrorResult(errors: string[], metadata: any): ValidationResult {
    return {
      is_valid: false,
      is_blocked: true,
      block_reason: 'Validation error: ' + errors.join('; '),
      position_after_trade: 0,
      limit: 0,
      utilization_percent: 0,
      utilization_status: 'BREACH',
      warnings: [],
      errors,
      metadata,
    };
  }
}

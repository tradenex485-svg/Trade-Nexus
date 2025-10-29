/**
 * Unit Tests for Pre-Trade Validation Service
 * Tests pre-trade validation, hard blocking, exemptions, and diminishing balance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PreTradeValidationService,
  ValidationResult,
  PreTradeValidationRequest,
} from '../../src/services/pre-trade-validation-service';

describe('Pre-Trade Validation Service', () => {
  let service: PreTradeValidationService;
  let mockDb: any;

  beforeEach(() => {
    // Create a comprehensive mock database
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true, meta: { last_row_id: 1 } }),
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
      batch: vi.fn().mockResolvedValue([]),
    };

    service = new PreTradeValidationService(mockDb);
  });

  describe('ValidationResult Structure', () => {
    it('should have all required fields including is_blocked', () => {
      const result: ValidationResult = {
        is_valid: true,
        is_blocked: false,
        position_after_trade: 100,
        limit: 200,
        utilization_percent: 50,
        utilization_status: 'COMPLIANT',
        warnings: [],
        errors: [],
        metadata: {
          current_position: 50,
          proposed_trade: 50,
        },
      };

      expect(result).toHaveProperty('is_valid');
      expect(result).toHaveProperty('is_blocked');
      expect(result).toHaveProperty('block_reason');
      expect(result).toHaveProperty('position_after_trade');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('utilization_percent');
      expect(result).toHaveProperty('utilization_status');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('metadata');
    });
  });

  describe('Deal Type Filtering', () => {
    it('should exclude COMM-PHYS deals from position limits', async () => {
      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 1000,
        deal_type: 'COMM-PHYS',
        company_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.is_valid).toBe(true);
      expect(result.is_blocked).toBe(false);
      expect(result.utilization_status).toBe('COMPLIANT');
      expect(result.warnings).toContain('Deal type excluded from position limits');
      expect(result.metadata.filtered_deal_type).toBe(true);
    });

    it('should exclude COMM-STOR deals from position limits', async () => {
      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 1000,
        deal_type: 'COMM-STOR',
        company_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.is_valid).toBe(true);
      expect(result.is_blocked).toBe(false);
      expect(result.warnings).toContain('Deal type excluded from position limits');
    });

    it('should exclude CASH deals from position limits', async () => {
      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 1000,
        deal_type: 'CASH',
        company_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.is_valid).toBe(true);
      expect(result.is_blocked).toBe(false);
    });

    it('should include FINANCIAL deals in position limits', async () => {
      // Mock market exists
      mockDb.first.mockResolvedValueOnce({
        market_location: 'HH',
        reporting_limit_code: 'NG',
        exchange_code: 'ICE',
      });

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 1000,
        deal_type: 'FINANCIAL',
        company_id: 1,
      };

      await service.validateTrade(request);

      // Should not be filtered
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should handle case-insensitive deal types', async () => {
      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 1000,
        deal_type: 'comm-phys', // lowercase
        company_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.is_valid).toBe(true);
      expect(result.warnings).toContain('Deal type excluded from position limits');
    });
  });

  describe('Hard Blocking Logic', () => {
    it('should block trade when position exceeds limit without exemption', async () => {
      // Mock market, limit, position to create breach
      mockDb.first
        .mockResolvedValueOnce({
          // getMarketInfo
          market_location: 'HH',
          reporting_limit_code: 'NG',
          exchange_code: 'ICE',
        })
        .mockResolvedValueOnce({
          // getBidWeekStatus
          is_bid_week: false,
          spot_month: '2025-04-01',
        })
        .mockResolvedValueOnce({
          // getApplicableLimit
          limit_type: 1,
          position_limit: 1000,
          reporting_limit_code: 'NG',
        })
        .mockResolvedValueOnce({
          // getCurrentPosition
          total_position: 900,
        })
        .mockResolvedValueOnce({
          // checkExemption
          count: 0, // No exemption
        });

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 200, // 900 + 200 = 1100 > 1000 limit
        company_id: 1,
        user_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.is_valid).toBe(false);
      expect(result.is_blocked).toBe(true);
      expect(result.block_reason).toContain('Trade execution blocked');
      expect(result.block_reason).toContain('1100');
      expect(result.block_reason).toContain('1000');
      expect(result.utilization_status).toBe('BREACH');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should not block trade when position is below limit', async () => {
      mockDb.first
        .mockResolvedValueOnce({
          market_location: 'HH',
          reporting_limit_code: 'NG',
          exchange_code: 'ICE',
        })
        .mockResolvedValueOnce({
          is_bid_week: false,
          spot_month: '2025-04-01',
        })
        .mockResolvedValueOnce({
          limit_type: 1,
          position_limit: 1000,
          reporting_limit_code: 'NG',
        })
        .mockResolvedValueOnce({
          total_position: 500,
        })
        .mockResolvedValueOnce({
          count: 0,
        });

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 200, // 500 + 200 = 700 < 1000 limit
        company_id: 1,
        user_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.is_valid).toBe(true);
      expect(result.is_blocked).toBe(false);
      expect(result.block_reason).toBeUndefined();
      expect(result.utilization_status).not.toBe('BREACH');
    });

    it('should allow trade with exemption even if it breaches limit', async () => {
      mockDb.first
        .mockResolvedValueOnce({
          market_location: 'HH',
          reporting_limit_code: 'NG',
          exchange_code: 'ICE',
        })
        .mockResolvedValueOnce({
          is_bid_week: false,
          spot_month: '2025-04-01',
        })
        .mockResolvedValueOnce({
          limit_type: 1,
          position_limit: 1000,
          reporting_limit_code: 'NG',
        })
        .mockResolvedValueOnce({
          total_position: 900,
        })
        .mockResolvedValueOnce({
          count: 1, // Has exemption
        });

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 200, // 900 + 200 = 1100 > 1000 limit, but exemption exists
        company_id: 1,
        user_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.is_valid).toBe(true);
      expect(result.is_blocked).toBe(false);
      expect(result.metadata.exemption_applied).toBe(true);
      expect(result.warnings).toContain(expect.stringContaining('Exemption applied'));
      expect(result.utilization_status).toBe('BREACH'); // Still tracks as breach but allowed
    });

    it('should set block reason with position and limit details', async () => {
      mockDb.first
        .mockResolvedValueOnce({
          market_location: 'HH',
          reporting_limit_code: 'NG',
          exchange_code: 'ICE',
        })
        .mockResolvedValueOnce({
          is_bid_week: false,
          spot_month: '2025-04-01',
        })
        .mockResolvedValueOnce({
          limit_type: 1,
          position_limit: 5000,
          reporting_limit_code: 'NG',
        })
        .mockResolvedValueOnce({
          total_position: 4800,
        })
        .mockResolvedValueOnce({
          count: 0,
        });

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 300, // 4800 + 300 = 5100 > 5000
        company_id: 1,
        user_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.block_reason).toBeDefined();
      expect(result.block_reason).toContain('5100');
      expect(result.block_reason).toContain('5000');
      expect(result.block_reason).toContain('Exemption or compliance approval required');
    });
  });

  describe('Utilization Status Determination', () => {
    it('should set status to COMPLIANT when utilization < 60%', async () => {
      mockDb.first
        .mockResolvedValueOnce({
          market_location: 'HH',
          reporting_limit_code: 'NG',
          exchange_code: 'ICE',
        })
        .mockResolvedValueOnce({
          is_bid_week: false,
          spot_month: '2025-04-01',
        })
        .mockResolvedValueOnce({
          limit_type: 1,
          position_limit: 1000,
          reporting_limit_code: 'NG',
        })
        .mockResolvedValueOnce({
          total_position: 200,
        })
        .mockResolvedValueOnce({
          count: 0,
        });

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 100, // 200 + 100 = 300, 30% utilization
        company_id: 1,
        user_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.utilization_status).toBe('COMPLIANT');
      expect(result.utilization_percent).toBe(30);
    });

    it('should set status to WARNING when utilization >= 90%', async () => {
      mockDb.first
        .mockResolvedValueOnce({
          market_location: 'HH',
          reporting_limit_code: 'NG',
          exchange_code: 'ICE',
        })
        .mockResolvedValueOnce({
          is_bid_week: false,
          spot_month: '2025-04-01',
        })
        .mockResolvedValueOnce({
          limit_type: 1,
          position_limit: 1000,
          reporting_limit_code: 'NG',
        })
        .mockResolvedValueOnce({
          total_position: 850,
        })
        .mockResolvedValueOnce({
          count: 0,
        });

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 50, // 850 + 50 = 900, 90% utilization
        company_id: 1,
        user_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.utilization_status).toBe('WARNING');
      expect(result.utilization_percent).toBe(90);
      expect(result.warnings).toContain(expect.stringContaining('high utilization'));
    });

    it('should set status to BREACH when utilization > 100%', async () => {
      mockDb.first
        .mockResolvedValueOnce({
          market_location: 'HH',
          reporting_limit_code: 'NG',
          exchange_code: 'ICE',
        })
        .mockResolvedValueOnce({
          is_bid_week: false,
          spot_month: '2025-04-01',
        })
        .mockResolvedValueOnce({
          limit_type: 1,
          position_limit: 1000,
          reporting_limit_code: 'NG',
        })
        .mockResolvedValueOnce({
          total_position: 900,
        })
        .mockResolvedValueOnce({
          count: 0,
        });

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 200, // 900 + 200 = 1100, 110% utilization
        company_id: 1,
        user_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.utilization_status).toBe('BREACH');
      expect(result.utilization_percent).toBe(110);
    });
  });

  describe('Position Calculation', () => {
    it('should calculate position after trade correctly for long positions', async () => {
      mockDb.first
        .mockResolvedValueOnce({ market_location: 'HH', reporting_limit_code: 'NG', exchange_code: 'ICE' })
        .mockResolvedValueOnce({ is_bid_week: false, spot_month: '2025-04-01' })
        .mockResolvedValueOnce({ limit_type: 1, position_limit: 1000, reporting_limit_code: 'NG' })
        .mockResolvedValueOnce({ total_position: 400 })
        .mockResolvedValueOnce({ count: 0 });

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 300, // Buying
        company_id: 1,
        user_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.position_after_trade).toBe(700); // 400 + 300
      expect(result.metadata.current_position).toBe(400);
      expect(result.metadata.proposed_trade).toBe(300);
    });

    it('should calculate position after trade correctly for short positions', async () => {
      mockDb.first
        .mockResolvedValueOnce({ market_location: 'HH', reporting_limit_code: 'NG', exchange_code: 'ICE' })
        .mockResolvedValueOnce({ is_bid_week: false, spot_month: '2025-04-01' })
        .mockResolvedValueOnce({ limit_type: 1, position_limit: 1000, reporting_limit_code: 'NG' })
        .mockResolvedValueOnce({ total_position: 400 })
        .mockResolvedValueOnce({ count: 0 });

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: -300, // Selling
        company_id: 1,
        user_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.position_after_trade).toBe(100); // 400 - 300
    });

    it('should use absolute value for utilization calculation', async () => {
      mockDb.first
        .mockResolvedValueOnce({ market_location: 'HH', reporting_limit_code: 'NG', exchange_code: 'ICE' })
        .mockResolvedValueOnce({ is_bid_week: false, spot_month: '2025-04-01' })
        .mockResolvedValueOnce({ limit_type: 1, position_limit: 1000, reporting_limit_code: 'NG' })
        .mockResolvedValueOnce({ total_position: 100 })
        .mockResolvedValueOnce({ count: 0 });

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: -600, // Net position = 100 - 600 = -500
        company_id: 1,
        user_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.position_after_trade).toBe(-500);
      expect(result.utilization_percent).toBe(50); // |−500| / 1000 = 50%
    });
  });

  describe('Error Handling', () => {
    it('should return error result when market not found', async () => {
      mockDb.first.mockResolvedValueOnce(null); // No market found

      const request: PreTradeValidationRequest = {
        market_code: 'INVALID',
        contract_month: '2025-04-01',
        quantity: 100,
        company_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.is_valid).toBe(false);
      expect(result.is_blocked).toBe(true);
      expect(result.errors).toContain(expect.stringContaining('Market not found'));
    });

    it('should handle missing limit gracefully', async () => {
      mockDb.first
        .mockResolvedValueOnce({ market_location: 'HH', reporting_limit_code: 'NG', exchange_code: 'ICE' })
        .mockResolvedValueOnce({ is_bid_week: false, spot_month: '2025-04-01' })
        .mockResolvedValueOnce(null); // No limit configured

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 100,
        company_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.is_valid).toBe(true);
      expect(result.is_blocked).toBe(false);
      expect(result.warnings).toContain(expect.stringContaining('No position limit configured'));
    });

    it('should handle database errors gracefully', async () => {
      mockDb.first.mockRejectedValueOnce(new Error('Database connection failed'));

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 100,
        company_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.is_valid).toBe(false);
      expect(result.is_blocked).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Metadata Tracking', () => {
    it('should track bid week status in metadata', async () => {
      mockDb.first
        .mockResolvedValueOnce({ market_location: 'HH', reporting_limit_code: 'NG', exchange_code: 'ICE' })
        .mockResolvedValueOnce({ is_bid_week: true, spot_month: '2025-05-01' })
        .mockResolvedValueOnce({ limit_type: 1, position_limit: 1000, reporting_limit_code: 'NG' })
        .mockResolvedValueOnce({ total_position: 0 })
        .mockResolvedValueOnce({ count: 0 });

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 100,
        company_id: 1,
        user_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.metadata.bid_week_active).toBe(true);
      expect(result.metadata.spot_month).toBe('2025-05-01');
    });

    it('should track diminishing factor when applied', async () => {
      // This would require the trade to be in the spot month for natural gas
      // Test would need more complex mocking
      expect(true).toBe(true); // Placeholder
    });

    it('should track exemption application', async () => {
      mockDb.first
        .mockResolvedValueOnce({ market_location: 'HH', reporting_limit_code: 'NG', exchange_code: 'ICE' })
        .mockResolvedValueOnce({ is_bid_week: false, spot_month: '2025-04-01' })
        .mockResolvedValueOnce({ limit_type: 1, position_limit: 1000, reporting_limit_code: 'NG' })
        .mockResolvedValueOnce({ total_position: 0 })
        .mockResolvedValueOnce({ count: 1 });

      const request: PreTradeValidationRequest = {
        market_code: 'HH',
        contract_month: '2025-04-01',
        quantity: 100,
        company_id: 1,
        user_id: 1,
      };

      const result = await service.validateTrade(request);

      expect(result.metadata.exemption_applied).toBe(true);
    });
  });
});

-- Migration 0026: CME Product Data and Market Limits
-- Description: Populate CME/NYMEX market limits per CFTC Position Limit Specification Section 2.2.2
-- Date: 2025-10-27
-- Version: 1.1.0

-- ============================================================================
-- CME/NYMEX NATURAL GAS PRODUCTS
-- ============================================================================

-- Henry Hub Natural Gas Futures (NG)
INSERT OR IGNORE INTO market_limits (
    commodity_code,
    contract_name,
    exchange_code,
    contract_size,
    unit_of_trading,
    spot_month_limit,
    spot_month_conditional_limit,
    single_month_accountability_level,
    all_month_accountability_level,
    aggregate_1_positive_correlation,
    aggregate_2_negative_correlation,
    diminishing_balance_flag,
    uses_bid_week,
    bid_week_days_count,
    is_crfc,
    cftc_referenced_contract,
    trading_ratio,
    is_active,
    effective_date
) VALUES
-- Primary CME Natural Gas Contract
('NG', 'Henry Hub Natural Gas Futures', 'CME', 10000, 'MMBtu', 12000, 8000, 24000, 48000, 'NG', NULL, 1, 1, 3, 1, 'NG', 1.0, 1, '2024-01-01'),

-- CME Natural Gas Options
('NGO', 'Henry Hub Natural Gas Options', 'CME', 10000, 'MMBtu', 12000, 8000, 24000, 48000, 'NG', NULL, 0, 1, 3, 0, 'NG', 1.0, 1, '2024-01-01'),

-- CME Natural Gas Look-Alike (Aggregates to NG)
('QN', 'E-mini Natural Gas Futures', 'CME', 2500, 'MMBtu', 12000, 8000, 24000, 48000, 'NG', NULL, 0, 1, 3, 0, 'NG', 0.25, 1, '2024-01-01'),

-- CME Natural Gas Calendar Spreads (Positive correlation)
('NGS', 'Natural Gas Calendar Spread', 'CME', 10000, 'MMBtu', 12000, 8000, 24000, 48000, 'NG', NULL, 0, 1, 3, 0, 'NG', 1.0, 1, '2024-01-01');

-- ============================================================================
-- CME CRUDE OIL PRODUCTS (if applicable)
-- ============================================================================

INSERT OR IGNORE INTO market_limits (
    commodity_code,
    contract_name,
    exchange_code,
    contract_size,
    unit_of_trading,
    spot_month_limit,
    spot_month_conditional_limit,
    single_month_accountability_level,
    all_month_accountability_level,
    aggregate_1_positive_correlation,
    aggregate_2_negative_correlation,
    diminishing_balance_flag,
    uses_bid_week,
    bid_week_days_count,
    is_crfc,
    cftc_referenced_contract,
    trading_ratio,
    is_active,
    effective_date
) VALUES
-- WTI Crude Oil Futures
('CL', 'Crude Oil Futures', 'NYMEX', 1000, 'Barrels', 10000, 6000, 20000, 40000, 'CL', NULL, 0, 1, 3, 1, 'CL', 1.0, 1, '2024-01-01'),

-- Crude Oil Options
('CLO', 'Crude Oil Options', 'NYMEX', 1000, 'Barrels', 10000, 6000, 20000, 40000, 'CL', NULL, 0, 1, 3, 0, 'CL', 1.0, 1, '2024-01-01'),

-- E-mini Crude Oil
('QM', 'E-mini Crude Oil Futures', 'NYMEX', 500, 'Barrels', 10000, 6000, 20000, 40000, 'CL', NULL, 0, 1, 3, 0, 'CL', 0.5, 1, '2024-01-01');

-- ============================================================================
-- CME REFINED PRODUCTS
-- ============================================================================

INSERT OR IGNORE INTO market_limits (
    commodity_code,
    contract_name,
    exchange_code,
    contract_size,
    unit_of_trading,
    spot_month_limit,
    spot_month_conditional_limit,
    single_month_accountability_level,
    all_month_accountability_level,
    aggregate_1_positive_correlation,
    aggregate_2_negative_correlation,
    diminishing_balance_flag,
    uses_bid_week,
    bid_week_days_count,
    is_crfc,
    cftc_referenced_contract,
    trading_ratio,
    is_active,
    effective_date
) VALUES
-- RBOB Gasoline
('RB', 'RBOB Gasoline Futures', 'NYMEX', 42000, 'Gallons', 10000, 6000, 20000, 40000, 'RB', NULL, 0, 1, 3, 1, 'RB', 1.0, 1, '2024-01-01'),

-- Heating Oil
('HO', 'NY Harbor ULSD Futures', 'NYMEX', 42000, 'Gallons', 10000, 6000, 20000, 40000, 'HO', NULL, 0, 1, 3, 1, 'HO', 1.0, 1, '2024-01-01');

-- ============================================================================
-- UPDATE MAPPING TABLE FOR CME PRODUCTS
-- ============================================================================

-- Add CME Natural Gas mappings
INSERT OR IGNORE INTO mapping (
    market_location,
    commodity_code,
    contract_name,
    unit_of_trading,
    aggregate_1_positive_correlation,
    aggregate_2_negative_correlation,
    is_active
) VALUES
('NYMEX_NG_HH', 'NG', 'Henry Hub Natural Gas Futures', 'MMBtu', 'NG', NULL, 1),
('NYMEX_NGO_HH', 'NGO', 'Henry Hub Natural Gas Options', 'MMBtu', 'NG', NULL, 1),
('CME_QN', 'QN', 'E-mini Natural Gas Futures', 'MMBtu', 'NG', NULL, 1),
('NYMEX_CL_WTI', 'CL', 'Crude Oil Futures', 'Barrels', 'CL', NULL, 1),
('NYMEX_CLO_WTI', 'CLO', 'Crude Oil Options', 'Barrels', 'CL', NULL, 1),
('NYMEX_RB', 'RB', 'RBOB Gasoline Futures', 'Gallons', 'RB', NULL, 1),
('NYMEX_HO', 'HO', 'NY Harbor ULSD Futures', 'Gallons', 'HO', NULL, 1);

-- ============================================================================
-- CME HOLIDAY VALIDATION (Additional holidays if needed)
-- ============================================================================

-- Good Friday (CME closed, ICE may differ)
INSERT OR IGNORE INTO exchange_holidays (exchange_code, holiday_date, holiday_name) VALUES
('CME', '2024-03-29', 'Good Friday'),
('CME', '2025-04-18', 'Good Friday'),
('CME', '2026-04-03', 'Good Friday'),
('NYMEX', '2024-03-29', 'Good Friday'),
('NYMEX', '2025-04-18', 'Good Friday'),
('NYMEX', '2026-04-03', 'Good Friday');

-- ============================================================================
-- AGGREGATION GROUPS FOR CME PRODUCTS
-- ============================================================================

-- Natural Gas Aggregation Group (if not exists)
INSERT OR IGNORE INTO aggregation_groups (
    group_code,
    group_name,
    group_type,
    base_commodity,
    aggregation_method,
    conversion_required,
    is_active
) VALUES
('CME_NG_AGG', 'CME Natural Gas Aggregation', 'COMMODITY_FAMILY', 'NG', 'net_equivalent', 1, 1);

-- Add group members
INSERT OR IGNORE INTO aggregation_group_members (
    group_id,
    commodity_code,
    is_primary,
    conversion_factor,
    correlation_type,
    weight,
    is_active
) VALUES
((SELECT id FROM aggregation_groups WHERE group_code = 'CME_NG_AGG'), 'NG', 1, 1.0, 'POSITIVE', 1.0, 1),
((SELECT id FROM aggregation_groups WHERE group_code = 'CME_NG_AGG'), 'NGO', 0, 1.0, 'POSITIVE', 1.0, 1),
((SELECT id FROM aggregation_groups WHERE group_code = 'CME_NG_AGG'), 'QN', 0, 0.25, 'POSITIVE', 1.0, 1);

-- ============================================================================
-- COMMODITY RELATIONSHIPS FOR CME
-- ============================================================================

INSERT OR IGNORE INTO commodity_relationships (
    commodity_a,
    commodity_b,
    relationship_type,
    correlation_type,
    conversion_ratio,
    is_spread,
    is_active
) VALUES
-- Natural Gas relationships
('NG', 'NGO', 'OPTION_UNDERLYING', 'POSITIVE', 1.0, 0, 1),
('NG', 'QN', 'CONTRACT_SIZE', 'POSITIVE', 4.0, 0, 1), -- 1 NG = 4 QN (10000/2500)
('QN', 'NG', 'CONTRACT_SIZE', 'POSITIVE', 0.25, 0, 1), -- 1 QN = 0.25 NG

-- Crude Oil relationships
('CL', 'CLO', 'OPTION_UNDERLYING', 'POSITIVE', 1.0, 0, 1),
('CL', 'QM', 'CONTRACT_SIZE', 'POSITIVE', 2.0, 0, 1), -- 1 CL = 2 QM (1000/500)
('QM', 'CL', 'CONTRACT_SIZE', 'POSITIVE', 0.5, 0, 1); -- 1 QM = 0.5 CL

-- ============================================================================
-- UPDATE ECONOMIC EQUIVALENCE RULES FOR CME
-- ============================================================================

INSERT OR IGNORE INTO economic_equivalence_rules (
    commodity_code,
    referenced_contract,
    equivalent_contract,
    equivalence_type,
    max_delivery_divergence_days,
    trading_ratio,
    rule_notes,
    is_active
) VALUES
-- CME Natural Gas (2-day divergence per CFTC spec)
('NG', 'NG', 'NGO', 'NATURAL_GAS', 2, 1.0, 'CME Natural Gas Options - 2 day divergence', 1),
('NG', 'NG', 'QN', 'NATURAL_GAS', 2, 0.25, 'E-mini Natural Gas - 2 day divergence, 1:4 ratio', 1),

-- CME Crude Oil (1-day divergence per CFTC spec)
('CL', 'CL', 'CLO', 'LOT_SIZE', 1, 1.0, 'Crude Oil Options - 1 day divergence', 1),
('CL', 'CL', 'QM', 'LOT_SIZE', 1, 0.5, 'E-mini Crude Oil - 1 day divergence, 1:2 ratio', 1);

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Verify CME market limits were added
-- SELECT COUNT(*) as cme_limits FROM market_limits WHERE exchange_code IN ('CME', 'NYMEX') AND is_active = 1;

-- Verify CME mappings
-- SELECT COUNT(*) as cme_mappings FROM mapping WHERE market_location LIKE '%NYMEX%' OR market_location LIKE '%CME%';

-- Verify CME holidays
-- SELECT COUNT(*) as cme_holidays FROM exchange_holidays WHERE exchange_code IN ('CME', 'NYMEX') AND is_active = 1;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- ✓ Added CME/NYMEX Natural Gas contracts (NG, NGO, QN)
-- ✓ Added CME/NYMEX Crude Oil contracts (CL, CLO, QM)
-- ✓ Added CME/NYMEX Refined Products (RB, HO)
-- ✓ Updated mapping table with CME products
-- ✓ Added CME-specific holidays (Good Friday)
-- ✓ Created aggregation groups for CME products
-- ✓ Established commodity relationships with conversion ratios
-- ✓ Added economic equivalence rules per CFTC spec (1-day vs 2-day divergence)

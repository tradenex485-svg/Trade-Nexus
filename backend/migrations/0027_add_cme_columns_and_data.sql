-- Migration 0027: Add CME columns and data
-- Description: Add missing columns to market_limits and populate CME/NYMEX market limits
-- Date: 2025-10-28
-- Version: 1.1.0

-- ============================================================================
-- STEP 1: Add missing columns to market_limits table
-- ============================================================================

-- Add CFTC-specific columns if they don't exist
ALTER TABLE market_limits ADD COLUMN diminishing_balance_flag INTEGER DEFAULT 0;
ALTER TABLE market_limits ADD COLUMN uses_bid_week INTEGER DEFAULT 0;
ALTER TABLE market_limits ADD COLUMN bid_week_days_count INTEGER DEFAULT 5;
ALTER TABLE market_limits ADD COLUMN is_crfc INTEGER DEFAULT 0;
ALTER TABLE market_limits ADD COLUMN cftc_referenced_contract TEXT;
ALTER TABLE market_limits ADD COLUMN trading_ratio REAL DEFAULT 1.0;

-- ============================================================================
-- STEP 2: CME/NYMEX NATURAL GAS PRODUCTS
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
('NG', 'Henry Hub Natural Gas Futures', 'CME', 10000, 'MMBtu', 12000, 8000, 24000, 48000, 'NG', 1, 1, 3, 1, 'NG', 1.0, 1, '2024-01-01'),

-- CME Natural Gas Options
('NGO', 'Henry Hub Natural Gas Options', 'CME', 10000, 'MMBtu', 12000, 8000, 24000, 48000, 'NG', 0, 1, 3, 0, 'NG', 1.0, 1, '2024-01-01'),

-- CME Natural Gas E-mini
('QN', 'E-mini Natural Gas Futures', 'CME', 2500, 'MMBtu', 12000, 8000, 24000, 48000, 'NG', 0, 1, 3, 0, 'NG', 0.25, 1, '2024-01-01');

-- ============================================================================
-- STEP 3: CME CRUDE OIL PRODUCTS
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
    diminishing_balance_flag,
    uses_bid_week,
    bid_week_days_count,
    is_crfc,
    cftc_referenced_contract,
    trading_ratio,
    is_active,
    effective_date
) VALUES
-- Crude Oil Futures (CL)
('CL', 'Light Sweet Crude Oil Futures', 'NYMEX', 1000, 'Barrels', 10000, 7000, 20000, 40000, 'CL', 0, 0, 3, 1, 'CL', 1.0, 1, '2024-01-01'),

-- Crude Oil Options (CLO)
('CLO', 'Crude Oil Options', 'NYMEX', 1000, 'Barrels', 10000, 7000, 20000, 40000, 'CL', 0, 0, 3, 0, 'CL', 1.0, 1, '2024-01-01'),

-- E-mini Crude Oil (QM)
('QM', 'E-mini Crude Oil Futures', 'NYMEX', 500, 'Barrels', 10000, 7000, 20000, 40000, 'CL', 0, 0, 3, 0, 'CL', 0.5, 1, '2024-01-01');

-- ============================================================================
-- STEP 4: CME REFINED PRODUCTS
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
    diminishing_balance_flag,
    uses_bid_week,
    bid_week_days_count,
    is_crfc,
    cftc_referenced_contract,
    trading_ratio,
    is_active,
    effective_date
) VALUES
-- RBOB Gasoline (RB)
('RB', 'RBOB Gasoline Futures', 'NYMEX', 42000, 'Gallons', 7000, 5000, 14000, 28000, 'RB', 0, 0, 3, 1, 'RB', 1.0, 1, '2024-01-01'),

-- Heating Oil (HO)
('HO', 'NY Harbor ULSD Futures', 'NYMEX', 42000, 'Gallons', 7000, 5000, 14000, 28000, 'HO', 0, 0, 3, 1, 'HO', 1.0, 1, '2024-01-01');

-- ============================================================================
-- STEP 5: CME Holiday Calendar (Good Friday)
-- ============================================================================

-- Create exchange_holidays table if it doesn't exist
CREATE TABLE IF NOT EXISTS exchange_holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exchange_code TEXT NOT NULL,
    holiday_date TEXT NOT NULL,
    holiday_name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exchange_code, holiday_date)
);

-- Insert Good Friday holidays for CME/NYMEX
INSERT OR IGNORE INTO exchange_holidays (exchange_code, holiday_date, holiday_name, is_active)
VALUES
('CME', '2024-03-29', 'Good Friday 2024', 1),
('NYMEX', '2024-03-29', 'Good Friday 2024', 1),
('CME', '2025-04-18', 'Good Friday 2025', 1),
('NYMEX', '2025-04-18', 'Good Friday 2025', 1),
('CME', '2026-04-03', 'Good Friday 2026', 1),
('NYMEX', '2026-04-03', 'Good Friday 2026', 1);

-- ============================================================================
-- STEP 6: Add mappings for CME products
-- ============================================================================

-- Add exchange_code column to mapping table if it doesn't exist
ALTER TABLE mapping ADD COLUMN exchange_code TEXT;

-- Insert CME product mappings
INSERT OR IGNORE INTO mapping (contract_name, commodity_code, market_location, unit_of_trading, aggregate_1_positive_correlation, exchange_code)
VALUES
('Henry Hub Natural Gas Futures', 'NG', 'NYMEX Henry Hub', 'MMBtu', 'NG', 'CME'),
('E-mini Natural Gas Futures', 'QN', 'NYMEX Henry Hub E-mini', 'MMBtu', 'NG', 'CME'),
('Light Sweet Crude Oil Futures', 'CL', 'NYMEX WTI Cushing', 'Barrels', 'CL', 'NYMEX'),
('E-mini Crude Oil Futures', 'QM', 'NYMEX WTI E-mini', 'Barrels', 'CL', 'NYMEX'),
('RBOB Gasoline Futures', 'RB', 'NYMEX NY Harbor RBOB', 'Gallons', 'RB', 'NYMEX'),
('NY Harbor ULSD Futures', 'HO', 'NYMEX NY Harbor ULSD', 'Gallons', 'HO', 'NYMEX');

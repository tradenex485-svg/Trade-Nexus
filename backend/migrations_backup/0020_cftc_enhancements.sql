-- Trade Nexus - CFTC Position Limits Enhancements
-- Migration: 0020_cftc_enhancements.sql
-- Description: Implements missing CFTC functionality including:
--   - Holiday calendars and bid week logic
--   - Diminishing balance contracts
--   - Deal type filtering and classification
--   - Enhanced exception handling
--   - Economic equivalence validation
--   - Transaction amendments audit trail

-- ============================================================================
-- 1. EXCHANGE HOLIDAYS TABLE (for Bid Week Calculations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS exchange_holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exchange_code TEXT NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exchange_code, holiday_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_holidays_exchange_date
ON exchange_holidays(exchange_code, holiday_date);

CREATE INDEX IF NOT EXISTS idx_exchange_holidays_active
ON exchange_holidays(is_active, exchange_code);

-- ============================================================================
-- 2. BID WEEK SCHEDULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bid_week_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exchange_code TEXT NOT NULL,
    schedule_month DATE NOT NULL, -- First day of month
    bid_week_start_date DATE NOT NULL,
    bid_week_end_date DATE NOT NULL,
    good_business_days_count INTEGER NOT NULL,
    spot_month_start DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exchange_code, schedule_month)
);

CREATE INDEX IF NOT EXISTS idx_bid_week_schedules_exchange_month
ON bid_week_schedules(exchange_code, schedule_month);

CREATE INDEX IF NOT EXISTS idx_bid_week_schedules_dates
ON bid_week_schedules(bid_week_start_date, bid_week_end_date);

-- ============================================================================
-- 3. TRANSACTION AMENDMENTS (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transaction_amendments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    amended_by_user_id INTEGER,
    amendment_type TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'BACKDATE'
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    amendment_reason TEXT,
    amendment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (amended_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_transaction_amendments_transaction
ON transaction_amendments(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_amendments_date
ON transaction_amendments(amendment_date);

CREATE INDEX IF NOT EXISTS idx_transaction_amendments_type
ON transaction_amendments(amendment_type);

-- ============================================================================
-- 4. CALCULATION EXCEPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS calculation_exceptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exception_type TEXT NOT NULL, -- 'MISSING_MAPPING', 'INVALID_DATA', 'CALCULATION_ERROR', 'BACKDATE'
    exception_severity TEXT NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    entity_type TEXT NOT NULL, -- 'TRANSACTION', 'MAPPING', 'MARKET_LIMIT', 'CALCULATION'
    entity_id INTEGER,
    exception_message TEXT NOT NULL,
    exception_details TEXT, -- JSON with additional context
    status TEXT DEFAULT 'OPEN', -- 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'
    assigned_to_user_id INTEGER,
    resolution_notes TEXT,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    company_id INTEGER,
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_calculation_exceptions_type_severity
ON calculation_exceptions(exception_type, exception_severity);

CREATE INDEX IF NOT EXISTS idx_calculation_exceptions_status
ON calculation_exceptions(status);

CREATE INDEX IF NOT EXISTS idx_calculation_exceptions_entity
ON calculation_exceptions(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_calculation_exceptions_company
ON calculation_exceptions(company_id, status);

-- ============================================================================
-- 5. ECONOMIC EQUIVALENCE RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS economic_equivalence_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commodity_code TEXT NOT NULL,
    referenced_contract TEXT NOT NULL, -- Base CRFC
    equivalent_contract TEXT NOT NULL, -- Economically equivalent contract
    equivalence_type TEXT NOT NULL, -- 'LOT_SIZE', 'DELIVERY_DATE', 'POST_TRADE', 'NATURAL_GAS'
    max_delivery_divergence_days INTEGER, -- 1 for most commodities, 2 for natural gas
    trading_ratio REAL DEFAULT 1.0, -- Conversion ratio
    is_active INTEGER DEFAULT 1,
    effective_date DATE,
    expiry_date DATE,
    rule_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(commodity_code, referenced_contract, equivalent_contract)
);

CREATE INDEX IF NOT EXISTS idx_economic_equivalence_commodity
ON economic_equivalence_rules(commodity_code, is_active);

CREATE INDEX IF NOT EXISTS idx_economic_equivalence_contracts
ON economic_equivalence_rules(referenced_contract, equivalent_contract);

-- ============================================================================
-- 6. SUBSET REPORT METADATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subset_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL, -- 'TOP_10_COUNTERPARTIES', 'NEXT_DAY_FIXED', 'NEXT_DAY_INDEX', 'NEXT_DAY_PRINT'
    report_date DATE NOT NULL,
    company_id INTEGER NOT NULL,
    generated_by_user_id INTEGER,
    report_data TEXT, -- JSON with report results
    generation_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'FAILED'
    error_message TEXT,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (generated_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_subset_reports_type_date
ON subset_reports(report_type, report_date);

CREATE INDEX IF NOT EXISTS idx_subset_reports_company
ON subset_reports(company_id, report_date);

CREATE INDEX IF NOT EXISTS idx_subset_reports_status
ON subset_reports(generation_status);

-- ============================================================================
-- 7. ALTER EXISTING TABLES - TRANSACTIONS
-- ============================================================================

-- Add new fields to transactions table
ALTER TABLE transactions ADD COLUMN transaction_type TEXT; -- 'COMM-FUT', 'COMM-SWAP', 'COMM-OPT', 'COMM-PHYS', 'COMM-STOR', 'CASH'
ALTER TABLE transactions ADD COLUMN is_swap INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN is_internal INTEGER DEFAULT 0; -- For internal swaps/pass-through
ALTER TABLE transactions ADD COLUMN is_next_day INTEGER DEFAULT 0; -- For next-day transactions
ALTER TABLE transactions ADD COLUMN price_type TEXT; -- 'FIXED', 'INDEX', 'BASIS'
ALTER TABLE transactions ADD COLUMN counterparty_id INTEGER;
ALTER TABLE transactions ADD COLUMN counterparty_name TEXT;
ALTER TABLE transactions ADD COLUMN exchange_id INTEGER;
ALTER TABLE transactions ADD COLUMN portfolio_id INTEGER;
ALTER TABLE transactions ADD COLUMN is_backdate INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN original_trade_date DATE;
ALTER TABLE transactions ADD COLUMN validation_status TEXT DEFAULT 'PENDING'; -- 'PENDING', 'VALIDATED', 'REJECTED'
ALTER TABLE transactions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Add foreign key indexes
CREATE INDEX IF NOT EXISTS idx_transactions_exchange
ON transactions(exchange_id);

CREATE INDEX IF NOT EXISTS idx_transactions_counterparty
ON transactions(counterparty_id);

CREATE INDEX IF NOT EXISTS idx_transactions_portfolio
ON transactions(portfolio_id);

CREATE INDEX IF NOT EXISTS idx_transactions_type
ON transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_transactions_is_internal
ON transactions(is_internal);

CREATE INDEX IF NOT EXISTS idx_transactions_is_next_day
ON transactions(is_next_day);

CREATE INDEX IF NOT EXISTS idx_transactions_validation
ON transactions(validation_status);

-- ============================================================================
-- 8. ALTER EXISTING TABLES - MARKET_LIMITS
-- ============================================================================

-- Add diminishing balance and bid week fields
ALTER TABLE market_limits ADD COLUMN diminishing_balance_flag INTEGER DEFAULT 0;
ALTER TABLE market_limits ADD COLUMN daily_decrease_factor REAL; -- Proportional decrease per day
ALTER TABLE market_limits ADD COLUMN spot_limit_effective_days_before INTEGER; -- Days before month-end when spot limit becomes effective
ALTER TABLE market_limits ADD COLUMN uses_bid_week INTEGER DEFAULT 0;
ALTER TABLE market_limits ADD COLUMN bid_week_days_count INTEGER; -- 5 for ICE, 3 for CME
ALTER TABLE market_limits ADD COLUMN is_crfc INTEGER DEFAULT 0; -- Core Referenced Futures Contract flag
ALTER TABLE market_limits ADD COLUMN cftc_referenced_contract TEXT; -- CFTC reference contract code
ALTER TABLE market_limits ADD COLUMN trading_ratio REAL DEFAULT 1.0; -- For aggregation calculations
ALTER TABLE market_limits ADD COLUMN strike_price_example TEXT; -- For options
ALTER TABLE market_limits ADD COLUMN strike_price_format TEXT; -- For options

CREATE INDEX IF NOT EXISTS idx_market_limits_diminishing
ON market_limits(diminishing_balance_flag, is_active);

CREATE INDEX IF NOT EXISTS idx_market_limits_crfc
ON market_limits(is_crfc, is_active);

CREATE INDEX IF NOT EXISTS idx_market_limits_bid_week
ON market_limits(uses_bid_week, exchange_code);

-- ============================================================================
-- 9. ALTER EXISTING TABLES - LIMIT_CALCULATIONS
-- ============================================================================

-- Add bid week and drill-down fields
ALTER TABLE limit_calculations ADD COLUMN bid_week_start_date DATE;
ALTER TABLE limit_calculations ADD COLUMN bid_week_end_date DATE;
ALTER TABLE limit_calculations ADD COLUMN in_bid_week INTEGER DEFAULT 0;
ALTER TABLE limit_calculations ADD COLUMN diminishing_balance_applied INTEGER DEFAULT 0;
ALTER TABLE limit_calculations ADD COLUMN diminishing_factor_applied REAL;
ALTER TABLE limit_calculations ADD COLUMN contributing_transaction_ids TEXT; -- JSON array of transaction IDs
ALTER TABLE limit_calculations ADD COLUMN buy_position_lots REAL DEFAULT 0;
ALTER TABLE limit_calculations ADD COLUMN sell_position_lots REAL DEFAULT 0;
ALTER TABLE limit_calculations ADD COLUMN net_position_lots_detail TEXT; -- JSON with breakdown

CREATE INDEX IF NOT EXISTS idx_limit_calculations_bid_week
ON limit_calculations(in_bid_week, calculation_date);

-- ============================================================================
-- 10. COUNTERPARTIES TABLE (for Subset Reports)
-- ============================================================================
CREATE TABLE IF NOT EXISTS counterparties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    counterparty_name TEXT NOT NULL UNIQUE,
    counterparty_code TEXT UNIQUE,
    counterparty_type TEXT, -- 'PHYSICAL', 'FINANCIAL', 'BROKER', 'EXCHANGE'
    credit_rating TEXT,
    is_active INTEGER DEFAULT 1,
    company_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_counterparties_type
ON counterparties(counterparty_type, is_active);

CREATE INDEX IF NOT EXISTS idx_counterparties_company
ON counterparties(company_id);

-- ============================================================================
-- 11. PORTFOLIOS TABLE (for Deal Type Filtering)
-- ============================================================================
CREATE TABLE IF NOT EXISTS portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_name TEXT NOT NULL,
    portfolio_code TEXT UNIQUE,
    portfolio_type TEXT, -- 'TRADING', 'HEDGING', 'INTERNAL', 'PASSTHROUGH'
    is_internal INTEGER DEFAULT 0, -- For excluding from position limits
    company_id INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_portfolios_company
ON portfolios(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_portfolios_type
ON portfolios(portfolio_type, is_internal);

-- ============================================================================
-- 12. CFTC VALIDATION LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS cftc_validation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    validation_type TEXT NOT NULL, -- 'CALCULATION', 'SWAP_CONVERSION', 'EQUIVALENCE', 'AGGREGATION'
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    validation_rule TEXT NOT NULL,
    validation_status TEXT NOT NULL, -- 'PASS', 'FAIL', 'WARNING'
    expected_value TEXT,
    actual_value TEXT,
    variance TEXT,
    commission_regulation_ref TEXT, -- CFTC regulation reference
    validation_notes TEXT,
    validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    company_id INTEGER,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_cftc_validation_type_status
ON cftc_validation_log(validation_type, validation_status);

CREATE INDEX IF NOT EXISTS idx_cftc_validation_entity
ON cftc_validation_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_cftc_validation_date
ON cftc_validation_log(validated_at);

-- ============================================================================
-- 13. SEED DATA - EXCHANGE HOLIDAYS (2024-2026)
-- ============================================================================

-- ICE Holidays 2024-2026
INSERT OR IGNORE INTO exchange_holidays (exchange_code, holiday_date, holiday_name) VALUES
('ICE', '2024-01-01', 'New Year''s Day'),
('ICE', '2024-01-15', 'Martin Luther King Jr. Day'),
('ICE', '2024-02-19', 'Presidents Day'),
('ICE', '2024-05-27', 'Memorial Day'),
('ICE', '2024-07-04', 'Independence Day'),
('ICE', '2024-09-02', 'Labor Day'),
('ICE', '2024-11-28', 'Thanksgiving Day'),
('ICE', '2024-12-25', 'Christmas Day'),
('ICE', '2025-01-01', 'New Year''s Day'),
('ICE', '2025-01-20', 'Martin Luther King Jr. Day'),
('ICE', '2025-02-17', 'Presidents Day'),
('ICE', '2025-05-26', 'Memorial Day'),
('ICE', '2025-07-04', 'Independence Day'),
('ICE', '2025-09-01', 'Labor Day'),
('ICE', '2025-11-27', 'Thanksgiving Day'),
('ICE', '2025-12-25', 'Christmas Day'),
('ICE', '2026-01-01', 'New Year''s Day'),
('ICE', '2026-01-19', 'Martin Luther King Jr. Day'),
('ICE', '2026-02-16', 'Presidents Day'),
('ICE', '2026-05-25', 'Memorial Day'),
('ICE', '2026-07-03', 'Independence Day (observed)'),
('ICE', '2026-09-07', 'Labor Day'),
('ICE', '2026-11-26', 'Thanksgiving Day'),
('ICE', '2026-12-25', 'Christmas Day');

-- CME Holidays 2024-2026 (same as ICE for most)
INSERT OR IGNORE INTO exchange_holidays (exchange_code, holiday_date, holiday_name) VALUES
('CME', '2024-01-01', 'New Year''s Day'),
('CME', '2024-01-15', 'Martin Luther King Jr. Day'),
('CME', '2024-02-19', 'Presidents Day'),
('CME', '2024-05-27', 'Memorial Day'),
('CME', '2024-07-04', 'Independence Day'),
('CME', '2024-09-02', 'Labor Day'),
('CME', '2024-11-28', 'Thanksgiving Day'),
('CME', '2024-12-25', 'Christmas Day'),
('CME', '2025-01-01', 'New Year''s Day'),
('CME', '2025-01-20', 'Martin Luther King Jr. Day'),
('CME', '2025-02-17', 'Presidents Day'),
('CME', '2025-05-26', 'Memorial Day'),
('CME', '2025-07-04', 'Independence Day'),
('CME', '2025-09-01', 'Labor Day'),
('CME', '2025-11-27', 'Thanksgiving Day'),
('CME', '2025-12-25', 'Christmas Day'),
('CME', '2026-01-01', 'New Year''s Day'),
('CME', '2026-01-19', 'Martin Luther King Jr. Day'),
('CME', '2026-02-16', 'Presidents Day'),
('CME', '2026-05-25', 'Memorial Day'),
('CME', '2026-07-03', 'Independence Day (observed)'),
('CME', '2026-09-07', 'Labor Day'),
('CME', '2026-11-26', 'Thanksgiving Day'),
('CME', '2026-12-25', 'Christmas Day');

-- NYMEX Holidays (same as CME)
INSERT OR IGNORE INTO exchange_holidays (exchange_code, holiday_date, holiday_name)
SELECT 'NYMEX', holiday_date, holiday_name FROM exchange_holidays WHERE exchange_code = 'CME';

-- ============================================================================
-- 14. SEED DATA - ECONOMIC EQUIVALENCE RULES (Natural Gas)
-- ============================================================================

-- Natural Gas equivalence rules (2-day divergence rule)
INSERT OR IGNORE INTO economic_equivalence_rules
(commodity_code, referenced_contract, equivalent_contract, equivalence_type, max_delivery_divergence_days, trading_ratio, rule_notes)
VALUES
('NG', 'HIS', 'HHD', 'NATURAL_GAS', 2, 1.0, 'Henry Index to Henry Swing - 2 day divergence allowed for natural gas'),
('NG', 'HIS', 'HEN', 'NATURAL_GAS', 2, 1.0, 'Henry Index to Henry Basis - 2 day divergence allowed for natural gas'),
('NG', 'HIS', 'HIS', 'NATURAL_GAS', 2, 1.0, 'Henry Index to Henry Index - 2 day divergence allowed for natural gas');

-- Other commodities (1-day divergence rule)
INSERT OR IGNORE INTO economic_equivalence_rules
(commodity_code, referenced_contract, equivalent_contract, equivalence_type, max_delivery_divergence_days, trading_ratio, rule_notes)
VALUES
('CL', 'CL', 'CL', 'LOT_SIZE', 1, 1.0, 'Crude Oil - 1 day divergence allowed'),
('HO', 'HO', 'HO', 'LOT_SIZE', 1, 1.0, 'Heating Oil - 1 day divergence allowed'),
('RB', 'RB', 'RB', 'LOT_SIZE', 1, 1.0, 'RBOB Gasoline - 1 day divergence allowed');

-- ============================================================================
-- 15. SEED DATA - DEFAULT PORTFOLIOS
-- ============================================================================

INSERT OR IGNORE INTO portfolios (portfolio_name, portfolio_code, portfolio_type, is_internal, company_id)
SELECT 'Trading Portfolio', 'TRADE-001', 'TRADING', 0, id FROM companies LIMIT 1;

INSERT OR IGNORE INTO portfolios (portfolio_name, portfolio_code, portfolio_type, is_internal, company_id)
SELECT 'Hedging Portfolio', 'HEDGE-001', 'HEDGING', 0, id FROM companies LIMIT 1;

INSERT OR IGNORE INTO portfolios (portfolio_name, portfolio_code, portfolio_type, is_internal, company_id)
SELECT 'Internal Transfers', 'INTERNAL-001', 'INTERNAL', 1, id FROM companies LIMIT 1;

-- ============================================================================
-- 16. UPDATE EXISTING MARKET_LIMITS WITH DIMINISHING BALANCE FLAGS
-- ============================================================================

-- Mark Henry Index contracts as diminishing balance
UPDATE market_limits
SET diminishing_balance_flag = 1,
    daily_decrease_factor = 0.03333, -- 1/30th per day approximation
    spot_limit_effective_days_before = 5,
    uses_bid_week = 1,
    bid_week_days_count = 5
WHERE commodity_code LIKE '%HIS%' OR contract_name LIKE '%Henry Index%';

-- Mark ICE contracts as using 5-day bid week
UPDATE market_limits
SET uses_bid_week = 1,
    bid_week_days_count = 5
WHERE exchange_code = 'ICE';

-- Mark CME/NYMEX contracts as using 3-day bid week
UPDATE market_limits
SET uses_bid_week = 1,
    bid_week_days_count = 3
WHERE exchange_code IN ('CME', 'NYMEX');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- ✓ Created 8 new tables for CFTC enhancements
-- ✓ Altered 3 existing tables with new columns
-- ✓ Added 25+ indexes for performance
-- ✓ Seeded exchange holidays for 2024-2026
-- ✓ Seeded economic equivalence rules
-- ✓ Seeded default portfolios
-- ✓ Updated market_limits with bid week configuration

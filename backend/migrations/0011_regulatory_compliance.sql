-- Migration 0011: Enhanced Regulatory Compliance
-- Populates exchanges with real regulatory bodies
-- Adds exchange-specific rule enforcement

-- ============================================================================
-- PART 1: Populate Exchanges with ICE, CME, CFTC
-- ============================================================================

-- Insert major regulatory bodies and exchanges
INSERT OR IGNORE INTO exchanges (exchange_code, exchange_name, regulatory_body, country, description, website, contact_email, is_active)
VALUES
  (
    'CFTC',
    'Commodity Futures Trading Commission',
    'US Federal Regulator',
    'United States',
    'U.S. federal regulatory agency for futures and options markets. Enforces position limits and accountability levels.',
    'https://www.cftc.gov',
    'questions@cftc.gov',
    1
  ),
  (
    'ICE',
    'Intercontinental Exchange',
    'CFTC',
    'United States',
    'Global exchange operator for energy, agricultural, and financial markets. Operates ICE Futures U.S. and ICE Futures Europe.',
    'https://www.theice.com',
    'ICEFuturesUS@theice.com',
    1
  ),
  (
    'CME',
    'Chicago Mercantile Exchange',
    'CFTC',
    'United States',
    'Leading derivatives marketplace offering futures and options across asset classes including energy, agriculture, metals, and financials.',
    'https://www.cmegroup.com',
    'info@cmegroup.com',
    1
  ),
  (
    'NYMEX',
    'New York Mercantile Exchange',
    'CFTC',
    'United States',
    'Energy and metals futures exchange, part of CME Group. Primary venue for crude oil, natural gas, and precious metals trading.',
    'https://www.cmegroup.com/markets/energy.html',
    'info@cmegroup.com',
    1
  ),
  (
    'COMEX',
    'Commodity Exchange Inc.',
    'CFTC',
    'United States',
    'Metals futures and options exchange, part of CME Group. Primary marketplace for gold, silver, copper, and aluminum.',
    'https://www.cmegroup.com/markets/metals.html',
    'info@cmegroup.com',
    1
  );

-- ============================================================================
-- PART 2: Add Regulatory Rule Type to Market Limits
-- ============================================================================

-- Add regulatory_rule_type column to market_limits
ALTER TABLE market_limits ADD COLUMN regulatory_rule_type TEXT;

-- Add enforcement_level column (hard_limit, accountability_level, reportable_threshold)
ALTER TABLE market_limits ADD COLUMN enforcement_level TEXT DEFAULT 'hard_limit';

-- Add rule_reference column for regulatory citation
ALTER TABLE market_limits ADD COLUMN rule_reference TEXT;

-- ============================================================================
-- PART 3: Create Regulatory Rules Configuration Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS regulatory_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exchange_id INTEGER NOT NULL,
  rule_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'position_limit', 'accountability_level', 'reportable_threshold', 'exemption'
  commodity_code TEXT,
  limit_category TEXT, -- 'spot_month', 'single_month', 'all_month'
  limit_value REAL,
  threshold_value REAL,
  calculation_method TEXT, -- 'net_long_short', 'gross', 'delta_adjusted'
  enforcement_action TEXT, -- 'block_trade', 'require_approval', 'notify_only', 'report_required'
  effective_date DATE NOT NULL,
  expiration_date DATE,
  rule_reference TEXT, -- CFTC Rule 150.2, ICE Rule 4.15, etc.
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exchange_id) REFERENCES exchanges(id)
);

-- ============================================================================
-- PART 4: Insert Sample Regulatory Rules
-- ============================================================================

-- Get exchange IDs
-- Note: These will be used in the INSERT statements below

-- ICE WTI Crude Oil Position Limits (example based on ICE rules)
INSERT INTO regulatory_rules (
  exchange_id, rule_code, rule_name, rule_type, commodity_code,
  limit_category, limit_value, calculation_method, enforcement_action,
  effective_date, rule_reference, description
)
SELECT
  e.id,
  'ICE-WTI-SPOT',
  'ICE WTI Spot Month Position Limit',
  'position_limit',
  'CL',
  'spot_month',
  10000,
  'net_long_short',
  'block_trade',
  '2024-01-01',
  'ICE Rule 4.15',
  'Hard position limit for WTI Crude Oil spot month contracts'
FROM exchanges e WHERE e.exchange_code = 'ICE';

INSERT INTO regulatory_rules (
  exchange_id, rule_code, rule_name, rule_type, commodity_code,
  limit_category, limit_value, calculation_method, enforcement_action,
  effective_date, rule_reference, description
)
SELECT
  e.id,
  'ICE-WTI-SINGLE',
  'ICE WTI Single Month Accountability Level',
  'accountability_level',
  'CL',
  'single_month',
  20000,
  'net_long_short',
  'require_approval',
  '2024-01-01',
  'ICE Rule 4.15',
  'Accountability level for WTI single month - requires reporting above this level'
FROM exchanges e WHERE e.exchange_code = 'ICE';

INSERT INTO regulatory_rules (
  exchange_id, rule_code, rule_name, rule_type, commodity_code,
  limit_category, limit_value, calculation_method, enforcement_action,
  effective_date, rule_reference, description
)
SELECT
  e.id,
  'ICE-WTI-ALL',
  'ICE WTI All Months Accountability Level',
  'accountability_level',
  'CL',
  'all_month',
  40000,
  'net_long_short',
  'require_approval',
  '2024-01-01',
  'ICE Rule 4.15',
  'Accountability level for WTI all months combined'
FROM exchanges e WHERE e.exchange_code = 'ICE';

-- CFTC Natural Gas Position Limits
INSERT INTO regulatory_rules (
  exchange_id, rule_code, rule_name, rule_type, commodity_code,
  limit_category, limit_value, calculation_method, enforcement_action,
  effective_date, rule_reference, description
)
SELECT
  e.id,
  'CFTC-NG-SPOT',
  'CFTC Natural Gas Spot Month Limit',
  'position_limit',
  'NG',
  'spot_month',
  12000,
  'net_long_short',
  'block_trade',
  '2024-01-01',
  'CFTC Rule 150.2',
  'Federal position limit for natural gas spot month contracts'
FROM exchanges e WHERE e.exchange_code = 'CFTC';

INSERT INTO regulatory_rules (
  exchange_id, rule_code, rule_name, rule_type, commodity_code,
  limit_category, threshold_value, calculation_method, enforcement_action,
  effective_date, rule_reference, description
)
SELECT
  e.id,
  'CFTC-NG-REPORTABLE',
  'CFTC Natural Gas Reportable Position',
  'reportable_threshold',
  'NG',
  'all_month',
  200,
  'net_long_short',
  'report_required',
  '2024-01-01',
  'CFTC Rule 15.00',
  'Threshold requiring large trader reporting to CFTC'
FROM exchanges e WHERE e.exchange_code = 'CFTC';

-- CME Crude Oil Futures
INSERT INTO regulatory_rules (
  exchange_id, rule_code, rule_name, rule_type, commodity_code,
  limit_category, limit_value, calculation_method, enforcement_action,
  effective_date, rule_reference, description
)
SELECT
  e.id,
  'NYMEX-CL-SPOT',
  'NYMEX WTI Spot Month Position Limit',
  'position_limit',
  'CL',
  'spot_month',
  10000,
  'net_long_short',
  'block_trade',
  '2024-01-01',
  'NYMEX Rule 559',
  'Exchange position limit for WTI crude oil spot month'
FROM exchanges e WHERE e.exchange_code = 'NYMEX';

-- ============================================================================
-- PART 5: Create Position Breach Events Table for Real-Time Monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS position_breach_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER,
  trader_id INTEGER,
  limit_calculation_id INTEGER,
  regulatory_rule_id INTEGER,
  breach_type TEXT NOT NULL, -- 'limit_exceeded', 'accountability_triggered', 'reportable_threshold'
  commodity_code TEXT NOT NULL,
  market_location TEXT NOT NULL,
  contract_month DATE,
  limit_type INTEGER NOT NULL, -- 1=spot, 2=single, 3=all
  position_lots REAL NOT NULL,
  limit_value REAL NOT NULL,
  utilization_pct REAL NOT NULL,
  breach_amount REAL, -- How much over the limit
  severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  status TEXT DEFAULT 'open', -- 'open', 'acknowledged', 'resolved', 'exemption_applied'
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at DATETIME,
  acknowledged_by INTEGER,
  resolution_notes TEXT,
  resolved_at DATETIME,
  metadata TEXT, -- JSON for additional context
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (trader_id) REFERENCES users(id),
  FOREIGN KEY (limit_calculation_id) REFERENCES limit_calculations(id),
  FOREIGN KEY (regulatory_rule_id) REFERENCES regulatory_rules(id)
);

CREATE INDEX IF NOT EXISTS idx_breach_events_status ON position_breach_events(status);
CREATE INDEX IF NOT EXISTS idx_breach_events_company ON position_breach_events(company_id);
CREATE INDEX IF NOT EXISTS idx_breach_events_detected ON position_breach_events(detected_at);
CREATE INDEX IF NOT EXISTS idx_breach_events_commodity ON position_breach_events(commodity_code);

-- ============================================================================
-- PART 6: Update Existing Market Limits with Exchange Associations
-- ============================================================================

-- Associate WTI crude oil limits with ICE
UPDATE market_limits
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'ICE'),
    regulatory_rule_type = 'ICE Position Limit',
    enforcement_level = 'hard_limit',
    rule_reference = 'ICE Rule 4.15'
WHERE commodity_code = 'CL' AND exchange_id IS NULL;

-- Associate Natural Gas limits with NYMEX
UPDATE market_limits
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'NYMEX'),
    regulatory_rule_type = 'NYMEX Position Limit',
    enforcement_level = 'hard_limit',
    rule_reference = 'NYMEX Rule 559'
WHERE commodity_code = 'NG' AND exchange_id IS NULL;

-- Associate Gold with COMEX
UPDATE market_limits
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'COMEX'),
    regulatory_rule_type = 'COMEX Position Limit',
    enforcement_level = 'hard_limit',
    rule_reference = 'COMEX Rule 4.16'
WHERE commodity_code LIKE 'GC%' AND exchange_id IS NULL;

-- Default remaining limits to DEFAULT exchange (from migration 0010)
UPDATE market_limits
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'DEFAULT'),
    regulatory_rule_type = 'Exchange Position Limit',
    enforcement_level = 'hard_limit'
WHERE exchange_id IS NULL;

-- ============================================================================
-- PART 7: Create Regulatory Compliance Audit Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS regulatory_compliance_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_date DATE NOT NULL,
  company_id INTEGER,
  exchange_id INTEGER,
  total_positions INTEGER DEFAULT 0,
  breached_positions INTEGER DEFAULT 0,
  accountability_positions INTEGER DEFAULT 0,
  reportable_positions INTEGER DEFAULT 0,
  compliance_score REAL, -- 0-100 percentage
  total_violations INTEGER DEFAULT 0,
  critical_violations INTEGER DEFAULT 0,
  resolved_violations INTEGER DEFAULT 0,
  pending_violations INTEGER DEFAULT 0,
  audit_status TEXT DEFAULT 'pass', -- 'pass', 'warning', 'fail'
  audit_notes TEXT,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (exchange_id) REFERENCES exchanges(id)
);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_date ON regulatory_compliance_audit(audit_date);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_company ON regulatory_compliance_audit(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_exchange ON regulatory_compliance_audit(exchange_id);

-- ============================================================================
-- PART 8: Add Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_regulatory_rules_exchange ON regulatory_rules(exchange_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_rules_commodity ON regulatory_rules(commodity_code);
CREATE INDEX IF NOT EXISTS idx_regulatory_rules_active ON regulatory_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_regulatory_rules_effective ON regulatory_rules(effective_date);

CREATE INDEX IF NOT EXISTS idx_market_limits_regulatory_type ON market_limits(regulatory_rule_type);
CREATE INDEX IF NOT EXISTS idx_market_limits_enforcement ON market_limits(enforcement_level);

-- ============================================================================
-- Success Message
-- ============================================================================
-- Migration 0011 completed successfully
-- - Populated exchanges with ICE, CME, NYMEX, CFTC, COMEX
-- - Added regulatory_rule_type and enforcement_level to market_limits
-- - Created regulatory_rules table for exchange-specific compliance
-- - Created position_breach_events for real-time violation tracking
-- - Created regulatory_compliance_audit for daily compliance reporting
-- - Associated existing market_limits with appropriate exchanges

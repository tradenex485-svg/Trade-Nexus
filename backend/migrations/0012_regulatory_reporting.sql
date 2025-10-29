-- Migration 0012: Regulatory Reporting System
-- Phase 3: Automated regulatory filing and compliance reporting

-- ============================================================================
-- Regulatory Filings Table
-- Tracks all submissions to regulatory bodies (CFTC, ICE, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS regulatory_filings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filing_type TEXT NOT NULL, -- 'cftc_ltrs', 'ice_daily_position', 'cftc_form_40', 'cftc_form_102'
  filing_period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'annual'
  report_date DATE NOT NULL,
  exchange_id INTEGER,
  regulatory_body TEXT NOT NULL, -- 'CFTC', 'ICE', 'CME', 'NYMEX'

  -- Filing status
  status TEXT DEFAULT 'pending', -- 'pending', 'generated', 'submitted', 'accepted', 'rejected', 'failed'
  submission_method TEXT, -- 'api', 'sftp', 'manual', 'email'

  -- File information
  file_format TEXT, -- 'xml', 'csv', 'json', 'fixed_width'
  file_path TEXT,
  file_size INTEGER,
  file_hash TEXT, -- SHA-256 hash for integrity

  -- Submission tracking
  generated_at DATETIME,
  submitted_at DATETIME,
  acknowledged_at DATETIME,
  confirmation_number TEXT,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Metadata
  metadata TEXT, -- JSON: filing-specific data
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (exchange_id) REFERENCES exchanges(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_regulatory_filings_type_date ON regulatory_filings(filing_type, report_date);
CREATE INDEX idx_regulatory_filings_status ON regulatory_filings(status);
CREATE INDEX idx_regulatory_filings_body ON regulatory_filings(regulatory_body);
CREATE INDEX idx_regulatory_filings_submitted ON regulatory_filings(submitted_at);

-- ============================================================================
-- Filing Line Items Table
-- Detailed position data included in each regulatory filing
-- ============================================================================
CREATE TABLE IF NOT EXISTS filing_line_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filing_id INTEGER NOT NULL,

  -- Position identification
  commodity_code TEXT NOT NULL,
  contract_month TEXT,
  market_location TEXT,
  exchange_code TEXT,

  -- Position data
  long_position INTEGER DEFAULT 0,
  short_position INTEGER DEFAULT 0,
  net_position INTEGER DEFAULT 0,
  spread_position INTEGER DEFAULT 0,

  -- Limit information
  limit_type TEXT, -- 'spot_month', 'single_month', 'all_month'
  applicable_limit INTEGER,
  utilization_pct REAL,

  -- Exemptions
  hedge_exemption INTEGER DEFAULT 0,
  exemption_type TEXT,

  -- Trader identification (for LTRS)
  trader_classification TEXT, -- 'commercial', 'non_commercial', 'reportable', 'non_reportable'
  account_id TEXT,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (filing_id) REFERENCES regulatory_filings(id) ON DELETE CASCADE
);

CREATE INDEX idx_filing_line_items_filing ON filing_line_items(filing_id);
CREATE INDEX idx_filing_line_items_commodity ON filing_line_items(commodity_code);

-- ============================================================================
-- Regulatory Thresholds Table
-- Defines reportable thresholds for different regulatory bodies
-- ============================================================================
CREATE TABLE IF NOT EXISTS regulatory_thresholds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  regulatory_body TEXT NOT NULL,
  threshold_type TEXT NOT NULL, -- 'reportable_position', 'accountability_level', 'position_limit'
  commodity_code TEXT,
  exchange_id INTEGER,

  -- Threshold values
  threshold_value INTEGER NOT NULL,
  threshold_unit TEXT DEFAULT 'lots', -- 'lots', 'contracts', 'bushels'

  -- Effective dates
  effective_from DATE NOT NULL,
  effective_to DATE,

  -- Rule reference
  rule_reference TEXT,
  rule_description TEXT,

  -- Metadata
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (exchange_id) REFERENCES exchanges(id)
);

CREATE INDEX idx_regulatory_thresholds_body ON regulatory_thresholds(regulatory_body);
CREATE INDEX idx_regulatory_thresholds_commodity ON regulatory_thresholds(commodity_code);
CREATE INDEX idx_regulatory_thresholds_active ON regulatory_thresholds(is_active, effective_from);

-- ============================================================================
-- Filing Templates Table
-- Stores templates for different regulatory report formats
-- ============================================================================
CREATE TABLE IF NOT EXISTS filing_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filing_type TEXT NOT NULL UNIQUE,
  regulatory_body TEXT NOT NULL,

  -- Template configuration
  template_name TEXT NOT NULL,
  template_version TEXT,
  file_format TEXT NOT NULL,

  -- Field mappings
  field_mappings TEXT, -- JSON: maps our data fields to regulatory format fields
  validation_rules TEXT, -- JSON: format-specific validation rules

  -- Submission details
  submission_endpoint TEXT,
  submission_frequency TEXT,
  submission_deadline TEXT, -- e.g., "T+1 17:00 EST"

  -- Documentation
  documentation_url TEXT,
  example_file TEXT,

  -- Metadata
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Compliance Audit Trail Table
-- Enhanced audit logging specifically for regulatory compliance
-- ============================================================================
CREATE TABLE IF NOT EXISTS compliance_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_type TEXT NOT NULL, -- 'position_calculation', 'limit_breach', 'filing_submission', 'rule_change'

  -- Related entities
  entity_type TEXT, -- 'position', 'filing', 'rule', 'threshold'
  entity_id INTEGER,

  -- Change tracking
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'submit', 'approve', 'reject'
  old_value TEXT, -- JSON
  new_value TEXT, -- JSON

  -- Regulatory context
  regulatory_body TEXT,
  compliance_status TEXT, -- 'compliant', 'non_compliant', 'under_review', 'remediated'

  -- User tracking
  user_id INTEGER,
  user_email TEXT,
  user_role TEXT,

  -- Timestamp
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Additional context
  metadata TEXT, -- JSON

  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_compliance_audit_type ON compliance_audit_log(audit_type);
CREATE INDEX idx_compliance_audit_entity ON compliance_audit_log(entity_type, entity_id);
CREATE INDEX idx_compliance_audit_timestamp ON compliance_audit_log(timestamp);
CREATE INDEX idx_compliance_audit_body ON compliance_audit_log(regulatory_body);

-- ============================================================================
-- Seed Data: Filing Templates
-- ============================================================================

-- CFTC Large Trader Reporting System (LTRS)
INSERT INTO filing_templates (
  filing_type, regulatory_body, template_name, template_version,
  file_format, submission_frequency, submission_deadline,
  documentation_url, is_active
) VALUES (
  'cftc_ltrs',
  'CFTC',
  'Large Trader Reporting System (Form 40/102 S)',
  'v2.0',
  'xml',
  'daily',
  'T+1 09:00 EST',
  'https://www.cftc.gov/LawRegulation/DoddFrankAct/Rulemakings/DF_21_LargeTraderReport/index.htm',
  1
);

-- ICE Daily Position Report
INSERT INTO filing_templates (
  filing_type, regulatory_body, template_name, template_version,
  file_format, submission_frequency, submission_deadline,
  documentation_url, is_active
) VALUES (
  'ice_daily_position',
  'ICE',
  'ICE Daily Position Report',
  'v1.5',
  'csv',
  'daily',
  'T+0 18:00 EST',
  'https://www.theice.com/futures-us/regulation',
  1
);

-- CFTC Form 40 (Reportable Trader Identification)
INSERT INTO filing_templates (
  filing_type, regulatory_body, template_name, template_version,
  file_format, submission_frequency, submission_deadline,
  documentation_url, is_active
) VALUES (
  'cftc_form_40',
  'CFTC',
  'Statement of Reporting Trader',
  'v3.0',
  'xml',
  'as_needed',
  'Within 10 business days',
  'https://www.cftc.gov/Forms/form40.html',
  1
);

-- CME Position Report
INSERT INTO filing_templates (
  filing_type, regulatory_body, template_name, template_version,
  file_format, submission_frequency, submission_deadline,
  documentation_url, is_active
) VALUES (
  'cme_position_report',
  'CME',
  'CME Daily Position Report',
  'v2.1',
  'csv',
  'daily',
  'T+0 17:30 CST',
  'https://www.cmegroup.com/market-regulation/position-limits.html',
  1
);

-- ============================================================================
-- Seed Data: Regulatory Thresholds
-- ============================================================================

-- CFTC Reportable Positions (example thresholds)
INSERT INTO regulatory_thresholds (
  regulatory_body, threshold_type, commodity_code,
  threshold_value, effective_from, rule_reference, rule_description, is_active
) VALUES
-- Corn
('CFTC', 'reportable_position', 'C', 250, '2020-01-01', '17 CFR § 16.00', 'CFTC Reportable Position - Corn', 1),
-- Soybeans
('CFTC', 'reportable_position', 'S', 250, '2020-01-01', '17 CFR § 16.00', 'CFTC Reportable Position - Soybeans', 1),
-- Wheat
('CFTC', 'reportable_position', 'W', 150, '2020-01-01', '17 CFR § 16.00', 'CFTC Reportable Position - Wheat', 1),
-- Crude Oil
('CFTC', 'reportable_position', 'CL', 350, '2020-01-01', '17 CFR § 16.00', 'CFTC Reportable Position - Crude Oil', 1),
-- Natural Gas
('CFTC', 'reportable_position', 'NG', 200, '2020-01-01', '17 CFR § 16.00', 'CFTC Reportable Position - Natural Gas', 1),
-- Gold
('CFTC', 'reportable_position', 'GC', 100, '2020-01-01', '17 CFR § 16.00', 'CFTC Reportable Position - Gold', 1),
-- Silver
('CFTC', 'reportable_position', 'SI', 150, '2020-01-01', '17 CFR § 16.00', 'CFTC Reportable Position - Silver', 1);

-- CFTC Accountability Levels (higher than reportable, lower than hard limits)
INSERT INTO regulatory_thresholds (
  regulatory_body, threshold_type, commodity_code,
  threshold_value, effective_from, rule_reference, rule_description, is_active
) VALUES
-- Corn
('CFTC', 'accountability_level', 'C', 5000, '2020-01-01', '17 CFR § 150.5', 'CFTC Accountability Level - Corn', 1),
-- Soybeans
('CFTC', 'accountability_level', 'S', 5000, '2020-01-01', '17 CFR § 150.5', 'CFTC Accountability Level - Soybeans', 1),
-- Crude Oil
('CFTC', 'accountability_level', 'CL', 10000, '2020-01-01', '17 CFR § 150.5', 'CFTC Accountability Level - Crude Oil', 1);

-- ============================================================================
-- Views for Reporting
-- ============================================================================

-- View: Recent Filing Status
CREATE VIEW IF NOT EXISTS v_filing_status AS
SELECT
  rf.id,
  rf.filing_type,
  rf.filing_period,
  rf.report_date,
  rf.regulatory_body,
  e.exchange_name,
  rf.status,
  rf.submission_method,
  rf.generated_at,
  rf.submitted_at,
  rf.acknowledged_at,
  rf.confirmation_number,
  rf.error_message,
  COUNT(fli.id) as line_item_count,
  u.email as created_by_email
FROM regulatory_filings rf
LEFT JOIN exchanges e ON rf.exchange_id = e.id
LEFT JOIN filing_line_items fli ON rf.id = fli.filing_id
LEFT JOIN users u ON rf.created_by = u.id
GROUP BY rf.id
ORDER BY rf.report_date DESC, rf.created_at DESC;

-- View: Positions Requiring Reporting
CREATE VIEW IF NOT EXISTS v_reportable_positions AS
SELECT
  lc.id,
  lc.reporting_limit_code as commodity_code,
  lc.mkt_index as market_location,
  lc.contract_month,
  lc.limit_type,
  lc.pos_lots as net_position,
  ml.spot_month_limit,
  ml.one_month_limit,
  ml.all_month_limit,
  rt.threshold_value as reportable_threshold,
  rt.regulatory_body,
  CASE
    WHEN ABS(lc.pos_lots) >= rt.threshold_value THEN 1
    ELSE 0
  END as is_reportable,
  lc.calculated_at
FROM limit_calculations lc
JOIN market_limits ml ON lc.reporting_limit_code = ml.commodity_code
LEFT JOIN regulatory_thresholds rt ON
  rt.commodity_code = ml.commodity_code
  AND rt.threshold_type = 'reportable_position'
  AND rt.is_active = 1
WHERE lc.is_active = 1
  AND lc.is_parent = 1
ORDER BY ABS(lc.pos_lots) DESC;

-- View: Filing Schedule
CREATE VIEW IF NOT EXISTS v_filing_schedule AS
SELECT
  ft.filing_type,
  ft.regulatory_body,
  ft.template_name,
  ft.submission_frequency,
  ft.submission_deadline,
  COUNT(CASE WHEN rf.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN rf.status = 'submitted' THEN 1 END) as submitted_today,
  MAX(rf.submitted_at) as last_submission,
  ft.is_active
FROM filing_templates ft
LEFT JOIN regulatory_filings rf ON
  rf.filing_type = ft.filing_type
  AND DATE(rf.report_date) = DATE('now')
GROUP BY ft.filing_type
ORDER BY ft.regulatory_body, ft.filing_type;

-- ============================================================================
-- Triggers for Audit Trail
-- ============================================================================

-- Trigger: Log filing status changes
CREATE TRIGGER IF NOT EXISTS trg_filing_audit
AFTER UPDATE ON regulatory_filings
FOR EACH ROW
WHEN OLD.status != NEW.status
BEGIN
  INSERT INTO compliance_audit_log (
    audit_type, entity_type, entity_id,
    action, old_value, new_value,
    regulatory_body, timestamp
  ) VALUES (
    'filing_submission',
    'filing',
    NEW.id,
    'status_change',
    json_object('status', OLD.status, 'submitted_at', OLD.submitted_at),
    json_object('status', NEW.status, 'submitted_at', NEW.submitted_at),
    NEW.regulatory_body,
    CURRENT_TIMESTAMP
  );
END;

-- Trigger: Log threshold changes
CREATE TRIGGER IF NOT EXISTS trg_threshold_audit
AFTER UPDATE ON regulatory_thresholds
FOR EACH ROW
BEGIN
  INSERT INTO compliance_audit_log (
    audit_type, entity_type, entity_id,
    action, old_value, new_value,
    regulatory_body, timestamp
  ) VALUES (
    'rule_change',
    'threshold',
    NEW.id,
    'update',
    json_object('threshold_value', OLD.threshold_value, 'effective_from', OLD.effective_from),
    json_object('threshold_value', NEW.threshold_value, 'effective_from', NEW.effective_from),
    NEW.regulatory_body,
    CURRENT_TIMESTAMP
  );
END;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Summary of changes:
-- ✅ Created regulatory_filings table for tracking submissions
-- ✅ Created filing_line_items table for position data
-- ✅ Created regulatory_thresholds table for reportable limits
-- ✅ Created filing_templates table for format definitions
-- ✅ Created compliance_audit_log for enhanced audit trail
-- ✅ Added indexes for performance
-- ✅ Seeded filing templates (CFTC LTRS, ICE, CME)
-- ✅ Seeded regulatory thresholds (CFTC reportable positions)
-- ✅ Created views for reporting and monitoring
-- ✅ Added triggers for automatic audit logging

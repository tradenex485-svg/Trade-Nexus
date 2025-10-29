-- Trade Nexus Database Schema
-- Migration: 0008_data_quality.sql
-- Phase 7: Data Quality & Validation

-- Data Quality Rules Configuration
CREATE TABLE IF NOT EXISTS data_quality_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- 'required_field', 'numeric_range', 'date_range', 'format', 'referential_integrity', 'duplicate', 'custom_sql'
    target_table TEXT NOT NULL,
    target_field TEXT,
    rule_config TEXT NOT NULL, -- JSON configuration
    severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    is_active INTEGER DEFAULT 1,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Data Quality Check Execution History
CREATE TABLE IF NOT EXISTS data_quality_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    check_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_records INTEGER DEFAULT 0,
    issues_found INTEGER DEFAULT 0,
    quality_score REAL DEFAULT 0, -- 0-100 scale
    completeness_score REAL DEFAULT 0,
    accuracy_score REAL DEFAULT 0,
    consistency_score REAL DEFAULT 0,
    timeliness_score REAL DEFAULT 0,
    uniqueness_score REAL DEFAULT 0,
    integrity_score REAL DEFAULT 0,
    check_duration_ms INTEGER DEFAULT 0,
    triggered_by TEXT, -- 'manual', 'scheduled', 'import'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Data Quality Issues Log
CREATE TABLE IF NOT EXISTS data_quality_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    check_id INTEGER,
    rule_id INTEGER,
    issue_type TEXT NOT NULL, -- 'duplicate', 'missing_data', 'invalid_value', 'orphaned_record', 'referential_integrity', 'format_error'
    severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    table_name TEXT NOT NULL,
    record_id INTEGER,
    field_name TEXT,
    issue_description TEXT NOT NULL,
    current_value TEXT,
    suggested_fix TEXT,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'resolved', 'ignored', 'auto_fixed'
    resolved_at DATETIME,
    resolved_by INTEGER,
    resolution_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (check_id) REFERENCES data_quality_checks(id),
    FOREIGN KEY (rule_id) REFERENCES data_quality_rules(id)
);

-- Data Reconciliation Tracking
CREATE TABLE IF NOT EXISTS data_reconciliation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reconciliation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source_table TEXT NOT NULL,
    target_table TEXT NOT NULL,
    source_count INTEGER DEFAULT 0,
    target_count INTEGER DEFAULT 0,
    matched_count INTEGER DEFAULT 0,
    unmatched_source INTEGER DEFAULT 0,
    unmatched_target INTEGER DEFAULT 0,
    reconciliation_key TEXT NOT NULL, -- field(s) used for matching
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    discrepancies TEXT, -- JSON array of discrepancies
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- File Upload History and Validation
CREATE TABLE IF NOT EXISTS file_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'csv', 'xlsx', 'json'
    file_size INTEGER DEFAULT 0,
    target_table TEXT NOT NULL,
    uploaded_by INTEGER,
    upload_status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed', 'partial'
    total_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    invalid_rows INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    validation_errors TEXT, -- JSON array of errors
    processing_time_ms INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Data Lineage Tracking
CREATE TABLE IF NOT EXISTS data_lineage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_table TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    target_table TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    transformation TEXT, -- description of transformation applied
    transformation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    upload_id INTEGER, -- link to file_uploads if from file
    created_by INTEGER,
    metadata TEXT, -- JSON metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_id) REFERENCES file_uploads(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Seed default quality rules
INSERT INTO data_quality_rules (rule_name, rule_type, target_table, target_field, rule_config, severity, description) VALUES
-- Required field checks
('Transactions: Market Location Required', 'required_field', 'transactions', 'market_location', '{"field":"market_location"}', 'critical', 'Market location must be provided for all transactions'),
('Transactions: Contract Month Required', 'required_field', 'transactions', 'contract_month', '{"field":"contract_month"}', 'critical', 'Contract month must be provided for all transactions'),
('Transactions: Trade Date Required', 'required_field', 'transactions', 'trade_date', '{"field":"trade_date"}', 'critical', 'Trade date must be provided for all transactions'),

-- Numeric range checks
('Market Limits: Positive Spot Month Limit', 'numeric_range', 'market_limits', 'spot_month_limit', '{"field":"spot_month_limit","min":0,"max":null}', 'high', 'Spot month limit must be non-negative'),
('Limit Calculations: Valid Position Percentage', 'numeric_range', 'limit_calculations', 'pos_pct', '{"field":"pos_pct","min":0,"max":200}', 'high', 'Position percentage should be between 0-200%'),

-- Referential integrity checks
('Transactions: Valid Market Location', 'referential_integrity', 'transactions', 'market_location', '{"source_table":"transactions","source_field":"market_location","target_table":"mapping","target_field":"market_location"}', 'high', 'Transaction market location must exist in mapping table'),
('Limit Calculations: Valid Reporting Code', 'referential_integrity', 'limit_calculations', 'reporting_limit_code', '{"source_table":"limit_calculations","source_field":"reporting_limit_code","target_table":"market_limits","target_field":"commodity_code"}', 'medium', 'Reporting limit code must exist in market limits'),

-- Duplicate detection
('Transactions: Duplicate Detection', 'duplicate', 'transactions', null, '{"fields":["market_location","contract_month","trade_date"],"group_by":["market_location","contract_month","trade_date"],"having":"COUNT(*) > 1"}', 'medium', 'Detect duplicate transaction records'),
('Market Limits: Duplicate Detection', 'duplicate', 'market_limits', null, '{"fields":["commodity_code","contract_name","effective_date"],"group_by":["commodity_code","contract_name","effective_date"],"having":"COUNT(*) > 1"}', 'high', 'Detect duplicate market limit records'),

-- Date range checks
('Transactions: Valid Contract Month', 'date_range', 'transactions', 'contract_month', '{"field":"contract_month","min_date":"2020-01-01","max_date":"2030-12-31"}', 'medium', 'Contract month should be within reasonable range'),
('Transactions: Trade Date Not Future', 'custom_sql', 'transactions', 'trade_date', '{"query":"SELECT id, trade_date FROM transactions WHERE trade_date > DATE(''now'')","issue_description":"Trade date is in the future"}', 'high', 'Trade date should not be in the future');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_quality_checks_date ON data_quality_checks(check_date);
CREATE INDEX IF NOT EXISTS idx_data_quality_issues_status ON data_quality_issues(status);
CREATE INDEX IF NOT EXISTS idx_data_quality_issues_severity ON data_quality_issues(severity);
CREATE INDEX IF NOT EXISTS idx_data_quality_issues_table ON data_quality_issues(table_name);
CREATE INDEX IF NOT EXISTS idx_data_quality_issues_check_id ON data_quality_issues(check_id);
CREATE INDEX IF NOT EXISTS idx_data_reconciliation_date ON data_reconciliation(reconciliation_date);
CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON file_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_data_lineage_source ON data_lineage(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_data_lineage_target ON data_lineage(target_table, target_id);

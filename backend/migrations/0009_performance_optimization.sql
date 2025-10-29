-- Trade Nexus Database Schema
-- Migration: 0009_performance_optimization.sql
-- Phase 8: Performance & Scalability

-- Additional composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_limit_calc_type_active_parent ON limit_calculations(limit_type, is_active, is_parent);
CREATE INDEX IF NOT EXISTS idx_limit_calc_reporting_type ON limit_calculations(reporting_limit_code, limit_type);
CREATE INDEX IF NOT EXISTS idx_limit_calc_prioritization_type ON limit_calculations(prioritization, limit_type, is_active);
CREATE INDEX IF NOT EXISTS idx_limit_calc_date_type ON limit_calculations(as_of_date, limit_type);

-- Time-series query optimization
CREATE INDEX IF NOT EXISTS idx_limit_series_date_mkt ON limit_calculation_series(as_of_date, mkt_index, limit_type);
CREATE INDEX IF NOT EXISTS idx_limit_series_type_date ON limit_calculation_series(limit_type, as_of_date);

-- Transaction query optimization
CREATE INDEX IF NOT EXISTS idx_transactions_date_location ON transactions(trade_date, market_location);
CREATE INDEX IF NOT EXISTS idx_transactions_month_location ON transactions(contract_month, market_location);
CREATE INDEX IF NOT EXISTS idx_temp_trans_location_month ON temp_transactions(market_location, contract_month);

-- Mapping optimization for joins
CREATE INDEX IF NOT EXISTS idx_mapping_location_commodity ON mapping(market_location, commodity_code);
CREATE INDEX IF NOT EXISTS idx_mapping_commodity_contract ON mapping(commodity_code, contract_name);

-- Market limits optimization
CREATE INDEX IF NOT EXISTS idx_market_limits_code_name ON market_limits(commodity_code, contract_name);
CREATE INDEX IF NOT EXISTS idx_market_limits_effective ON market_limits(effective_date);
CREATE INDEX IF NOT EXISTS idx_market_limits_active ON market_limits(is_active);

-- Alerts optimization
CREATE INDEX IF NOT EXISTS idx_alerts_read_created ON alerts(read, created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_severity_read ON alerts(severity, read);

-- Pre-trade checks optimization
CREATE INDEX IF NOT EXISTS idx_pre_trade_validation_created ON pre_trade_checks(validation_status, created_at);
CREATE INDEX IF NOT EXISTS idx_pre_trade_risk_level ON pre_trade_checks(risk_level);

-- Trade approvals optimization
CREATE INDEX IF NOT EXISTS idx_approvals_status_requested ON trade_approvals(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_approvals_urgency_status ON trade_approvals(urgency, status);

-- Audit logs optimization (if table exists)
-- CREATE INDEX IF NOT EXISTS idx_audit_table_action ON audit_logs(table_name, action);
-- CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- Risk scenarios optimization (if table exists)
-- CREATE INDEX IF NOT EXISTS idx_risk_results_scenario_date ON risk_scenario_results(scenario_id, execution_date);

-- Data quality optimization (if tables exist)
-- CREATE INDEX IF NOT EXISTS idx_quality_checks_date ON data_quality_checks(check_date DESC);
-- CREATE INDEX IF NOT EXISTS idx_quality_issues_table_severity ON data_quality_issues(table_name, severity);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    query_count INTEGER DEFAULT 0,
    cache_hit INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cache statistics table
CREATE TABLE IF NOT EXISTS cache_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT NOT NULL,
    hit_count INTEGER DEFAULT 0,
    miss_count INTEGER DEFAULT 0,
    last_hit DATETIME,
    last_miss DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL, -- IP or user ID
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 0,
    window_start DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(identifier, endpoint, window_start)
);

-- Materialized aggregations for dashboard (updated periodically)
CREATE TABLE IF NOT EXISTS dashboard_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT UNIQUE NOT NULL,
    cache_data TEXT NOT NULL, -- JSON data
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance tracking
CREATE INDEX IF NOT EXISTS idx_perf_metrics_endpoint ON performance_metrics(endpoint, created_at);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_created ON performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_cache_stats_key ON cache_statistics(cache_key);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_key ON dashboard_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_expires ON dashboard_cache(expires_at);

-- Rate limit indexes (note: identifiers are composite, so we use rowid for basic indexing)
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint_window ON rate_limits(endpoint, window_start);

-- Cleanup old performance metrics (older than 7 days)
-- This would be handled by a scheduled job, but we define the structure here

-- Query performance view for monitoring
CREATE VIEW IF NOT EXISTS v_slow_queries AS
SELECT
    endpoint,
    method,
    AVG(response_time_ms) as avg_response_time,
    MAX(response_time_ms) as max_response_time,
    COUNT(*) as request_count,
    COUNT(CASE WHEN response_time_ms > 1000 THEN 1 END) as slow_count
FROM performance_metrics
WHERE created_at >= datetime('now', '-1 day')
GROUP BY endpoint, method
HAVING avg_response_time > 500
ORDER BY avg_response_time DESC;

-- Cache efficiency view
CREATE VIEW IF NOT EXISTS v_cache_efficiency AS
SELECT
    cache_key,
    hit_count,
    miss_count,
    ROUND(CAST(hit_count AS REAL) / NULLIF(hit_count + miss_count, 0) * 100, 2) as hit_rate,
    last_hit,
    last_miss
FROM cache_statistics
WHERE hit_count + miss_count > 0
ORDER BY hit_count + miss_count DESC;

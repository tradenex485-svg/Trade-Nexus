-- Advanced Risk Management System
-- Migration: 0007_advanced_risk.sql

-- Risk Scenarios (predefined and custom market scenarios)
CREATE TABLE IF NOT EXISTS risk_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_name TEXT NOT NULL,
    scenario_type TEXT NOT NULL, -- 'market_crash', 'volatility_spike', 'commodity_shock', 'custom'
    description TEXT,

    -- Scenario parameters (JSON)
    parameters TEXT NOT NULL, -- JSON: { "NG_shock": -20, "HO_shock": -15, "volatility_multiplier": 2.5 }

    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'extreme'
    is_active INTEGER DEFAULT 1,
    is_system_scenario INTEGER DEFAULT 0, -- system scenarios cannot be deleted

    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Portfolio VaR History (Value at Risk tracking)
CREATE TABLE IF NOT EXISTS portfolio_var_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    as_of_date DATE NOT NULL,

    -- VaR calculations
    var_95_historical REAL, -- 95% confidence VaR using historical simulation
    var_99_historical REAL, -- 99% confidence VaR
    var_95_parametric REAL, -- 95% confidence VaR using parametric method
    var_99_parametric REAL, -- 99% confidence VaR
    var_95_monte_carlo REAL, -- 95% confidence VaR using Monte Carlo
    var_99_monte_carlo REAL, -- 99% confidence VaR

    -- Portfolio metrics
    total_exposure REAL,
    total_limit REAL,
    portfolio_utilization_pct REAL,

    -- Risk metrics
    concentration_score REAL, -- Herfindahl index (0-100)
    diversification_ratio REAL,
    largest_position_pct REAL,

    -- Volatility metrics
    portfolio_volatility REAL,
    avg_position_volatility REAL,

    calculation_method TEXT DEFAULT 'historical',
    confidence_level REAL DEFAULT 95,
    lookback_days INTEGER DEFAULT 30,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Risk Metrics Cache (for performance optimization)
CREATE TABLE IF NOT EXISTS risk_metrics_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_key TEXT NOT NULL UNIQUE,
    metric_value TEXT NOT NULL, -- JSON value
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Commodity Correlations (correlation matrix storage)
CREATE TABLE IF NOT EXISTS commodity_correlations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commodity_1 TEXT NOT NULL,
    commodity_2 TEXT NOT NULL,
    correlation_coefficient REAL NOT NULL, -- -1 to 1

    calculation_period_days INTEGER DEFAULT 30,
    as_of_date DATE NOT NULL,
    sample_size INTEGER,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(commodity_1, commodity_2, as_of_date)
);

-- Risk Scenario Results (scenario analysis results)
CREATE TABLE IF NOT EXISTS risk_scenario_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_id INTEGER NOT NULL,
    run_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Pre-shock state
    pre_shock_var_95 REAL,
    pre_shock_utilization_pct REAL,
    pre_shock_exposure REAL,

    -- Post-shock state
    post_shock_var_95 REAL,
    post_shock_utilization_pct REAL,
    post_shock_exposure REAL,
    post_shock_breaches INTEGER,

    -- Impact metrics
    var_impact_pct REAL,
    utilization_impact_pct REAL,
    new_breaches INTEGER,
    new_near_breaches INTEGER,

    -- Detailed results (JSON)
    position_impacts TEXT, -- JSON array of position-level impacts
    worst_affected_positions TEXT, -- JSON array of top N worst positions

    FOREIGN KEY (scenario_id) REFERENCES risk_scenarios(id)
);

-- Risk Alerts Configuration
CREATE TABLE IF NOT EXISTS risk_alert_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_name TEXT NOT NULL,
    alert_type TEXT NOT NULL, -- 'var_breach', 'concentration_limit', 'stress_test_failure'

    threshold_value REAL NOT NULL,
    comparison_operator TEXT NOT NULL, -- '>', '<', '>=', '<=', '='

    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    notification_channels TEXT, -- JSON: ["email", "dashboard", "sms"]

    is_active INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Risk Alert History
CREATE TABLE IF NOT EXISTS risk_alert_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_config_id INTEGER NOT NULL,

    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    alert_message TEXT NOT NULL,
    metric_value REAL NOT NULL,
    threshold_value REAL NOT NULL,

    severity TEXT,
    is_acknowledged INTEGER DEFAULT 0,
    acknowledged_by INTEGER,
    acknowledged_at DATETIME,
    acknowledgment_notes TEXT,

    FOREIGN KEY (alert_config_id) REFERENCES risk_alert_configs(id),
    FOREIGN KEY (acknowledged_by) REFERENCES users(id)
);

-- Insert default risk scenarios
INSERT INTO risk_scenarios (scenario_name, scenario_type, description, parameters, severity, is_system_scenario) VALUES
    (
        'Market Crash -20%',
        'market_crash',
        'Simulates a severe market downturn with 20% price decline across all commodities',
        '{"global_shock": -20, "volatility_multiplier": 2.0}',
        'extreme',
        1
    ),
    (
        'Market Crash -10%',
        'market_crash',
        'Simulates a moderate market downturn with 10% price decline',
        '{"global_shock": -10, "volatility_multiplier": 1.5}',
        'high',
        1
    ),
    (
        'Volatility Spike 3x',
        'volatility_spike',
        'Simulates a tripling of market volatility while keeping prices stable',
        '{"volatility_multiplier": 3.0}',
        'high',
        1
    ),
    (
        'Natural Gas Shock -30%',
        'commodity_shock',
        'Simulates a severe drop in natural gas prices',
        '{"NG_shock": -30, "volatility_multiplier": 1.5}',
        'high',
        1
    ),
    (
        'Energy Crisis +40%',
        'commodity_shock',
        'Simulates an energy crisis with sharp price increases',
        '{"global_shock": 40, "volatility_multiplier": 2.0}',
        'extreme',
        1
    );

-- Insert default risk alert configurations
INSERT INTO risk_alert_configs (alert_name, alert_type, threshold_value, comparison_operator, severity) VALUES
    ('VaR 95% Breach', 'var_breach', 1000000, '>', 'high'),
    ('High Concentration Risk', 'concentration_limit', 60, '>', 'medium'),
    ('Portfolio Utilization Critical', 'concentration_limit', 90, '>', 'critical');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_scenarios_type ON risk_scenarios(scenario_type);
CREATE INDEX IF NOT EXISTS idx_risk_scenarios_is_active ON risk_scenarios(is_active);

CREATE INDEX IF NOT EXISTS idx_var_history_date ON portfolio_var_history(as_of_date);

CREATE INDEX IF NOT EXISTS idx_correlations_date ON commodity_correlations(as_of_date);
CREATE INDEX IF NOT EXISTS idx_correlations_commodity1 ON commodity_correlations(commodity_1);
CREATE INDEX IF NOT EXISTS idx_correlations_commodity2 ON commodity_correlations(commodity_2);

CREATE INDEX IF NOT EXISTS idx_scenario_results_scenario_id ON risk_scenario_results(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_results_run_at ON risk_scenario_results(run_at);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_type ON risk_alert_configs(alert_type);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_is_active ON risk_alert_configs(is_active);

CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON risk_alert_history(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_history_acknowledged ON risk_alert_history(is_acknowledged);

CREATE INDEX IF NOT EXISTS idx_metrics_cache_key ON risk_metrics_cache(metric_key);
CREATE INDEX IF NOT EXISTS idx_metrics_cache_expires ON risk_metrics_cache(expires_at);

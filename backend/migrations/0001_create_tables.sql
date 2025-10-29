-- Trade Nexus Database Schema for Cloudflare D1
-- Migration: 0001_create_tables.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scopes table
CREATE TABLE IF NOT EXISTS scopes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope_name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User scopes pivot table
CREATE TABLE IF NOT EXISTS user_scopes (
    user_id INTEGER NOT NULL,
    scope_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, scope_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (scope_id) REFERENCES scopes(id) ON DELETE CASCADE
);

-- Market Limits (regulatory configuration)
CREATE TABLE IF NOT EXISTS market_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule TEXT,
    contract_name TEXT NOT NULL,
    commodity_code TEXT NOT NULL,
    market_type TEXT,
    contract_size REAL,
    unit_of_trading TEXT,
    spot_month_limit REAL,
    spot_month_limit2 REAL,
    spot_month_conditional_limit REAL,
    spot_month_accountability_level REAL,
    single_month_accountability_level REAL,
    single_month_accountability_level2 REAL,
    all_month_accountability_level REAL,
    all_month_accountability_level2 REAL,
    aggregate_1_positive_correlation TEXT,
    aggregate_2_negative_correlation TEXT,
    exchange_reportable_level REAL,
    exchange_code TEXT,
    is_parent INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    effective_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Mapping (market location to commodity code)
CREATE TABLE IF NOT EXISTS mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_name TEXT NOT NULL,
    market_location TEXT NOT NULL,
    commodity_code TEXT NOT NULL,
    unit_of_trading TEXT,
    aggregate_1_positive_correlation TEXT,
    aggregate_2_negative_correlation TEXT,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transactions (raw trading data)
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_location TEXT NOT NULL,
    contract_month DATE NOT NULL,
    base_delta_notnl_nd REAL NOT NULL,
    index_uom TEXT,
    trade_date DATE NOT NULL,
    status INTEGER DEFAULT 0,
    frequency INTEGER DEFAULT 0,
    exchange TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Temporary transactions (aggregated staging)
CREATE TABLE IF NOT EXISTS temp_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_location TEXT NOT NULL,
    contract_month DATE NOT NULL,
    base_delta_notnl_nd REAL,
    total_buy REAL,
    total_sale REAL,
    index_uom TEXT,
    frequency INTEGER,
    exchange TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Power Data (energy market data)
CREATE TABLE IF NOT EXISTS power_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exchange_product_code TEXT NOT NULL,
    contract_month DATE NOT NULL,
    net_position REAL,
    base_delta_notnl_nd REAL,
    base_delta_notnl REAL,
    product_description TEXT,
    commodity TEXT,
    index_uom TEXT,
    trading_date DATE,
    status INTEGER DEFAULT 0,
    trans_type INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Limit Calculations (core calculation results)
CREATE TABLE IF NOT EXISTS limit_calculations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    as_of_date DATE NOT NULL,
    mkt_index TEXT NOT NULL,
    contract_month DATE NOT NULL,
    reporting_limit_code TEXT NOT NULL,
    child_code TEXT,
    limit_lots REAL NOT NULL,
    limit_exemption REAL DEFAULT 0,
    lot_size REAL,
    pos_lots REAL NOT NULL,
    pos_pct REAL NOT NULL,
    total_pos_lots REAL,
    total_pos_pct REAL,
    current_update REAL,
    total_sale REAL,
    total_buy REAL,
    prioritization TEXT NOT NULL,
    limit_type INTEGER NOT NULL,
    is_parent INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    frequency INTEGER,
    spot_month_types INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Limit Calculation Series (time series archive)
CREATE TABLE IF NOT EXISTS limit_calculation_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rowid INTEGER,
    lookup_id INTEGER,
    as_of_date DATE NOT NULL,
    mkt_index TEXT NOT NULL,
    contract_month DATE NOT NULL,
    reporting_limit_code TEXT NOT NULL,
    child_code TEXT,
    limit_lots REAL NOT NULL,
    limit_exemption REAL DEFAULT 0,
    lot_size REAL,
    pos_lots REAL NOT NULL,
    pos_pct REAL NOT NULL,
    total_pos_lots REAL,
    total_pos_pct REAL,
    current_update REAL,
    total_sale REAL,
    total_buy REAL,
    prioritization TEXT NOT NULL,
    limit_type INTEGER NOT NULL,
    is_parent INTEGER DEFAULT 0,
    frequency INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Limit Exemptions
CREATE TABLE IF NOT EXISTS limit_exemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commodity_code TEXT NOT NULL,
    exemption_spot_month REAL DEFAULT 0,
    exemption_one_month REAL DEFAULT 0,
    exemption_all_month REAL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    apply_date DATE,
    approval_date DATE,
    files TEXT,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Status Counts (aggregated dashboard data)
CREATE TABLE IF NOT EXISTS limit_calculation_status_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    limit_type INTEGER NOT NULL,
    monitor INTEGER DEFAULT 0,
    validate INTEGER DEFAULT 0,
    remediate INTEGER DEFAULT 0,
    breached INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Monthly Schedule (calendar events)
CREATE TABLE IF NOT EXISTS monthly_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lookup_id INTEGER,
    dated DATE NOT NULL,
    week_day TEXT,
    trade_date DATE,
    bid_week_day INTEGER,
    holiday_name TEXT,
    bidweek_prices_published INTEGER,
    bidweek_deals_submitted INTEGER,
    nymex_futures_contract_expiration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Market Limits Change Log
CREATE TABLE IF NOT EXISTS market_limits_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_limit_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (market_limit_id) REFERENCES market_limits(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_market_location ON transactions(market_location);
CREATE INDEX IF NOT EXISTS idx_transactions_contract_month ON transactions(contract_month);
CREATE INDEX IF NOT EXISTS idx_transactions_trade_date ON transactions(trade_date);

CREATE INDEX IF NOT EXISTS idx_limit_calculations_mkt_index ON limit_calculations(mkt_index);
CREATE INDEX IF NOT EXISTS idx_limit_calculations_limit_type ON limit_calculations(limit_type);
CREATE INDEX IF NOT EXISTS idx_limit_calculations_is_active ON limit_calculations(is_active);
CREATE INDEX IF NOT EXISTS idx_limit_calculations_prioritization ON limit_calculations(prioritization);

CREATE INDEX IF NOT EXISTS idx_limit_series_as_of_date ON limit_calculation_series(as_of_date);
CREATE INDEX IF NOT EXISTS idx_limit_series_mkt_index ON limit_calculation_series(mkt_index);

CREATE INDEX IF NOT EXISTS idx_mapping_market_location ON mapping(market_location);
CREATE INDEX IF NOT EXISTS idx_mapping_commodity_code ON mapping(commodity_code);

CREATE INDEX IF NOT EXISTS idx_market_limits_commodity_code ON market_limits(commodity_code);
CREATE INDEX IF NOT EXISTS idx_market_limits_contract_name ON market_limits(contract_name);

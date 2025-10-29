-- Pre-Trade Validation System
-- Migration: 0006_pre_trade_validation.sql

-- Risk Thresholds Configuration
CREATE TABLE IF NOT EXISTS risk_thresholds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threshold_name TEXT NOT NULL,
    threshold_type TEXT NOT NULL, -- 'auto_approve', 'require_approval', 'block'
    min_utilization_pct REAL NOT NULL,
    max_utilization_pct REAL NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default risk thresholds
INSERT INTO risk_thresholds (threshold_name, threshold_type, min_utilization_pct, max_utilization_pct, description) VALUES
    ('Auto Approve', 'auto_approve', 0, 80, 'Trades resulting in <80% utilization are automatically approved'),
    ('Require Approval', 'require_approval', 80, 95, 'Trades resulting in 80-95% utilization require manager approval'),
    ('Block Trade', 'block', 95, 999, 'Trades resulting in >95% utilization are blocked');

-- Pre-Trade Validation Checks
CREATE TABLE IF NOT EXISTS pre_trade_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    market_location TEXT NOT NULL,
    commodity_code TEXT NOT NULL,
    contract_month DATE NOT NULL,
    trade_side TEXT NOT NULL, -- 'BUY' or 'SELL'
    quantity REAL NOT NULL,
    limit_type INTEGER NOT NULL, -- 1=Spot, 2=One Month, 3=All Month

    -- Current state
    current_position REAL NOT NULL,
    current_limit REAL NOT NULL,
    current_utilization_pct REAL NOT NULL,

    -- Projected state after trade
    projected_position REAL NOT NULL,
    projected_utilization_pct REAL NOT NULL,

    -- Validation result
    validation_status TEXT NOT NULL, -- 'approved', 'requires_approval', 'blocked'
    risk_level TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    can_proceed INTEGER NOT NULL DEFAULT 0,

    -- Additional info
    notes TEXT,
    metadata TEXT, -- JSON field for additional data

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Trade Approvals Workflow
CREATE TABLE IF NOT EXISTS trade_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pre_trade_check_id INTEGER NOT NULL,
    requested_by INTEGER NOT NULL,
    approved_by INTEGER,

    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    urgency TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'

    approval_notes TEXT,
    rejection_reason TEXT,

    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    expires_at DATETIME,

    FOREIGN KEY (pre_trade_check_id) REFERENCES pre_trade_checks(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Pre-Trade Audit Trail
CREATE TABLE IF NOT EXISTS pre_trade_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pre_trade_check_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- 'created', 'approved', 'rejected', 'expired', 'executed'
    performed_by INTEGER,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (pre_trade_check_id) REFERENCES pre_trade_checks(id),
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- Approved Trades Log
CREATE TABLE IF NOT EXISTS approved_trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pre_trade_check_id INTEGER NOT NULL,
    approval_id INTEGER,

    market_location TEXT NOT NULL,
    commodity_code TEXT NOT NULL,
    contract_month DATE NOT NULL,
    trade_side TEXT NOT NULL,
    quantity REAL NOT NULL,

    execution_price REAL,
    execution_status TEXT DEFAULT 'pending', -- 'pending', 'executed', 'cancelled', 'failed'
    executed_at DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (pre_trade_check_id) REFERENCES pre_trade_checks(id),
    FOREIGN KEY (approval_id) REFERENCES trade_approvals(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pre_trade_checks_user_id ON pre_trade_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_pre_trade_checks_market_location ON pre_trade_checks(market_location);
CREATE INDEX IF NOT EXISTS idx_pre_trade_checks_commodity_code ON pre_trade_checks(commodity_code);
CREATE INDEX IF NOT EXISTS idx_pre_trade_checks_validation_status ON pre_trade_checks(validation_status);
CREATE INDEX IF NOT EXISTS idx_pre_trade_checks_created_at ON pre_trade_checks(created_at);

CREATE INDEX IF NOT EXISTS idx_trade_approvals_status ON trade_approvals(status);
CREATE INDEX IF NOT EXISTS idx_trade_approvals_requested_by ON trade_approvals(requested_by);
CREATE INDEX IF NOT EXISTS idx_trade_approvals_approved_by ON trade_approvals(approved_by);

CREATE INDEX IF NOT EXISTS idx_approved_trades_execution_status ON approved_trades(execution_status);
CREATE INDEX IF NOT EXISTS idx_approved_trades_market_location ON approved_trades(market_location);

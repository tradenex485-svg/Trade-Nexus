-- Alerts System Migration
-- Migration: 0005_alerts_system.sql

-- Drop existing alerts table and recreate with proper schema
DROP TABLE IF EXISTS alerts;

-- Alerts table (real-time alerts for position limit breaches)
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    limit_calculation_id INTEGER,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    commodity_code TEXT,
    market_location TEXT,
    current_position REAL,
    limit_value REAL,
    utilization_pct REAL,
    threshold_pct REAL,
    metadata TEXT,
    read INTEGER DEFAULT 0,
    acknowledged INTEGER DEFAULT 0,
    acknowledged_at DATETIME,
    acknowledged_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (limit_calculation_id) REFERENCES limit_calculations(id),
    FOREIGN KEY (acknowledged_by) REFERENCES users(id)
);

-- Alert rules table (configurable alert thresholds)
CREATE TABLE IF NOT EXISTS alert_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT UNIQUE NOT NULL,
    description TEXT,
    alert_type TEXT NOT NULL,
    threshold_pct REAL NOT NULL,
    severity TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    notify_email INTEGER DEFAULT 0,
    notify_sms INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alert recipients table (who should receive alerts)
CREATE TABLE IF NOT EXISTS alert_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    alert_type TEXT NOT NULL,
    commodity_code TEXT,
    email_enabled INTEGER DEFAULT 1,
    sms_enabled INTEGER DEFAULT 0,
    phone_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Alert history (for analytics and reporting)
CREATE TABLE IF NOT EXISTS alert_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    performed_by INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_id) REFERENCES alerts(id),
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- Insert default alert rules
INSERT INTO alert_rules (rule_name, description, alert_type, threshold_pct, severity, notify_email, notify_sms) VALUES
    ('monitor_threshold', 'Monitor level - position at 50% of limit', 'threshold_breach', 50.0, 'info', 0, 0),
    ('validate_threshold', 'Validate level - position at 75% of limit', 'threshold_breach', 75.0, 'warning', 1, 0),
    ('remediate_threshold', 'Remediate level - position at 90% of limit', 'threshold_breach', 90.0, 'error', 1, 1),
    ('breach_threshold', 'Breach - position exceeds 100% of limit', 'limit_breach', 100.0, 'critical', 1, 1),
    ('high_utilization', 'High utilization warning at 95%', 'threshold_breach', 95.0, 'error', 1, 0),
    ('approaching_limit', 'Approaching limit at 85%', 'threshold_breach', 85.0, 'warning', 1, 0);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(read);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_commodity_code ON alerts(commodity_code);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alert_rules_alert_type ON alert_rules(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_rules_is_active ON alert_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_recipients_user_id ON alert_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON alert_history(alert_id);

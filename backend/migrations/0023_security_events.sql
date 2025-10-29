-- Migration: Security Events Logging
-- Description: Add comprehensive security event tracking for OWASP compliance
-- Date: 2025-10-26

-- Drop existing table if it exists (clean migration)
DROP TABLE IF EXISTS security_events;

-- Create security_events table for tracking all security-related events
CREATE TABLE security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,  -- 'login_success', 'login_failed', 'password_changed', 'mfa_enabled', etc.
  user_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,  -- JSON with additional context
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);

-- Create security_alerts table for real-time alerting
CREATE TABLE IF NOT EXISTS security_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  details TEXT,  -- JSON with additional context
  status TEXT DEFAULT 'open' CHECK(status IN ('open', 'acknowledged', 'resolved', 'false_positive')),
  acknowledged_by INTEGER,
  acknowledged_at DATETIME,
  resolved_by INTEGER,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (acknowledged_by) REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- Create index for alert queries
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

-- Create password_reset_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS password_reset_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  ip_address TEXT NOT NULL,
  success INTEGER DEFAULT 0,
  attempt_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reset_attempts_user ON password_reset_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_attempts_ip ON password_reset_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_reset_attempts_created ON password_reset_attempts(attempt_at);

-- Create password_history table for preventing password reuse
CREATE TABLE IF NOT EXISTS password_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  password_hash TEXT NOT NULL,
  changed_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id);

-- Migration complete
-- Note: Applied manually via wrangler d1 execute

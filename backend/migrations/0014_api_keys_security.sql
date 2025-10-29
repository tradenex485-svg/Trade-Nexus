-- Migration 0014: API Keys and Security Event Logging
-- Purpose: Add API key management for system integrations and comprehensive security logging

-- =====================================================
-- API KEYS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- PBKDF2 hash of the API key
  key_prefix TEXT NOT NULL, -- First 8 chars for identification (e.g., "sk_live_12345678...")
  company_id INTEGER,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_active INTEGER DEFAULT 1,
  scopes TEXT, -- JSON array of allowed scopes (e.g., ["read:positions", "write:trades"])
  rate_limit INTEGER DEFAULT 1000, -- Requests per hour
  ip_whitelist TEXT, -- JSON array of allowed IPs
  description TEXT,
  metadata TEXT, -- JSON metadata
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_company ON api_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- =====================================================
-- API KEY USAGE LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS api_key_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  response_status INTEGER,
  request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  response_time_ms INTEGER,
  request_size INTEGER, -- bytes
  response_size INTEGER, -- bytes
  error_message TEXT,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_key ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_key_usage(request_timestamp);

-- =====================================================
-- SECURITY EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL, -- login_success, login_failure, permission_denied, suspicious_activity, etc.
  severity TEXT NOT NULL, -- low, medium, high, critical
  user_id INTEGER,
  api_key_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  endpoint TEXT,
  event_details TEXT, -- JSON details
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by INTEGER,
  resolution_notes TEXT,
  is_resolved INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(detected_at);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(is_resolved);

-- =====================================================
-- FAILED LOGIN ATTEMPTS TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  attempt_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_failed_logins_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_logins_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_logins_timestamp ON failed_login_attempts(attempt_timestamp);

-- =====================================================
-- VIEWS
-- =====================================================

-- View: Active API Keys with Usage Stats
CREATE VIEW v_api_keys_summary AS
SELECT
  ak.id,
  ak.key_name,
  ak.key_prefix,
  ak.company_id,
  c.company_name,
  ak.created_by,
  u.email as created_by_email,
  ak.created_at,
  ak.last_used_at,
  ak.expires_at,
  ak.is_active,
  ak.rate_limit,
  ak.scopes,
  COUNT(DISTINCT aku.id) as total_requests,
  COUNT(DISTINCT CASE WHEN aku.request_timestamp >= datetime('now', '-24 hours') THEN aku.id END) as requests_24h,
  COUNT(DISTINCT CASE WHEN aku.response_status >= 400 THEN aku.id END) as error_count,
  MAX(aku.request_timestamp) as last_request_at,
  CASE
    WHEN ak.is_active = 0 THEN 'inactive'
    WHEN ak.expires_at < datetime('now') THEN 'expired'
    WHEN ak.expires_at <= datetime('now', '+7 days') THEN 'expiring_soon'
    ELSE 'active'
  END as status
FROM api_keys ak
LEFT JOIN companies c ON ak.company_id = c.id
LEFT JOIN users u ON ak.created_by = u.id
LEFT JOIN api_key_usage aku ON ak.id = aku.api_key_id
GROUP BY ak.id;

-- View: Security Events Summary
CREATE VIEW v_security_events_summary AS
SELECT
  se.id,
  se.event_type,
  se.severity,
  se.user_id,
  u.email as user_email,
  se.api_key_id,
  ak.key_name,
  se.ip_address,
  se.endpoint,
  se.detected_at,
  se.is_resolved,
  se.resolved_at,
  r.email as resolved_by_email,
  CASE
    WHEN se.is_resolved = 1 THEN 'resolved'
    WHEN se.severity = 'critical' AND se.detected_at >= datetime('now', '-1 hour') THEN 'active_critical'
    WHEN se.severity = 'high' AND se.detected_at >= datetime('now', '-6 hours') THEN 'active_high'
    ELSE 'pending'
  END as alert_status
FROM security_events se
LEFT JOIN users u ON se.user_id = u.id
LEFT JOIN api_keys ak ON se.api_key_id = ak.id
LEFT JOIN users r ON se.resolved_by = r.id;

-- View: Failed Login Analysis
CREATE VIEW v_failed_login_analysis AS
SELECT
  email,
  ip_address,
  COUNT(*) as attempt_count,
  MIN(attempt_timestamp) as first_attempt,
  MAX(attempt_timestamp) as last_attempt,
  GROUP_CONCAT(DISTINCT failure_reason) as reasons,
  CASE
    WHEN COUNT(*) >= 10 AND MAX(attempt_timestamp) >= datetime('now', '-15 minutes') THEN 'brute_force_suspected'
    WHEN COUNT(*) >= 5 AND MAX(attempt_timestamp) >= datetime('now', '-5 minutes') THEN 'suspicious'
    ELSE 'normal'
  END as threat_level
FROM failed_login_attempts
WHERE attempt_timestamp >= datetime('now', '-24 hours')
GROUP BY email, ip_address
HAVING COUNT(*) >= 3
ORDER BY attempt_count DESC;


-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Log security event on failed API key usage
CREATE TRIGGER IF NOT EXISTS trg_api_key_usage_security
AFTER INSERT ON api_key_usage
WHEN NEW.response_status >= 400
BEGIN
  INSERT INTO security_events (
    event_type, severity, api_key_id, ip_address,
    endpoint, event_details
  )
  SELECT
    CASE
      WHEN NEW.response_status = 401 THEN 'unauthorized_api_access'
      WHEN NEW.response_status = 403 THEN 'forbidden_api_access'
      WHEN NEW.response_status = 429 THEN 'rate_limit_exceeded'
      ELSE 'api_error'
    END,
    CASE
      WHEN NEW.response_status = 401 THEN 'high'
      WHEN NEW.response_status = 403 THEN 'high'
      WHEN NEW.response_status = 429 THEN 'medium'
      ELSE 'low'
    END,
    NEW.api_key_id,
    NEW.ip_address,
    NEW.endpoint,
    json_object(
      'method', NEW.method,
      'status', NEW.response_status,
      'error', NEW.error_message
    );
END;

-- Trigger: Update last_used_at on API key usage
CREATE TRIGGER IF NOT EXISTS trg_update_api_key_last_used
AFTER INSERT ON api_key_usage
WHEN NEW.response_status < 400
BEGIN
  UPDATE api_keys
  SET last_used_at = CURRENT_TIMESTAMP
  WHERE id = NEW.api_key_id;
END;

-- Trigger: Auto-deactivate expired API keys
CREATE TRIGGER IF NOT EXISTS trg_deactivate_expired_api_keys
AFTER INSERT ON api_key_usage
WHEN EXISTS (
  SELECT 1 FROM api_keys
  WHERE id = NEW.api_key_id
    AND expires_at < datetime('now')
    AND is_active = 1
)
BEGIN
  UPDATE api_keys
  SET is_active = 0
  WHERE id = NEW.api_key_id
    AND expires_at < datetime('now');
END;

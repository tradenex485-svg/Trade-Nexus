-- Migration: Create user_settings table
-- This table stores user preferences and settings

CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,

  -- Notification settings
  notifications_enabled INTEGER DEFAULT 1,
  email_alerts INTEGER DEFAULT 1,
  position_alerts INTEGER DEFAULT 1,
  breach_alerts INTEGER DEFAULT 1,
  daily_summary INTEGER DEFAULT 0,
  alert_email TEXT,

  -- Data settings
  data_retention_days INTEGER DEFAULT 365,
  auto_import_enabled INTEGER DEFAULT 1,

  -- UI settings
  theme TEXT DEFAULT 'dark',

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

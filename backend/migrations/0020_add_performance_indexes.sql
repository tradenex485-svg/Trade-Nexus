-- Migration: Add Core Performance Indexes
-- Created: 2025-01-22
-- Description: Adds essential indexes to improve query performance

-- Core indexes for most frequently queried tables
-- Only including indexes that match the actual schema

-- Position calculations - most frequently queried table
CREATE INDEX IF NOT EXISTS idx_limit_calculations_active_date
ON limit_calculations(is_active, as_of_date DESC)
WHERE is_active = 1;

CREATE INDEX IF NOT EXISTS idx_limit_calculations_commodity_active
ON limit_calculations(reporting_limit_code, is_active, as_of_date DESC);

-- Transactions - heavy read operations
CREATE INDEX IF NOT EXISTS idx_transactions_trade_date
ON transactions(trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_market_contract
ON transactions(market_location, contract_month, trade_date DESC);

-- Alerts - user notifications
CREATE INDEX IF NOT EXISTS idx_alerts_user_unread
ON alerts(user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_unacknowledged
ON alerts(acknowledged, severity, created_at DESC)
WHERE acknowledged = 0;

-- Market limits - lookups
CREATE INDEX IF NOT EXISTS idx_market_limits_commodity_active
ON market_limits(commodity_code, is_active)
WHERE is_active = 1;

-- Users - authentication
CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email)
WHERE is_active = 1;

-- Basic indexes only - production schema differs slightly from dev
-- Additional indexes can be added after schema verification

-- Migration 0029: Create bid week schedules table
-- Creates table for storing pre-calculated bid week periods for exchanges
-- Date: 2025-10-30

-- Create bid_week_schedules table
CREATE TABLE IF NOT EXISTS bid_week_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exchange_code TEXT NOT NULL,
    schedule_month TEXT NOT NULL, -- YYYY-MM-01 format
    bid_week_start_date TEXT NOT NULL, -- YYYY-MM-DD format
    bid_week_end_date TEXT NOT NULL, -- YYYY-MM-DD format
    good_business_days_count INTEGER NOT NULL,
    spot_month_start TEXT NOT NULL, -- YYYY-MM-01 format (next month during bid week)
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(exchange_code, schedule_month)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bid_week_schedules_exchange
    ON bid_week_schedules(exchange_code);

CREATE INDEX IF NOT EXISTS idx_bid_week_schedules_month
    ON bid_week_schedules(schedule_month);

CREATE INDEX IF NOT EXISTS idx_bid_week_schedules_dates
    ON bid_week_schedules(bid_week_start_date, bid_week_end_date);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_bid_week_schedules_timestamp
    AFTER UPDATE ON bid_week_schedules
BEGIN
    UPDATE bid_week_schedules
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

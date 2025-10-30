-- Trade Nexus - Add Subset Reports Columns to Transactions
-- Migration: 0033_add_subset_reports_columns.sql
-- Description: Add columns needed for CFTC subset reports functionality

-- Add missing columns to transactions table for subset reports
-- These columns are required by the subset-report-service queries

-- Note: company_id may already exist from migration 0010_multi_tenancy.sql
-- Skip if it already exists to avoid errors

-- Add counterparty tracking
ALTER TABLE transactions ADD COLUMN counterparty_name TEXT;

-- Add commodity classification
ALTER TABLE transactions ADD COLUMN commodity_code TEXT;

-- Add transaction type classification (e.g., 'COMM-PHYS' for physical commodities)
ALTER TABLE transactions ADD COLUMN transaction_type TEXT DEFAULT 'COMM-PHYS';

-- Add next-day indicator for next-day reports
ALTER TABLE transactions ADD COLUMN is_next_day INTEGER DEFAULT 0;

-- Add price type (FIXED or INDEX)
ALTER TABLE transactions ADD COLUMN price_type TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_counterparty
ON transactions(counterparty_name);

CREATE INDEX IF NOT EXISTS idx_transactions_commodity
ON transactions(commodity_code, trade_date);

CREATE INDEX IF NOT EXISTS idx_transactions_type
ON transactions(transaction_type, trade_date);

CREATE INDEX IF NOT EXISTS idx_transactions_next_day
ON transactions(is_next_day, trade_date);

CREATE INDEX IF NOT EXISTS idx_transactions_price_type
ON transactions(price_type, is_next_day);

-- Create composite index for subset reports queries
CREATE INDEX IF NOT EXISTS idx_transactions_subset_reports
ON transactions(company_id, trade_date, transaction_type, is_next_day);

-- Migration complete

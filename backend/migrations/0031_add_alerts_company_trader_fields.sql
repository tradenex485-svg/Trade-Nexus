-- Add company_id and trader_id fields to alerts table
-- Migration: 0031_add_alerts_company_trader_fields.sql

-- Add company_id field to alerts table
ALTER TABLE alerts ADD COLUMN company_id INTEGER;

-- Add trader_id field to alerts table
ALTER TABLE alerts ADD COLUMN trader_id INTEGER;

-- Create foreign key indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_company_id ON alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_trader_id ON alerts(trader_id);

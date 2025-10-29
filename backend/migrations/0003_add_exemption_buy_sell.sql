-- Migration: Add buy/sell specific exemption columns
-- This aligns with the Laravel original app structure

-- Add buy/sell specific exemption columns for each limit type
ALTER TABLE limit_exemptions ADD COLUMN exemption_buy_spot_month REAL DEFAULT 0;
ALTER TABLE limit_exemptions ADD COLUMN exemption_sell_spot_month REAL DEFAULT 0;
ALTER TABLE limit_exemptions ADD COLUMN exemption_buy_one_month REAL DEFAULT 0;
ALTER TABLE limit_exemptions ADD COLUMN exemption_sell_one_month REAL DEFAULT 0;
ALTER TABLE limit_exemptions ADD COLUMN exemption_buy_all_month REAL DEFAULT 0;
ALTER TABLE limit_exemptions ADD COLUMN exemption_sell_all_month REAL DEFAULT 0;

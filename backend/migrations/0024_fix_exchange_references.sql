-- Migration: Fix Exchange References in Transactions Table
-- Description: Convert transactions.exchange from TEXT to FK exchange_id
-- Date: 2025-10-27

-- Step 1: Add new exchange_id column
ALTER TABLE transactions ADD COLUMN exchange_id INTEGER;

-- Step 2: Create mapping from exchange TEXT to exchange_id
-- Map existing exchange codes to IDs
UPDATE transactions
SET exchange_id = (
  SELECT id FROM exchanges
  WHERE UPPER(exchanges.exchange_code) = UPPER(transactions.exchange)
)
WHERE exchange IS NOT NULL;

-- Step 3: Set default exchange for any NULL values (ICE as fallback)
UPDATE transactions
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'ICE' LIMIT 1)
WHERE exchange_id IS NULL;

-- Step 4: Add index before adding FK constraint (performance)
CREATE INDEX IF NOT EXISTS idx_transactions_exchange_id ON transactions(exchange_id);

-- Step 5: We cannot drop columns in SQLite, so we'll keep the old column for now
-- Mark it as deprecated in comments
-- TODO: In future migration, create new table without exchange column and migrate data

-- Step 6: Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_exchange_date ON transactions(exchange_id, trade_date);
CREATE INDEX IF NOT EXISTS idx_transactions_market_loc ON transactions(market_location);

-- Verification query (commented out, for manual verification)
-- SELECT
--   t.id,
--   t.exchange AS old_exchange_text,
--   t.exchange_id AS new_exchange_id,
--   e.exchange_code,
--   e.exchange_name
-- FROM transactions t
-- LEFT JOIN exchanges e ON t.exchange_id = e.id
-- LIMIT 10;

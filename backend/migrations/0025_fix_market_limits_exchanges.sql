-- Migration: Fix Market Limits Exchange Associations
-- Description: Properly assign exchange_id based on commodity type
-- Date: 2025-10-27

-- Current state: All market_limits have exchange_id pointing to ICE (from migration 0010)
-- Target state: Each commodity mapped to correct exchange

-- Natural Gas (NG) → NYMEX
UPDATE market_limits
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'NYMEX' LIMIT 1)
WHERE commodity_code = 'NG' OR contract_name LIKE '%Natural Gas%';

-- Crude Oil (CL, WTI) → NYMEX
UPDATE market_limits
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'NYMEX' LIMIT 1)
WHERE commodity_code IN ('CL', 'WTI') OR contract_name LIKE '%Crude%';

-- Gold (GC) → COMEX
UPDATE market_limits
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'COMEX' LIMIT 1)
WHERE commodity_code = 'GC' OR contract_name LIKE '%Gold%';

-- Silver (SI) → COMEX
UPDATE market_limits
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'COMEX' LIMIT 1)
WHERE commodity_code = 'SI' OR contract_name LIKE '%Silver%';

-- Copper (HG) → COMEX
UPDATE market_limits
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'COMEX' LIMIT 1)
WHERE commodity_code = 'HG' OR contract_name LIKE '%Copper%';

-- Power contracts → ICE (already set, but ensure)
UPDATE market_limits
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'ICE' LIMIT 1)
WHERE market_type LIKE '%POWER%' OR commodity_code LIKE 'PWR%';

-- E-mini and financial futures → CME
UPDATE market_limits
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'CME' LIMIT 1)
WHERE commodity_code IN ('ES', 'NQ', 'YM')
   OR contract_name LIKE '%E-mini%'
   OR contract_name LIKE '%S&P%';

-- Agricultural commodities → CME (Chicago Board of Trade division)
UPDATE market_limits
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'CME' LIMIT 1)
WHERE commodity_code IN ('C', 'W', 'S', 'SM', 'BO')
   OR contract_name LIKE '%Corn%'
   OR contract_name LIKE '%Wheat%'
   OR contract_name LIKE '%Soybean%';

-- Default any remaining NULLs to ICE
UPDATE market_limits
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'ICE' LIMIT 1)
WHERE exchange_id IS NULL;

-- Verification query (commented out, for manual verification)
-- SELECT
--   ml.commodity_code,
--   ml.contract_name,
--   e.exchange_code,
--   e.exchange_name,
--   COUNT(*) as count
-- FROM market_limits ml
-- LEFT JOIN exchanges e ON ml.exchange_id = e.id
-- GROUP BY ml.commodity_code, e.exchange_code
-- ORDER BY e.exchange_code, ml.commodity_code;

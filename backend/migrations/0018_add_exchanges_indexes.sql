-- Migration 0018: Add Performance Indexes for Exchanges Table
-- Improves query performance for frequently accessed columns

-- ============================================================================
-- INDEX: exchange_code for lookups
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchanges_exchange_code
ON exchanges(exchange_code);

-- ============================================================================
-- INDEX: Composite index for active exchanges ordered by name
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_exchanges_active_name
ON exchanges(is_active, exchange_name);

-- ============================================================================
-- INDEX: Country for filtering by region
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_exchanges_country
ON exchanges(country);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- To verify indexes were created:
-- SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='exchanges';

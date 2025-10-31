-- Update rate_limits table schema to use identifier column
-- Migration: 0035_update_rate_limits_schema.sql

-- Add identifier column if it doesn't exist
ALTER TABLE rate_limits ADD COLUMN identifier TEXT;

-- Populate identifier column from existing user_id and ip_address columns
UPDATE rate_limits
SET identifier = CASE
    WHEN user_id IS NOT NULL THEN 'user:' || user_id
    WHEN ip_address IS NOT NULL THEN 'ip:' || ip_address
    ELSE 'unknown'
END
WHERE identifier IS NULL;

-- Create index for new identifier column
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint ON rate_limits(identifier, endpoint);

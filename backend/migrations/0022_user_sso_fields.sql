-- Trade Nexus Database Schema
-- Migration: 0022_user_sso_fields.sql
-- SSO Multi-Authentication Support - User SSO Fields

-- ============================================================================
-- EXTEND USERS TABLE with SSO Fields
-- Add columns to track SSO authentication method and provider information
-- ============================================================================

-- Add SSO-related fields to users table
ALTER TABLE users ADD COLUMN auth_method TEXT DEFAULT 'password'
    CHECK(auth_method IN ('password', 'saml', 'oauth', 'ldap'));

ALTER TABLE users ADD COLUMN sso_provider TEXT;
    -- Examples: 'microsoft', 'okta', 'google', 'onelogin', etc.

ALTER TABLE users ADD COLUMN external_id TEXT;
    -- Provider's user ID (SAML NameID, OAuth 'sub' claim, LDAP DN)

ALTER TABLE users ADD COLUMN external_email TEXT;
    -- Email address from SSO provider (may differ from local email)

ALTER TABLE users ADD COLUMN last_sso_login DATETIME;
    -- Timestamp of last successful SSO login

ALTER TABLE users ADD COLUMN sso_metadata TEXT;
    -- JSON metadata from SSO provider (attributes, claims, etc.)

ALTER TABLE users ADD COLUMN sso_linked_at DATETIME;
    -- When user was linked to SSO provider

-- ============================================================================
-- INDEXES for SSO Lookups
-- ============================================================================

-- Index for finding users by external ID (SSO provider's user ID)
CREATE INDEX IF NOT EXISTS idx_users_external_id
ON users(external_id) WHERE external_id IS NOT NULL;

-- Index for filtering by authentication method
CREATE INDEX IF NOT EXISTS idx_users_auth_method
ON users(auth_method);

-- Index for filtering by SSO provider
CREATE INDEX IF NOT EXISTS idx_users_sso_provider
ON users(sso_provider) WHERE sso_provider IS NOT NULL;

-- Composite index for SSO provider lookups
CREATE INDEX IF NOT EXISTS idx_users_sso_provider_external_id
ON users(sso_provider, external_id)
WHERE sso_provider IS NOT NULL AND external_id IS NOT NULL;

-- Index for last SSO login analytics
CREATE INDEX IF NOT EXISTS idx_users_last_sso_login
ON users(last_sso_login) WHERE last_sso_login IS NOT NULL;

-- ============================================================================
-- DATA MIGRATION
-- Set auth_method to 'password' for all existing users
-- ============================================================================

-- Update existing users to have password auth method
UPDATE users
SET auth_method = 'password'
WHERE auth_method IS NULL;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- User Authentication Flow After This Migration:
--
-- 1. Password Authentication (Existing):
--    - auth_method = 'password'
--    - sso_provider = NULL
--    - Uses password field for authentication
--
-- 2. SAML Authentication (New):
--    - auth_method = 'saml'
--    - sso_provider = 'microsoft', 'okta', etc.
--    - external_id = SAML NameID
--    - password field can be NULL or kept for fallback
--
-- 3. OAuth Authentication (New):
--    - auth_method = 'oauth'
--    - sso_provider = 'google', 'microsoft', etc.
--    - external_id = OAuth 'sub' claim
--    - password field can be NULL or kept for fallback
--
-- 4. LDAP Authentication (New):
--    - auth_method = 'ldap'
--    - sso_provider = 'active_directory', 'openldap', etc.
--    - external_id = LDAP DN (Distinguished Name)
--    - password field is NOT stored (authenticated against LDAP server)

-- Account Linking Strategy:
-- - When SSO user logs in for the first time, system checks if user exists by email
-- - If user exists with password auth, link SSO to existing account
-- - If user doesn't exist and JIT provisioning is enabled, create new user
-- - If user doesn't exist and JIT is disabled, show error

-- Security Considerations:
-- - external_id should be unique per provider (enforced at application level)
-- - sso_metadata may contain sensitive information - careful with logging
-- - Users with SSO auth can optionally keep password as fallback
-- - Consider disabling password auth after successful SSO linking

-- Example SSO Metadata Format:
-- {
--   "saml": {
--     "attributes": {
--       "email": "user@company.com",
--       "firstName": "John",
--       "lastName": "Doe",
--       "department": "Trading",
--       "groups": ["traders", "company-a"]
--     },
--     "sessionIndex": "xyz123",
--     "nameIdFormat": "emailAddress"
--   }
-- }

-- Next Steps:
-- 1. Run this migration on dev database
-- 2. Install SAML and OAuth libraries (samlify, jose)
-- 3. Implement SSO services
-- 4. Add SSO routes to backend
-- 5. Update frontend login flow
-- 6. Test with real IdP (Microsoft, Okta, Google)

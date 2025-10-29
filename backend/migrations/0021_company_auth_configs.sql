-- Trade Nexus Database Schema
-- Migration: 0021_company_auth_configs.sql
-- SSO Multi-Authentication Support - Company Authentication Configurations

-- ============================================================================
-- COMPANY_AUTH_CONFIGS TABLE
-- Stores SSO/authentication configuration per company
-- Supports SAML 2.0, OAuth 2.0/OIDC, LDAP, and password authentication
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_auth_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,

    -- Authentication method
    auth_method TEXT NOT NULL CHECK(auth_method IN ('saml', 'oauth', 'ldap', 'password')),

    -- Provider information
    provider_name TEXT, -- 'microsoft', 'okta', 'google', 'onelogin', etc.

    -- SAML 2.0 Configuration
    saml_entity_id TEXT,
    saml_sso_url TEXT,
    saml_slo_url TEXT, -- Single Logout URL
    saml_certificate TEXT, -- X.509 certificate (PEM format)
    saml_name_id_format TEXT DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',

    -- OAuth 2.0 / OIDC Configuration
    oauth_client_id TEXT,
    oauth_client_secret TEXT, -- Encrypted
    oauth_authorization_url TEXT,
    oauth_token_url TEXT,
    oauth_userinfo_url TEXT,
    oauth_scope TEXT DEFAULT 'openid profile email',

    -- LDAP Configuration
    ldap_server_url TEXT, -- ldaps://ldap.company.com:636
    ldap_bind_dn TEXT,
    ldap_bind_password TEXT, -- Encrypted
    ldap_search_base TEXT, -- ou=users,dc=company,dc=com
    ldap_search_filter TEXT DEFAULT '(&(objectClass=user)(mail={email}))',

    -- Email domain-based routing
    -- Comma-separated list: company-a.com,companya.com
    email_domains TEXT,

    -- Just-In-Time (JIT) provisioning
    jit_provisioning_enabled INTEGER DEFAULT 1,
    default_role_id INTEGER REFERENCES roles(id),
    require_admin_approval INTEGER DEFAULT 0,

    -- Status
    is_active INTEGER DEFAULT 1,
    is_primary INTEGER DEFAULT 1, -- Primary auth method for company

    -- Metadata
    metadata TEXT, -- JSON for additional configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- ============================================================================
-- SSO_SESSIONS TABLE
-- Track SSO sessions for SAML Single Logout and OAuth token management
-- ============================================================================

CREATE TABLE IF NOT EXISTS sso_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,

    -- SAML session tracking
    session_index TEXT, -- SAML session index from IdP
    name_id TEXT, -- SAML NameID

    -- OAuth token tracking
    access_token TEXT, -- OAuth access token (encrypted)
    refresh_token TEXT, -- OAuth refresh token (encrypted)
    token_expires_at DATETIME,

    -- Provider info
    provider_name TEXT,
    auth_method TEXT CHECK(auth_method IN ('saml', 'oauth', 'ldap')),

    -- Session management
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Company auth configs indexes
CREATE INDEX IF NOT EXISTS idx_company_auth_company_id
ON company_auth_configs(company_id);

CREATE INDEX IF NOT EXISTS idx_company_auth_email_domains
ON company_auth_configs(email_domains);

CREATE INDEX IF NOT EXISTS idx_company_auth_method
ON company_auth_configs(auth_method);

CREATE INDEX IF NOT EXISTS idx_company_auth_active
ON company_auth_configs(is_active, company_id);

-- Ensure one primary auth method per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_auth_primary
ON company_auth_configs(company_id, is_primary)
WHERE is_primary = 1;

-- SSO sessions indexes
CREATE INDEX IF NOT EXISTS idx_sso_sessions_user_id
ON sso_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sso_sessions_company_id
ON sso_sessions(company_id);

CREATE INDEX IF NOT EXISTS idx_sso_sessions_session_index
ON sso_sessions(session_index);

CREATE INDEX IF NOT EXISTS idx_sso_sessions_expires_at
ON sso_sessions(expires_at);

-- ============================================================================
-- AUDIT LOG TABLE EXTENSION
-- Track SSO configuration changes and login events
-- ============================================================================

-- Add SSO-related actions to audit logs
-- Note: audit_logs table should already exist from previous migrations
-- This is just documentation of new action types:
-- - 'SSO_CONFIG_CREATED'
-- - 'SSO_CONFIG_UPDATED'
-- - 'SSO_CONFIG_DELETED'
-- - 'SSO_LOGIN_SUCCESS'
-- - 'SSO_LOGIN_FAILURE'
-- - 'JIT_USER_CREATED'
-- - 'SSO_LOGOUT'

-- ============================================================================
-- SEED DATA - Default password auth config for existing companies
-- ============================================================================

-- Add default password authentication config for companies without SSO
INSERT INTO company_auth_configs (
    company_id,
    auth_method,
    provider_name,
    jit_provisioning_enabled,
    is_active,
    is_primary
)
SELECT
    id,
    'password',
    NULL,
    0, -- No JIT for password auth
    1,
    1
FROM companies
WHERE id NOT IN (SELECT DISTINCT company_id FROM company_auth_configs);

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- This migration adds SSO support without breaking existing functionality:
-- 1. All existing companies get password auth config by default
-- 2. Existing users continue to use password authentication
-- 3. SSO can be enabled per company without affecting others
-- 4. JIT provisioning is configurable per company
-- 5. Multiple auth methods can coexist (password + SSO)

-- Security Notes:
-- - oauth_client_secret and ldap_bind_password should be encrypted at application level
-- - access_token and refresh_token in sso_sessions should be encrypted
-- - saml_certificate is public key, no encryption needed
-- - Use AES-256-GCM with environment-provided encryption key

-- Next Steps:
-- 1. Run this migration on dev database
-- 2. Extend users table with SSO fields (0022_user_sso_fields.sql)
-- 3. Implement SAML and OAuth services
-- 4. Add email domain detection API endpoint
-- 5. Update frontend login flow

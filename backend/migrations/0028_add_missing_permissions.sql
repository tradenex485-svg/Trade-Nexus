-- Migration 0028: Add missing permissions used in routes
-- Fixes authorization failures for API keys, filings, risk, trades, and newsletters
-- Date: 2025-10-30

-- ============================================================================
-- PART 1: ADD MISSING PERMISSIONS
-- ============================================================================

-- API Keys permissions
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('api_keys.read', 'api_keys', 'read', 'View API keys and usage statistics'),
('api_keys.create', 'api_keys', 'create', 'Create new API keys'),
('api_keys.update', 'api_keys', 'update', 'Update API key settings'),
('api_keys.delete', 'api_keys', 'delete', 'Revoke/delete API keys');

-- Regulatory Filings permissions
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('filings.create', 'filings', 'create', 'Generate regulatory filings (CFTC, ICE, CME)'),
('filings.submit', 'filings', 'submit', 'Submit regulatory filings to authorities'),
('filings.read', 'filings', 'read', 'View regulatory filings');

-- Newsletter permissions (fixing naming inconsistency)
-- Note: These duplicate support.create_newsletters but routes use newsletters.* naming
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('newsletters.create', 'newsletters', 'create', 'Create newsletters'),
('newsletters.publish', 'newsletters', 'publish', 'Publish newsletters to recipients'),
('newsletters.read', 'newsletters', 'read', 'View newsletters');

-- Risk Management permissions
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('risk.configure', 'risk', 'configure', 'Configure risk thresholds and scenarios'),
('risk.read', 'risk', 'read', 'View risk metrics and scenarios');

-- Trade Approval permissions
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('trades.approve', 'trades', 'approve', 'Approve trading transactions'),
('trades.reject', 'trades', 'reject', 'Reject trading transactions'),
('trades.read', 'trades', 'read', 'View trade approvals');

-- Exemption approval permission (ensure it exists - may already be defined)
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('exemptions.approve', 'exemptions', 'approve', 'Approve CFTC exemption requests');

-- ============================================================================
-- PART 2: ASSIGN TO SUPER_ADMIN AND ADMIN (FULL ACCESS ROLES)
-- ============================================================================

-- Super admin and admin get ALL new permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name IN ('super_admin', 'admin')
AND p.permission_name IN (
  'api_keys.read', 'api_keys.create', 'api_keys.update', 'api_keys.delete',
  'filings.create', 'filings.submit', 'filings.read',
  'newsletters.create', 'newsletters.publish', 'newsletters.read',
  'risk.configure', 'risk.read',
  'trades.approve', 'trades.reject', 'trades.read',
  'exemptions.approve'
);

-- ============================================================================
-- PART 3: ASSIGN TO COMPLIANCE_OFFICER (CRITICAL FOR THEIR ROLE)
-- ============================================================================

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name = 'compliance_officer'
AND p.permission_name IN (
  -- Regulatory filings - CRITICAL for compliance role
  'filings.create',
  'filings.submit',
  'filings.read',

  -- Risk configuration - needed for compliance oversight
  'risk.configure',
  'risk.read',

  -- Trade approvals - compliance oversight
  'trades.approve',
  'trades.reject',
  'trades.read',

  -- Exemption approvals
  'exemptions.approve',

  -- Documents management
  'documents.read',
  'documents.create',
  'documents.approve',

  -- Security monitoring
  'security.read',

  -- Newsletters (publish compliance updates)
  'newsletters.create',
  'newsletters.publish',
  'newsletters.read'
);

-- ============================================================================
-- PART 4: ASSIGN TO COMPANY_ADMIN (COMPANY MANAGEMENT ROLE)
-- ============================================================================

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name = 'company_admin'
AND p.permission_name IN (
  -- API keys management - for system integrations
  'api_keys.read',
  'api_keys.create',
  'api_keys.update',
  'api_keys.delete',

  -- Regulatory filings - generate (but not submit)
  'filings.create',
  'filings.read',

  -- Risk configuration - for company risk management
  'risk.configure',
  'risk.read',

  -- Exemptions - request (but not approve)
  'exemptions.create',
  'exemptions.read',

  -- Newsletters - read company announcements
  'newsletters.read',

  -- Trades - view (but not approve)
  'trades.read'
);

-- ============================================================================
-- PART 5: ASSIGN TO TRADER (LIMITED ACCESS)
-- ============================================================================

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name = 'trader'
AND p.permission_name IN (
  -- Exemptions - traders should see exemptions affecting their limits
  'exemptions.read',

  -- Risk - view risk parameters
  'risk.read',

  -- Trades - view trade approval status
  'trades.read',

  -- Newsletters - read company announcements
  'newsletters.read',

  -- Filings - read regulatory filings (informational)
  'filings.read'
);

-- ============================================================================
-- PART 6: ASSIGN READ PERMISSIONS TO AUDITOR (READ-ONLY ROLE)
-- ============================================================================

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name = 'auditor'
AND p.permission_name IN (
  -- All read permissions for new resources
  'api_keys.read',
  'filings.read',
  'newsletters.read',
  'risk.read',
  'trades.read'
);

-- ============================================================================
-- PART 7: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- These indexes may already exist but adding them for completeness
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- To verify this migration worked, run these queries:

-- 1. Check all new permissions were created:
-- SELECT permission_name, resource, action, description
-- FROM permissions
-- WHERE resource IN ('api_keys', 'filings', 'newsletters', 'risk', 'trades')
-- ORDER BY resource, permission_name;

-- 2. Check role assignments for new permissions:
-- SELECT r.role_name, p.permission_name, p.resource
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON rp.permission_id = p.id
-- WHERE p.resource IN ('api_keys', 'filings', 'newsletters', 'risk', 'trades')
-- ORDER BY r.role_name, p.resource, p.permission_name;

-- 3. Check specific role has required permissions:
-- SELECT p.permission_name
-- FROM role_permissions rp
-- JOIN permissions p ON rp.permission_id = p.id
-- JOIN roles r ON rp.role_id = r.id
-- WHERE r.role_name = 'compliance_officer'
-- AND p.resource IN ('filings', 'risk', 'trades')
-- ORDER BY p.permission_name;

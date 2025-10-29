-- Migration: Add security permissions and grant to appropriate roles
-- This enables the security monitoring page for authorized users

-- Add security permissions
INSERT INTO permissions (permission_name, resource, action, description)
VALUES
  ('security.read', 'security', 'read', 'View security events and monitoring data'),
  ('security.manage', 'security', 'manage', 'Manage and resolve security events');

-- Grant security.read to super_admin (role_id: 5)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE permission_name = 'security.read';

-- Grant security.manage to super_admin (role_id: 5)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE permission_name = 'security.manage';

-- Grant security.read to company_admin (role_id: 6)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions WHERE permission_name = 'security.read';

-- Grant security.manage to company_admin (role_id: 6)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions WHERE permission_name = 'security.manage';

-- Grant security.read to auditor (role_id: 4) - read-only access
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE permission_name = 'security.read';

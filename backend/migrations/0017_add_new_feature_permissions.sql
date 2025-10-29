-- Migration 0017: Add Permissions for New Features
-- Adds permissions for Documents, Subscriptions, Support, Financial, Workflow Approvals

-- ============================================================================
-- PART 1: ADD NEW PERMISSIONS
-- ============================================================================

-- Documents Permissions
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('documents.read', 'documents', 'read', 'View documents'),
('documents.create', 'documents', 'create', 'Upload new documents'),
('documents.update', 'documents', 'update', 'Edit document metadata'),
('documents.delete', 'documents', 'delete', 'Delete documents'),
('documents.approve', 'documents', 'approve', 'Approve documents'),
('documents.download', 'documents', 'download', 'Download documents'),
('documents.manage_versions', 'documents', 'manage_versions', 'Manage document versions');

-- Subscriptions Permissions
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('subscriptions.read', 'subscriptions', 'read', 'View subscription plans and details'),
('subscriptions.create', 'subscriptions', 'create', 'Create subscription requests'),
('subscriptions.approve', 'subscriptions', 'approve', 'Approve subscription requests'),
('subscriptions.manage', 'subscriptions', 'manage', 'Manage all subscriptions'),
('subscriptions.cancel', 'subscriptions', 'cancel', 'Cancel subscriptions');

-- Support Permissions
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('support.read_tickets', 'support', 'read_tickets', 'View support tickets'),
('support.create_tickets', 'support', 'create_tickets', 'Create support tickets'),
('support.respond_tickets', 'support', 'respond_tickets', 'Respond to support tickets'),
('support.manage_tickets', 'support', 'manage_tickets', 'Manage all support tickets'),
('support.read_newsletters', 'support', 'read_newsletters', 'View newsletters'),
('support.create_newsletters', 'support', 'create_newsletters', 'Create newsletters'),
('support.publish_newsletters', 'support', 'publish_newsletters', 'Publish newsletters');

-- Financial Permissions
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('financial.read', 'financial', 'read', 'View financial data'),
('financial.read_accounts', 'financial', 'read_accounts', 'View bank accounts'),
('financial.manage_accounts', 'financial', 'manage_accounts', 'Manage bank accounts'),
('financial.read_transactions', 'financial', 'read_transactions', 'View financial transactions'),
('financial.create_transactions', 'financial', 'create_transactions', 'Create financial transactions'),
('financial.approve_transactions', 'financial', 'approve_transactions', 'Approve financial transactions');

-- Workflow Approvals Permissions
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('approvals.read', 'approvals', 'read', 'View approval workflows'),
('approvals.create', 'approvals', 'create', 'Create approval requests'),
('approvals.approve', 'approvals', 'approve', 'Approve requests'),
('approvals.reject', 'approvals', 'reject', 'Reject requests'),
('approvals.read_history', 'approvals', 'read_history', 'View approval history');

-- ============================================================================
-- PART 2: ASSIGN PERMISSIONS TO SUPER ADMIN ROLE
-- ============================================================================

-- Get super_admin role ID (should be 5 based on previous migrations)
-- Assign all new permissions to super_admin role

-- Documents permissions to super_admin
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE permission_name IN (
  'documents.read',
  'documents.create',
  'documents.update',
  'documents.delete',
  'documents.approve',
  'documents.download',
  'documents.manage_versions'
);

-- Subscriptions permissions to super_admin
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE permission_name IN (
  'subscriptions.read',
  'subscriptions.create',
  'subscriptions.approve',
  'subscriptions.manage',
  'subscriptions.cancel'
);

-- Support permissions to super_admin
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE permission_name IN (
  'support.read_tickets',
  'support.create_tickets',
  'support.respond_tickets',
  'support.manage_tickets',
  'support.read_newsletters',
  'support.create_newsletters',
  'support.publish_newsletters'
);

-- Financial permissions to super_admin
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE permission_name IN (
  'financial.read',
  'financial.read_accounts',
  'financial.manage_accounts',
  'financial.read_transactions',
  'financial.create_transactions',
  'financial.approve_transactions'
);

-- Workflow Approvals permissions to super_admin
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE permission_name IN (
  'approvals.read',
  'approvals.create',
  'approvals.approve',
  'approvals.reject',
  'approvals.read_history'
);

-- ============================================================================
-- PART 3: ASSIGN BASIC PERMISSIONS TO COMPANY ADMIN ROLE
-- ============================================================================

-- Company admin (role_id = 2) gets read/create permissions for most features

-- Documents - read and create only
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE permission_name IN (
  'documents.read',
  'documents.create',
  'documents.download'
);

-- Subscriptions - read and request only
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE permission_name IN (
  'subscriptions.read',
  'subscriptions.create'
);

-- Support - full ticket access
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE permission_name IN (
  'support.read_tickets',
  'support.create_tickets',
  'support.respond_tickets',
  'support.read_newsletters'
);

-- Financial - read only
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE permission_name IN (
  'financial.read',
  'financial.read_accounts',
  'financial.read_transactions'
);

-- Approvals - read and create only
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE permission_name IN (
  'approvals.read',
  'approvals.create',
  'approvals.read_history'
);

-- ============================================================================
-- PART 4: ASSIGN BASIC PERMISSIONS TO TRADER ROLE
-- ============================================================================

-- Trader (role_id = 3) gets minimal permissions

-- Documents - read and download only
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE permission_name IN (
  'documents.read',
  'documents.download'
);

-- Support - create and view own tickets
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE permission_name IN (
  'support.read_tickets',
  'support.create_tickets',
  'support.read_newsletters'
);

-- Subscriptions - read only
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE permission_name IN (
  'subscriptions.read'
);

-- ============================================================================
-- VERIFICATION QUERY (for debugging)
-- ============================================================================

-- To verify permissions were added, run:
-- SELECT r.role_name, p.permission_name, p.resource, p.action
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON rp.permission_id = p.id
-- WHERE p.resource IN ('documents', 'subscriptions', 'support', 'financial', 'approvals')
-- ORDER BY r.role_name, p.resource, p.permission_name;

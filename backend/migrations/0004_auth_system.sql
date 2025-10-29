-- Authentication System Migration
-- Migration: 0004_auth_system.sql

-- Roles table (Admin, Compliance Officer, Trader, Auditor)
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table (granular access control)
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    permission_name TEXT UNIQUE NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Role permissions (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Update users table with additional fields
ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id);
ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN last_login_at DATETIME;
ALTER TABLE users ADD COLUMN password_changed_at DATETIME;
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until DATETIME;

-- Sessions table (for JWT refresh tokens and session management)
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Password resets table
CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    reset_token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- API rate limiting (track requests per user)
CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    ip_address TEXT,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (role_name, description) VALUES
    ('admin', 'System administrator with full access'),
    ('compliance_officer', 'Compliance and regulatory oversight'),
    ('trader', 'Trading desk user with limited access'),
    ('auditor', 'Read-only access for auditing purposes');

-- Insert default permissions
INSERT INTO permissions (permission_name, resource, action, description) VALUES
    -- Market Limits
    ('market_limits.read', 'market_limits', 'read', 'View market limits'),
    ('market_limits.create', 'market_limits', 'create', 'Create market limits'),
    ('market_limits.update', 'market_limits', 'update', 'Update market limits'),
    ('market_limits.delete', 'market_limits', 'delete', 'Delete market limits'),

    -- Position Limits
    ('position_limits.read', 'position_limits', 'read', 'View position limits'),
    ('position_limits.override', 'position_limits', 'override', 'Override position limits'),

    -- Transactions
    ('transactions.read', 'transactions', 'read', 'View transactions'),
    ('transactions.create', 'transactions', 'create', 'Create transactions'),
    ('transactions.import', 'transactions', 'import', 'Import transaction data'),

    -- Exemptions
    ('exemptions.read', 'exemptions', 'read', 'View exemptions'),
    ('exemptions.create', 'exemptions', 'create', 'Create exemptions'),
    ('exemptions.update', 'exemptions', 'update', 'Update exemptions'),
    ('exemptions.delete', 'exemptions', 'delete', 'Delete exemptions'),

    -- Alerts
    ('alerts.read', 'alerts', 'read', 'View alerts'),
    ('alerts.create', 'alerts', 'create', 'Create alerts'),
    ('alerts.acknowledge', 'alerts', 'acknowledge', 'Acknowledge alerts'),
    ('alerts.configure', 'alerts', 'configure', 'Configure alert rules'),

    -- Reports
    ('reports.read', 'reports', 'read', 'View reports'),
    ('reports.generate', 'reports', 'generate', 'Generate reports'),
    ('reports.schedule', 'reports', 'schedule', 'Schedule automated reports'),

    -- Audit Logs
    ('audit_logs.read', 'audit_logs', 'read', 'View audit logs'),

    -- Users
    ('users.read', 'users', 'read', 'View users'),
    ('users.create', 'users', 'create', 'Create users'),
    ('users.update', 'users', 'update', 'Update users'),
    ('users.delete', 'users', 'delete', 'Delete users'),

    -- System
    ('system.configure', 'system', 'configure', 'Configure system settings'),
    ('system.import_data', 'system', 'import_data', 'Import system data');

-- Assign permissions to roles
-- Admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.role_name = 'admin';

-- Compliance Officer: read all, update exemptions/limits, generate reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name = 'compliance_officer'
AND p.permission_name IN (
    'market_limits.read', 'market_limits.update',
    'position_limits.read', 'position_limits.override',
    'transactions.read', 'transactions.import',
    'exemptions.read', 'exemptions.create', 'exemptions.update', 'exemptions.delete',
    'alerts.read', 'alerts.acknowledge', 'alerts.configure',
    'reports.read', 'reports.generate', 'reports.schedule',
    'audit_logs.read'
);

-- Trader: read limits, view own transactions, view alerts
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name = 'trader'
AND p.permission_name IN (
    'market_limits.read',
    'position_limits.read',
    'transactions.read', 'transactions.create',
    'alerts.read',
    'reports.read'
);

-- Auditor: read-only access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name = 'auditor'
AND p.permission_name LIKE '%.read';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(reset_token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_address ON rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

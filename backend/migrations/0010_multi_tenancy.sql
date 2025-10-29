-- Trade Nexus Database Schema
-- Migration: 0010_multi_tenancy.sql
-- Phase 10: Multi-Role Ecosystem - Multi-Tenancy Architecture

-- ============================================================================
-- EXCHANGES TABLE
-- Represents regulatory bodies or exchanges (e.g., ICE, CME, CFTC)
-- Super Admin manages these
-- ============================================================================
CREATE TABLE IF NOT EXISTS exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exchange_code TEXT UNIQUE NOT NULL,
    exchange_name TEXT NOT NULL,
    regulatory_body TEXT,
    country TEXT,
    description TEXT,
    website TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- COMPANIES TABLE
-- Represents trading firms/companies under an exchange
-- Company Admins manage their own company
-- ============================================================================
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exchange_id INTEGER NOT NULL,
    company_code TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    legal_entity_name TEXT,
    registration_number TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    compliance_officer_name TEXT,
    compliance_officer_email TEXT,
    is_active INTEGER DEFAULT 1,
    onboarding_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE CASCADE
);

-- ============================================================================
-- TRADER ASSIGNMENTS
-- Maps traders (users with trader role) to companies
-- A trader belongs to one company, but could have multiple accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS trader_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    trader_code TEXT,
    desk_name TEXT,
    reporting_to INTEGER,
    is_primary INTEGER DEFAULT 1,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (reporting_to) REFERENCES users(id),
    UNIQUE(user_id, company_id)
);

-- ============================================================================
-- COMPANY LIMITS
-- Company-specific position limits set by Company Admin
-- These override or supplement exchange-level limits
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    commodity_code TEXT NOT NULL,
    contract_name TEXT,
    limit_type INTEGER NOT NULL,
    spot_month_limit REAL,
    single_month_limit REAL,
    all_month_limit REAL,
    internal_limit_pct REAL DEFAULT 90,
    alert_threshold_pct REAL DEFAULT 80,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    notes TEXT,
    approved_by INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- ============================================================================
-- TRADER POSITIONS
-- Self-reported positions by traders for transparency
-- ============================================================================
CREATE TABLE IF NOT EXISTS trader_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trader_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    market_location TEXT NOT NULL,
    commodity_code TEXT NOT NULL,
    contract_month DATE NOT NULL,
    position_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    reported_date DATE NOT NULL,
    trade_date DATE,
    settlement_date DATE,
    status TEXT DEFAULT 'pending',
    verified_by INTEGER,
    verified_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trader_id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- ============================================================================
-- UPDATE EXISTING TABLES
-- Add company and exchange scoping to existing tables
-- ============================================================================

-- Add company_id to users table for company assignment
ALTER TABLE users ADD COLUMN company_id INTEGER REFERENCES companies(id);
ALTER TABLE users ADD COLUMN trader_code TEXT;
ALTER TABLE users ADD COLUMN department TEXT;

-- Add exchange_id to market_limits for multi-exchange support
ALTER TABLE market_limits ADD COLUMN exchange_id INTEGER REFERENCES exchanges(id);

-- Add company and trader scoping to transactions
ALTER TABLE transactions ADD COLUMN company_id INTEGER REFERENCES companies(id);
ALTER TABLE transactions ADD COLUMN trader_id INTEGER REFERENCES users(id);

-- Add company scoping to limit_calculations
ALTER TABLE limit_calculations ADD COLUMN company_id INTEGER REFERENCES companies(id);

-- Add company scoping to alerts
ALTER TABLE alerts ADD COLUMN company_id INTEGER REFERENCES companies(id);
ALTER TABLE alerts ADD COLUMN trader_id INTEGER REFERENCES users(id);

-- ============================================================================
-- NEW ROLES
-- Add Super Admin and Company Admin roles
-- ============================================================================

-- Insert new roles
INSERT INTO roles (role_name, description) VALUES
    ('super_admin', 'Super Administrator - manages exchanges and companies'),
    ('company_admin', 'Company Administrator - manages company users and limits')
ON CONFLICT(role_name) DO NOTHING;

-- ============================================================================
-- NEW PERMISSIONS
-- Add permissions for multi-tenancy features
-- ============================================================================

INSERT INTO permissions (permission_name, resource, action, description) VALUES
    -- Exchanges
    ('exchanges.read', 'exchanges', 'read', 'View exchanges'),
    ('exchanges.create', 'exchanges', 'create', 'Create exchanges'),
    ('exchanges.update', 'exchanges', 'update', 'Update exchanges'),
    ('exchanges.delete', 'exchanges', 'delete', 'Delete exchanges'),

    -- Companies
    ('companies.read', 'companies', 'read', 'View companies'),
    ('companies.create', 'companies', 'create', 'Create companies'),
    ('companies.update', 'companies', 'update', 'Update companies'),
    ('companies.delete', 'companies', 'delete', 'Delete companies'),
    ('companies.read_own', 'companies', 'read_own', 'View own company'),

    -- Traders
    ('traders.read', 'traders', 'read', 'View traders'),
    ('traders.assign', 'traders', 'assign', 'Assign traders to companies'),
    ('traders.update', 'traders', 'update', 'Update trader assignments'),
    ('traders.read_own', 'traders', 'read_own', 'View own trader info'),

    -- Company Limits
    ('company_limits.read', 'company_limits', 'read', 'View company limits'),
    ('company_limits.create', 'company_limits', 'create', 'Create company limits'),
    ('company_limits.update', 'company_limits', 'update', 'Update company limits'),
    ('company_limits.delete', 'company_limits', 'delete', 'Delete company limits'),

    -- Trader Positions
    ('trader_positions.read', 'trader_positions', 'read', 'View trader positions'),
    ('trader_positions.create', 'trader_positions', 'create', 'Report trader positions'),
    ('trader_positions.verify', 'trader_positions', 'verify', 'Verify trader positions'),
    ('trader_positions.read_own', 'trader_positions', 'read_own', 'View own positions')
ON CONFLICT(permission_name) DO NOTHING;

-- ============================================================================
-- ROLE PERMISSIONS ASSIGNMENT
-- Assign permissions to new roles
-- ============================================================================

-- Super Admin: all permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.role_name = 'super_admin';

-- Company Admin: manage own company, traders, and limits
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name = 'company_admin'
AND p.permission_name IN (
    'companies.read_own',
    'traders.read', 'traders.assign', 'traders.update',
    'company_limits.read', 'company_limits.create', 'company_limits.update', 'company_limits.delete',
    'trader_positions.read', 'trader_positions.verify',
    'market_limits.read',
    'position_limits.read',
    'transactions.read', 'transactions.create', 'transactions.import',
    'alerts.read', 'alerts.acknowledge',
    'reports.read', 'reports.generate'
);

-- Update Trader role: add position reporting
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name = 'trader'
AND p.permission_name IN (
    'traders.read_own',
    'trader_positions.create',
    'trader_positions.read_own',
    'companies.read_own'
);

-- ============================================================================
-- INDEXES
-- Performance optimization for multi-tenancy queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_companies_exchange_id ON companies(exchange_id);
CREATE INDEX IF NOT EXISTS idx_companies_company_code ON companies(company_code);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

CREATE INDEX IF NOT EXISTS idx_trader_assignments_user_id ON trader_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_trader_assignments_company_id ON trader_assignments(company_id);

CREATE INDEX IF NOT EXISTS idx_company_limits_company_id ON company_limits(company_id);
CREATE INDEX IF NOT EXISTS idx_company_limits_commodity_code ON company_limits(commodity_code);
CREATE INDEX IF NOT EXISTS idx_company_limits_is_active ON company_limits(is_active);

CREATE INDEX IF NOT EXISTS idx_trader_positions_trader_id ON trader_positions(trader_id);
CREATE INDEX IF NOT EXISTS idx_trader_positions_company_id ON trader_positions(company_id);
CREATE INDEX IF NOT EXISTS idx_trader_positions_reported_date ON trader_positions(reported_date);
CREATE INDEX IF NOT EXISTS idx_trader_positions_status ON trader_positions(status);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_trader_code ON users(trader_code);

CREATE INDEX IF NOT EXISTS idx_market_limits_exchange_id ON market_limits(exchange_id);

CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_trader_id ON transactions(trader_id);

CREATE INDEX IF NOT EXISTS idx_limit_calculations_company_id ON limit_calculations(company_id);

CREATE INDEX IF NOT EXISTS idx_alerts_company_id ON alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_trader_id ON alerts(trader_id);

-- ============================================================================
-- SEED DATA
-- Insert default exchange and company for existing data
-- ============================================================================

-- Insert default exchange
INSERT INTO exchanges (exchange_code, exchange_name, regulatory_body, country, is_active)
VALUES ('ICE', 'Intercontinental Exchange', 'CFTC', 'United States', 1);

-- Insert default company
INSERT INTO companies (exchange_id, company_code, company_name, is_active)
SELECT id, 'DEFAULT', 'Default Trading Company', 1
FROM exchanges WHERE exchange_code = 'ICE';

-- Update existing users to belong to default company
UPDATE users
SET company_id = (SELECT id FROM companies WHERE company_code = 'DEFAULT')
WHERE company_id IS NULL;

-- Update existing market_limits to belong to ICE exchange
UPDATE market_limits
SET exchange_id = (SELECT id FROM exchanges WHERE exchange_code = 'ICE')
WHERE exchange_id IS NULL;

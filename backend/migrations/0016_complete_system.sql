-- Migration 0016: Complete System - All Missing Features
-- Implements: Document Management, Subscriptions, Support, Financial, Approvals, 2FA

-- ============================================================================
-- PART 1: DOCUMENT MANAGEMENT SYSTEM
-- ============================================================================

-- Documents table for ICE/CFTC rule books and internal compliance docs
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_type TEXT NOT NULL, -- 'exchange_rule', 'compliance_guideline', 'internal_policy', 'regulatory_update'
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'ICE', 'CFTC', 'CME', 'NYMEX', 'INTERNAL'

  -- File information
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_hash TEXT, -- SHA-256 for integrity
  mime_type TEXT,

  -- Versioning
  version TEXT NOT NULL DEFAULT '1.0',
  version_number INTEGER NOT NULL DEFAULT 1,
  previous_version_id INTEGER,
  is_current_version INTEGER DEFAULT 1,

  -- Metadata
  effective_date DATE,
  expiration_date DATE,
  revision_notes TEXT,
  change_summary TEXT,

  -- Access control
  exchange_id INTEGER,
  company_id INTEGER, -- NULL for exchange docs, specific for company docs
  visibility TEXT DEFAULT 'all', -- 'all', 'super_admin', 'company_specific'

  -- Tracking
  uploaded_by INTEGER NOT NULL,
  approved_by INTEGER,
  approved_at DATETIME,
  status TEXT DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'archived'

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (exchange_id) REFERENCES exchanges(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (previous_version_id) REFERENCES documents(id)
);

-- Document access log
CREATE TABLE IF NOT EXISTS document_access_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'view', 'download', 'print'
  ip_address TEXT,
  user_agent TEXT,
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Document notifications (when new versions are published)
CREATE TABLE IF NOT EXISTS document_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  notification_type TEXT NOT NULL, -- 'new_version', 'update', 'expiring'
  recipient_type TEXT NOT NULL, -- 'all_companies', 'specific_company', 'all_traders'
  company_id INTEGER,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  message TEXT,

  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- ============================================================================
-- PART 2: SUBSCRIPTION AND PLANS SYSTEM
-- ============================================================================

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_name TEXT NOT NULL UNIQUE,
  plan_code TEXT NOT NULL UNIQUE,
  plan_type TEXT NOT NULL, -- 'trader_based', 'product_based', 'volume_based'

  -- Limits
  max_traders INTEGER,
  max_products INTEGER,
  max_monthly_trades INTEGER,

  -- Pricing
  base_price REAL NOT NULL,
  per_trader_price REAL,
  per_product_price REAL,
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT DEFAULT 'monthly', -- 'monthly', 'quarterly', 'annually'

  -- Features
  features TEXT, -- JSON array of included features

  -- Status
  is_active INTEGER DEFAULT 1,
  is_public INTEGER DEFAULT 1, -- Can companies self-select this plan?

  -- Metadata
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Company subscriptions
CREATE TABLE IF NOT EXISTS company_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'cancelled', 'expired'

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  next_billing_date DATE,
  trial_end_date DATE,

  -- Pricing
  monthly_price REAL NOT NULL,
  discount_percentage REAL DEFAULT 0,
  actual_price REAL NOT NULL,

  -- Usage tracking
  current_traders_count INTEGER DEFAULT 0,
  current_products_count INTEGER DEFAULT 0,
  current_monthly_trades INTEGER DEFAULT 0,

  -- Approval workflow
  requested_by INTEGER,
  requested_at DATETIME,
  approved_by INTEGER,
  approved_at DATETIME,
  rejection_reason TEXT,

  -- Auto-renewal
  auto_renew INTEGER DEFAULT 1,

  -- Metadata
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Subscription history (track all plan changes)
CREATE TABLE IF NOT EXISTS subscription_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'created', 'upgraded', 'downgraded', 'renewed', 'suspended', 'cancelled'
  old_plan_id INTEGER,
  new_plan_id INTEGER,
  old_price REAL,
  new_price REAL,
  performed_by INTEGER,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (subscription_id) REFERENCES company_subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (old_plan_id) REFERENCES subscription_plans(id),
  FOREIGN KEY (new_plan_id) REFERENCES subscription_plans(id),
  FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- ============================================================================
-- PART 3: SUPPORT TICKETS AND COMMUNICATION
-- ============================================================================

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL UNIQUE,

  -- Ticket details
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT, -- 'technical', 'compliance', 'billing', 'general'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'

  -- Participants
  created_by INTEGER NOT NULL,
  company_id INTEGER,
  assigned_to INTEGER,

  -- Resolution
  resolved_at DATETIME,
  resolved_by INTEGER,
  resolution_notes TEXT,

  -- Metadata
  tags TEXT, -- JSON array
  attachments TEXT, -- JSON array of file paths

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_response_at DATETIME,

  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- Ticket messages
CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  sender_id INTEGER NOT NULL,
  is_internal INTEGER DEFAULT 0, -- Internal notes visible only to support staff
  attachments TEXT, -- JSON array of file paths
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Newsletters and broadcasts
CREATE TABLE IF NOT EXISTS newsletters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- 'market_update', 'rule_change', 'system_announcement', 'compliance_alert'

  -- Targeting
  recipient_type TEXT NOT NULL, -- 'all_companies', 'specific_companies', 'all_traders', 'exchange_specific'
  target_companies TEXT, -- JSON array of company IDs
  target_exchanges TEXT, -- JSON array of exchange IDs

  -- Publishing
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'published'
  published_by INTEGER,
  published_at DATETIME,
  scheduled_for DATETIME,

  -- Metadata
  attachments TEXT, -- JSON array
  tags TEXT, -- JSON array
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (published_by) REFERENCES users(id)
);

-- Newsletter read receipts
CREATE TABLE IF NOT EXISTS newsletter_reads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  newsletter_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  company_id INTEGER,
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (newsletter_id) REFERENCES newsletters(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE(newsletter_id, user_id)
);

-- ============================================================================
-- PART 4: BANK ACCOUNTS AND FINANCIAL TRACKING
-- ============================================================================

-- Bank accounts (for regulator and companies)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_holder_type TEXT NOT NULL, -- 'regulator', 'company'
  company_id INTEGER, -- NULL for regulator accounts

  -- Account details
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bank_branch TEXT,
  swift_code TEXT,
  routing_number TEXT,
  iban TEXT,

  -- Account info
  account_type TEXT DEFAULT 'checking', -- 'checking', 'savings', 'escrow'
  currency TEXT DEFAULT 'USD',
  current_balance REAL DEFAULT 0,

  -- Status
  is_primary INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,

  -- Metadata
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Financial transactions
CREATE TABLE IF NOT EXISTS financial_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_number TEXT NOT NULL UNIQUE,

  -- Transaction details
  transaction_type TEXT NOT NULL, -- 'subscription_payment', 'penalty', 'fee', 'refund', 'deposit'
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Parties
  from_account_id INTEGER,
  to_account_id INTEGER,
  company_id INTEGER,

  -- Related entities
  subscription_id INTEGER,
  breach_event_id INTEGER,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled', 'refunded'

  -- Payment details
  payment_method TEXT, -- 'bank_transfer', 'credit_card', 'wire', 'check'
  reference_number TEXT,
  transaction_date DATE NOT NULL,
  completed_at DATETIME,

  -- Metadata
  description TEXT,
  notes TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (from_account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (to_account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (subscription_id) REFERENCES company_subscriptions(id),
  FOREIGN KEY (breach_event_id) REFERENCES position_breach_events(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================================
-- PART 5: APPROVAL WORKFLOWS
-- ============================================================================

-- Generic approval requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_type TEXT NOT NULL, -- 'company_signup', 'trader_verification', 'subscription_upgrade', 'limit_override'

  -- Request details
  title TEXT NOT NULL,
  description TEXT,

  -- Related entities
  company_id INTEGER,
  user_id INTEGER,
  subscription_id INTEGER,
  limit_calculation_id INTEGER,

  -- Request data
  request_data TEXT, -- JSON of the data being requested for approval

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- Workflow
  requested_by INTEGER NOT NULL,
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INTEGER,
  reviewed_at DATETIME,
  approval_notes TEXT,
  rejection_reason TEXT,

  -- Expiry
  expires_at DATETIME,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (subscription_id) REFERENCES company_subscriptions(id),
  FOREIGN KEY (limit_calculation_id) REFERENCES limit_calculations(id),
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Approval workflow history
CREATE TABLE IF NOT EXISTS approval_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  approval_request_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'submitted', 'assigned', 'commented', 'approved', 'rejected'
  performed_by INTEGER NOT NULL,
  comment TEXT,
  old_status TEXT,
  new_status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- ============================================================================
-- PART 6: TWO-FACTOR AUTHENTICATION (2FA)
-- ============================================================================

-- 2FA settings per user
CREATE TABLE IF NOT EXISTS user_2fa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,

  -- 2FA method
  method TEXT NOT NULL DEFAULT 'totp', -- 'totp', 'sms', 'email'
  is_enabled INTEGER DEFAULT 0,

  -- TOTP (Time-based One-Time Password)
  totp_secret TEXT,
  totp_backup_codes TEXT, -- JSON array of backup codes (hashed)

  -- SMS
  phone_number TEXT,
  phone_verified INTEGER DEFAULT 0,

  -- Email
  email_verified INTEGER DEFAULT 0,

  -- Recovery
  recovery_email TEXT,

  -- Metadata
  enabled_at DATETIME,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2FA verification attempts
CREATE TABLE IF NOT EXISTS user_2fa_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  method TEXT NOT NULL,
  code TEXT NOT NULL,
  is_successful INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Trusted devices (skip 2FA for recognized devices)
CREATE TABLE IF NOT EXISTS trusted_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, device_fingerprint)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_current ON documents(is_current_version);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_exchange ON documents(exchange_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON company_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON company_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_dates ON company_subscriptions(next_billing_date);

-- Support
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_company ON support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON support_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters(status);
CREATE INDEX IF NOT EXISTS idx_newsletters_published ON newsletters(published_at);

-- Financial
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_company ON financial_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_subscription ON financial_transactions(subscription_id);

-- Approvals
CREATE INDEX IF NOT EXISTS idx_approvals_type ON approval_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approvals_company ON approval_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_approvals_requested_by ON approval_requests(requested_by);

-- 2FA
CREATE INDEX IF NOT EXISTS idx_2fa_user ON user_2fa(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_enabled ON user_2fa(is_enabled);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_active ON trusted_devices(is_active);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Default subscription plans
INSERT INTO subscription_plans (plan_name, plan_code, plan_type, max_traders, max_products, max_monthly_trades, base_price, per_trader_price, description, features) VALUES
  ('Starter', 'STARTER', 'trader_based', 5, 10, 1000, 99.00, 20.00, 'Perfect for small trading firms', '["Basic monitoring", "Email alerts", "Standard reports"]'),
  ('Professional', 'PRO', 'trader_based', 25, 50, 10000, 499.00, 15.00, 'For growing trading operations', '["Advanced monitoring", "SMS alerts", "Custom reports", "API access"]'),
  ('Enterprise', 'ENTERPRISE', 'volume_based', 9999, 9999, 999999, 1999.00, 10.00, 'Unlimited trading with premium support', '["Real-time monitoring", "Priority alerts", "Unlimited reports", "API access", "Dedicated support"]'),
  ('Trial', 'TRIAL', 'trader_based', 2, 5, 100, 0.00, 0.00, '30-day free trial', '["Basic monitoring", "Email alerts"]');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update document version when new version is created
CREATE TRIGGER IF NOT EXISTS trg_document_version_update
AFTER INSERT ON documents
FOR EACH ROW
WHEN NEW.previous_version_id IS NOT NULL
BEGIN
  UPDATE documents
  SET is_current_version = 0
  WHERE id = NEW.previous_version_id;
END;

-- Auto-update bank account balance on transaction completion
CREATE TRIGGER IF NOT EXISTS trg_transaction_update_balance
AFTER UPDATE ON financial_transactions
FOR EACH ROW
WHEN NEW.status = 'completed' AND OLD.status != 'completed'
BEGIN
  -- Debit from account
  UPDATE bank_accounts
  SET current_balance = current_balance - NEW.amount,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.from_account_id;

  -- Credit to account
  UPDATE bank_accounts
  SET current_balance = current_balance + NEW.amount,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.to_account_id;
END;

-- Log approval workflow changes
CREATE TRIGGER IF NOT EXISTS trg_approval_history
AFTER UPDATE ON approval_requests
FOR EACH ROW
WHEN OLD.status != NEW.status
BEGIN
  INSERT INTO approval_history (approval_request_id, action, performed_by, old_status, new_status)
  VALUES (NEW.id, NEW.status, NEW.reviewed_by, OLD.status, NEW.status);
END;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active subscriptions summary
CREATE VIEW IF NOT EXISTS v_active_subscriptions AS
SELECT
  cs.id,
  cs.company_id,
  c.company_name,
  sp.plan_name,
  cs.status,
  cs.start_date,
  cs.end_date,
  cs.next_billing_date,
  cs.actual_price,
  cs.current_traders_count,
  cs.current_products_count,
  sp.max_traders,
  sp.max_products,
  CAST(cs.current_traders_count AS REAL) / NULLIF(sp.max_traders, 0) * 100 as trader_utilization_pct,
  CAST(cs.current_products_count AS REAL) / NULLIF(sp.max_products, 0) * 100 as product_utilization_pct
FROM company_subscriptions cs
JOIN companies c ON cs.company_id = c.id
JOIN subscription_plans sp ON cs.plan_id = sp.id
WHERE cs.status = 'active';

-- Open support tickets summary
CREATE VIEW IF NOT EXISTS v_open_tickets AS
SELECT
  st.id,
  st.ticket_number,
  st.subject,
  st.category,
  st.priority,
  st.status,
  st.created_at,
  st.last_response_at,
  c.company_name,
  u_created.name as created_by_name,
  u_assigned.name as assigned_to_name,
  (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = st.id) as message_count
FROM support_tickets st
LEFT JOIN companies c ON st.company_id = c.id
LEFT JOIN users u_created ON st.created_by = u_created.id
LEFT JOIN users u_assigned ON st.assigned_to = u_assigned.id
WHERE st.status NOT IN ('resolved', 'closed')
ORDER BY
  CASE st.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  st.created_at ASC;

-- Pending approvals summary
CREATE VIEW IF NOT EXISTS v_pending_approvals AS
SELECT
  ar.id,
  ar.request_type,
  ar.title,
  ar.status,
  ar.priority,
  ar.requested_at,
  ar.expires_at,
  c.company_name,
  u_requested.name as requested_by_name,
  u_requested.email as requested_by_email
FROM approval_requests ar
LEFT JOIN companies c ON ar.company_id = c.id
LEFT JOIN users u_requested ON ar.requested_by = u_requested.id
WHERE ar.status = 'pending'
ORDER BY
  CASE ar.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    WHEN 'low' THEN 4
  END,
  ar.requested_at ASC;

-- Financial summary per company
CREATE VIEW IF NOT EXISTS v_company_financials AS
SELECT
  c.id as company_id,
  c.company_name,
  ba.current_balance,
  (SELECT SUM(amount) FROM financial_transactions WHERE company_id = c.id AND status = 'completed' AND transaction_type = 'subscription_payment') as total_subscription_payments,
  (SELECT SUM(amount) FROM financial_transactions WHERE company_id = c.id AND status = 'completed' AND transaction_type = 'penalty') as total_penalties,
  (SELECT SUM(amount) FROM financial_transactions WHERE company_id = c.id AND status = 'pending') as pending_transactions_amount
FROM companies c
LEFT JOIN bank_accounts ba ON c.id = ba.company_id AND ba.is_primary = 1 AND ba.is_active = 1;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- ✅ Document Management System (versioning, access control, notifications)
-- ✅ Subscription & Plans (plans, company subscriptions, billing, usage tracking)
-- ✅ Support & Communication (tickets, messages, newsletters, broadcasts)
-- ✅ Bank Accounts & Financial (accounts, transactions, automated balance updates)
-- ✅ Approval Workflows (generic approval system with history)
-- ✅ Two-Factor Authentication (TOTP, SMS, email, backup codes, trusted devices)

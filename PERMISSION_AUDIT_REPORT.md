# Trade Nexus Permission Audit Report

**Generated**: 2025-10-30
**Purpose**: Verify role-permission mappings are correctly set up

---

## 1. Roles in System

Based on database migrations, we have **6 roles**:

| Role ID | Role Name | Description | Hierarchy |
|---------|-----------|-------------|-----------|
| 1 | **admin** | System administrator with full access | Highest (legacy) |
| 2 | **compliance_officer** | Compliance and regulatory oversight | High |
| 3 | **trader** | Trading desk user with limited access | Low |
| 4 | **auditor** | Read-only access for auditing purposes | Read-only |
| 5 | **super_admin** | Super Administrator - manages exchanges and companies | Highest |
| 6 | **company_admin** | Company Administrator - manages company users and limits | Medium |

### Role Hierarchy
```
super_admin (5) ────┐
admin (1) ──────────┼──> Full Access
                    │
company_admin (6) ──┤
compliance_officer (2)──> Management Access
                    │
trader (3) ─────────┼──> Limited Access
                    │
auditor (4) ────────┴──> Read-Only Access
```

---

## 2. Permissions Used in Routes

**Total**: 39 unique permissions found in `authorize()` middleware

### By Resource Category

#### System & Configuration
- ✅ `system.configure` - System settings

#### Alerts
- ✅ `alerts.read` - View alerts
- ✅ `alerts.create` - Create alerts
- ✅ `alerts.acknowledge` - Acknowledge alerts
- ✅ `alerts.configure` - Configure alert rules

#### API Keys
- ⚠️ `api_keys.read` - View API keys
- ⚠️ `api_keys.create` - Create API keys
- ⚠️ `api_keys.update` - Update API keys
- ⚠️ `api_keys.delete` - Delete API keys

#### Approvals (Workflow)
- ✅ `approvals.read` - View approval workflows
- ✅ `approvals.approve` - Approve requests

#### Companies
- ✅ `companies.create` - Create companies

#### Documents
- ✅ `documents.read` - View documents
- ✅ `documents.create` - Upload documents
- ✅ `documents.approve` - Approve documents
- ✅ `documents.delete` - Delete documents

#### Exchanges
- ✅ `exchanges.read` - View exchanges
- ✅ `exchanges.create` - Create exchanges
- ✅ `exchanges.update` - Update exchanges
- ✅ `exchanges.delete` - Delete exchanges

#### Exemptions (CFTC)
- ✅ `exemptions.create` - Create exemptions
- ✅ `exemptions.approve` - Approve exemptions
- ✅ `exemptions.delete` - Delete exemptions

#### Filings (Regulatory)
- ⚠️ `filings.create` - Generate filings
- ⚠️ `filings.submit` - Submit filings

#### Financial
- ✅ `financial.read` - View financial data
- ✅ `financial.create` - Create transactions
- ✅ `financial.manage` - Manage accounts

#### Newsletters
- ⚠️ `newsletters.create` - Create newsletters
- ⚠️ `newsletters.publish` - Publish newsletters

#### Risk Management
- ⚠️ `risk.configure` - Configure risk thresholds

#### Security
- ✅ `security.read` - View security events
- ✅ `security.manage` - Manage security events

#### Subscriptions
- ✅ `subscriptions.read` - View subscriptions
- ✅ `subscriptions.create` - Create subscription requests
- ✅ `subscriptions.approve` - Approve subscriptions

#### Support
- ✅ `support.manage` - Manage support tickets

#### Trades
- ⚠️ `trades.approve` - Approve trades

#### Users
- ✅ `users.create` - Create users
- ✅ `users.delete` - Delete users

**Legend**:
- ✅ Defined in migrations
- ⚠️ **MISSING** from migrations (used in routes but not defined)

---

## 3. Missing Permissions (CRITICAL)

These permissions are **used in routes but NOT defined** in database migrations:

### ⚠️ API Keys Permissions (4 missing)
```sql
-- MISSING from migrations - Need to add:
INSERT INTO permissions (permission_name, resource, action, description) VALUES
('api_keys.read', 'api_keys', 'read', 'View API keys'),
('api_keys.create', 'api_keys', 'create', 'Create API keys'),
('api_keys.update', 'api_keys', 'update', 'Update API keys'),
('api_keys.delete', 'api_keys', 'delete', 'Delete API keys');
```
**Used in**: `backend/src/routes/api-keys.ts`

### ⚠️ Regulatory Filings Permissions (2 missing)
```sql
-- MISSING from migrations - Need to add:
INSERT INTO permissions (permission_name, resource, action, description) VALUES
('filings.create', 'filings', 'create', 'Generate regulatory filings'),
('filings.submit', 'filings', 'submit', 'Submit regulatory filings to authorities');
```
**Used in**: `backend/src/routes/regulatory-filings.ts`

### ⚠️ Newsletter Permissions (2 missing)
```sql
-- MISSING from migrations - Need to add:
INSERT INTO permissions (permission_name, resource, action, description) VALUES
('newsletters.create', 'newsletters', 'create', 'Create newsletters'),
('newsletters.publish', 'newsletters', 'publish', 'Publish newsletters');
```
**Used in**: `backend/src/routes/support.ts`

**Note**: Migration 0017 references `support.create_newsletters` and `support.publish_newsletters`, but routes use `newsletters.*`

### ⚠️ Risk Configuration Permission (1 missing)
```sql
-- MISSING from migrations - Need to add:
INSERT INTO permissions (permission_name, resource, action, description) VALUES
('risk.configure', 'risk', 'configure', 'Configure risk thresholds and scenarios');
```
**Used in**: `backend/src/routes/risk-thresholds.ts`

### ⚠️ Trade Approval Permission (1 missing)
```sql
-- MISSING from migrations - Need to add:
INSERT INTO permissions (permission_name, resource, action, description) VALUES
('trades.approve', 'trades', 'approve', 'Approve trading transactions');
```
**Used in**: `backend/src/routes/trade-approvals.ts`

---

## 4. Role-Permission Mappings

### 4.1 Super Admin (Role ID: 5)
**Expected**: ALL permissions (wildcard)

**Assigned**: Migration 0010 grants all permissions:
```sql
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.role_name = 'super_admin';
```

**Status**: ✅ Correctly configured (gets all permissions automatically)

---

### 4.2 Admin (Role ID: 1)
**Expected**: ALL permissions (legacy full access role)

**Assigned**: Migration 0004 grants all permissions:
```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.role_name = 'admin';
```

**Status**: ✅ Correctly configured

---

### 4.3 Company Admin (Role ID: 6)
**Expected**: Manage own company, users, limits, reports

**Assigned Permissions** (from migrations):
- ✅ `companies.read_own`
- ✅ `traders.*` (read, assign, update)
- ✅ `company_limits.*` (all)
- ✅ `trader_positions.*` (read, verify)
- ✅ `market_limits.read`
- ✅ `position_limits.read`
- ✅ `transactions.*` (read, create, import)
- ✅ `alerts.*` (read, acknowledge)
- ✅ `reports.*` (read, generate)
- ✅ `documents.*` (read, create, download) - Migration 0017
- ✅ `subscriptions.*` (read, create) - Migration 0017
- ✅ `support.*` (tickets, newsletters read) - Migration 0017
- ✅ `financial.read*` - Migration 0017
- ✅ `approvals.*` (read, create, history) - Migration 0017
- ✅ `security.*` (read, manage) - Migration 0019

**Missing** for Company Admin:
- ❌ `api_keys.*` - Should have read/create/update/delete
- ❌ `filings.*` - Should have create/submit
- ❌ `risk.configure` - Should have this
- ❌ `exemptions.*` - Should have create at minimum

**Recommendation**: Add these permissions to company_admin role

---

### 4.4 Compliance Officer (Role ID: 2)
**Expected**: Compliance oversight, manage exemptions, limits, generate reports

**Assigned Permissions**:
- ✅ `market_limits.*` (read, update)
- ✅ `position_limits.*` (read, override)
- ✅ `transactions.*` (read, import)
- ✅ `exemptions.*` (all)
- ✅ `alerts.*` (read, acknowledge, configure)
- ✅ `reports.*` (read, generate, schedule)
- ✅ `audit_logs.read`

**Missing** for Compliance Officer:
- ❌ `filings.*` - **CRITICAL** - Compliance should submit regulatory filings
- ❌ `risk.configure` - Should configure risk parameters
- ❌ `documents.*` - Should manage compliance documents
- ❌ `security.read` - Should view security events

**Recommendation**: Add these permissions to compliance_officer role

---

### 4.5 Trader (Role ID: 3)
**Expected**: View limits, create trades, view own positions

**Assigned Permissions**:
- ✅ `market_limits.read`
- ✅ `position_limits.read`
- ✅ `transactions.*` (read, create)
- ✅ `alerts.read`
- ✅ `reports.read`
- ✅ `traders.read_own` - Migration 0010
- ✅ `trader_positions.*` (create, read_own) - Migration 0010
- ✅ `companies.read_own` - Migration 0010
- ✅ `documents.*` (read, download) - Migration 0017
- ✅ `support.*` (create, read tickets/newsletters) - Migration 0017
- ✅ `subscriptions.read` - Migration 0017

**Missing** for Trader:
- ❌ `exemptions.read` - Traders should view exemptions that apply to them

**Status**: Mostly correct, minor addition needed

---

### 4.6 Auditor (Role ID: 4)
**Expected**: Read-only access to everything

**Assigned Permissions**:
```sql
-- Gets all permissions ending with '.read'
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name = 'auditor'
AND p.permission_name LIKE '%.read';
```
- ✅ `security.read` - Migration 0019

**Status**: ✅ Correctly configured (automatic read-only access)

---

## 5. Issues Summary

### 🔴 Critical Issues (Must Fix)

1. **Missing Permission Definitions** (10 permissions)
   - `api_keys.*` (4 permissions)
   - `filings.*` (2 permissions)
   - `newsletters.*` (2 permissions)
   - `risk.configure` (1 permission)
   - `trades.approve` (1 permission)

   **Impact**: Routes using these permissions will fail authorization checks

2. **Compliance Officer Missing Critical Permissions**
   - No `filings.*` permissions (cannot submit regulatory filings)
   - No `documents.*` permissions (cannot manage compliance docs)

   **Impact**: Compliance officers cannot perform their core duties

### 🟡 Medium Priority Issues

3. **Company Admin Missing Business Permissions**
   - No `api_keys.*` (cannot integrate systems)
   - No `filings.*` (cannot handle regulatory filings)
   - No `exemptions.*` (cannot request exemptions)

   **Impact**: Company admins need IT support for basic tasks

4. **Inconsistent Permission Naming**
   - Migration 0017 uses `support.create_newsletters` and `support.publish_newsletters`
   - Routes use `newsletters.create` and `newsletters.publish`

   **Impact**: Either routes or migrations need updating

### 🟢 Low Priority Issues

5. **Trader Missing Exemption View**
   - Traders should see exemptions that affect their trading limits

   **Impact**: Minor - traders can work without this

---

## 6. Recommended Fixes

### Step 1: Create Missing Permissions Migration

Create `backend/migrations/0028_add_missing_permissions.sql`:

```sql
-- Migration 0028: Add missing permissions used in routes
-- Fixes authorization failures for API keys, filings, risk, trades, and newsletters

-- API Keys permissions
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('api_keys.read', 'api_keys', 'read', 'View API keys and usage statistics'),
('api_keys.create', 'api_keys', 'create', 'Create new API keys'),
('api_keys.update', 'api_keys', 'update', 'Update API key settings'),
('api_keys.delete', 'api_keys', 'delete', 'Revoke/delete API keys');

-- Regulatory Filings permissions
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('filings.create', 'filings', 'create', 'Generate regulatory filings (CFTC, ICE, CME)'),
('filings.submit', 'filings', 'submit', 'Submit regulatory filings to authorities');

-- Newsletter permissions (fixing naming inconsistency)
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('newsletters.create', 'newsletters', 'create', 'Create newsletters'),
('newsletters.publish', 'newsletters', 'publish', 'Publish newsletters to recipients');

-- Risk Management permissions
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('risk.configure', 'risk', 'configure', 'Configure risk thresholds and scenarios');

-- Trade Approval permissions
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('trades.approve', 'trades', 'approve', 'Approve trading transactions');

-- Exemption approval permission (ensure it exists)
INSERT OR IGNORE INTO permissions (permission_name, resource, action, description) VALUES
('exemptions.approve', 'exemptions', 'approve', 'Approve CFTC exemption requests');

-- Assign to super_admin and admin (they get all permissions)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name IN ('super_admin', 'admin')
AND p.permission_name IN (
  'api_keys.read', 'api_keys.create', 'api_keys.update', 'api_keys.delete',
  'filings.create', 'filings.submit',
  'newsletters.create', 'newsletters.publish',
  'risk.configure',
  'trades.approve',
  'exemptions.approve'
);

-- Assign to compliance_officer (critical for their role)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name = 'compliance_officer'
AND p.permission_name IN (
  'filings.create', 'filings.submit',
  'risk.configure',
  'trades.approve',
  'exemptions.approve',
  'documents.read', 'documents.create', 'documents.approve',
  'security.read'
);

-- Assign to company_admin
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name = 'company_admin'
AND p.permission_name IN (
  'api_keys.read', 'api_keys.create', 'api_keys.update', 'api_keys.delete',
  'filings.create',
  'risk.configure',
  'exemptions.create', 'exemptions.read'
);

-- Assign read permissions to auditor
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name = 'auditor'
AND p.permission_name IN (
  'api_keys.read',
  'filings.create' -- auditors can see filings
);

-- Assign to trader (limited access)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_name = 'trader'
AND p.permission_name IN (
  'exemptions.read' -- traders should see exemptions affecting their limits
);
```

### Step 2: Fix Newsletter Permission Naming

**Option A**: Update routes to use `support.*` permissions (matches migration 0017)

In `backend/src/routes/support.ts`, change:
```typescript
// FROM:
authorize('newsletters.create')
authorize('newsletters.publish')

// TO:
authorize('support.create_newsletters')
authorize('support.publish_newsletters')
```

**Option B**: Update migration 0017 to use `newsletters.*` (cleaner, preferred)

Or accept both and add aliases in the new migration.

### Step 3: Verify Deployment

After running migration:

```bash
# Run migration
wrangler d1 migrations apply trade-nexus-db --local

# Verify permissions exist
wrangler d1 execute trade-nexus-db --local --command \
  "SELECT permission_name FROM permissions WHERE resource IN ('api_keys', 'filings', 'newsletters', 'risk', 'trades')"

# Verify role assignments
wrangler d1 execute trade-nexus-db --local --command \
  "SELECT r.role_name, p.permission_name
   FROM roles r
   JOIN role_permissions rp ON r.id = rp.role_id
   JOIN permissions p ON rp.permission_id = p.id
   WHERE p.resource IN ('api_keys', 'filings', 'newsletters', 'risk', 'trades')
   ORDER BY r.role_name, p.permission_name"
```

---

## 7. Correct Permission Matrix

### Recommended Final State

| Permission | super_admin | admin | company_admin | compliance_officer | trader | auditor |
|-----------|-------------|-------|---------------|-------------------|--------|---------|
| **API Keys** | | | | | | |
| api_keys.read | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| api_keys.create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| api_keys.update | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| api_keys.delete | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Filings** | | | | | | |
| filings.create | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| filings.submit | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Risk** | | | | | | |
| risk.configure | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Trades** | | | | | | |
| trades.approve | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Exemptions** | | | | | | |
| exemptions.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| exemptions.create | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| exemptions.approve | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| exemptions.delete | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

---

## 8. Testing After Fixes

### Test Plan

1. **Test Missing Permissions**:
   ```bash
   # Test API Keys route
   curl -H "Authorization: Bearer $TOKEN" \
     https://api-dev.tradenexus.com/api/api-keys

   # Should return 200, not 403 Forbidden
   ```

2. **Test Role Access**:
   ```bash
   # Company admin should access API keys
   # Compliance officer should access filings
   # Trader should NOT access filings
   ```

3. **Verify Authorization**:
   - Login as each role
   - Test protected endpoints
   - Verify 403 for unauthorized, 200 for authorized

---

## 9. Conclusion

**Current State**: ❌ **Permission system has critical gaps**

**Required Actions**:
1. ✅ Create and run migration 0028 to add missing permissions
2. ✅ Fix newsletter permission naming inconsistency
3. ✅ Assign new permissions to appropriate roles
4. ✅ Test all protected routes with each role
5. ✅ Update documentation

**Estimated Effort**: 1-2 hours

**Priority**: 🔴 **HIGH** - Authorization failures affecting production features

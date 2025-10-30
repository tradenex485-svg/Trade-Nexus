# Database Migrations

SQL migration files for Cloudflare D1 database schema management.

## Overview

This directory contains sequential SQL migrations that define the database schema for the Trade Nexus application.

## Migration Files

Migrations are numbered sequentially:
- `0001_*.sql` - Initial schema setup
- `0002_*.sql` - User and authentication tables
- `0003_*.sql` - Additional features
- etc.

Each migration file contains SQL statements to:
- Create tables
- Add indexes
- Insert seed data
- Modify existing schema
- Add constraints

## Running Migrations

### Local Development
```bash
# Apply all pending migrations to local D1
npm run db:migrate

# Or using wrangler directly
wrangler d1 migrations apply trade-nexus-db --local
```

### Production
```bash
# Apply migrations to production D1 database
npm run db:migrate:prod

# Or using wrangler directly
wrangler d1 migrations apply trade-nexus-db
```

## Migration Format

Each migration file is a standard SQL file:

```sql
-- Migration: Description of changes
-- Created: YYYY-MM-DD

-- Create new table
CREATE TABLE IF NOT EXISTS my_table (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes
CREATE INDEX idx_my_table_email ON my_table(email);
CREATE INDEX idx_my_table_created_at ON my_table(created_at);

-- Insert seed data (if needed)
INSERT INTO my_table (name, email) VALUES
  ('Test User', 'test@example.com');
```

## Creating New Migrations

1. Create a new file with the next sequential number:
   ```bash
   touch migrations/0042_add_new_feature.sql
   ```

2. Write your SQL changes in the file

3. Test locally:
   ```bash
   npm run db:migrate
   ```

4. Commit the migration file to git

5. Deploy to production after testing

## Migration Best Practices

### 1. Always Use IF NOT EXISTS
```sql
CREATE TABLE IF NOT EXISTS users (...);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 2. Make Migrations Idempotent
Migrations should be safe to run multiple times:
```sql
-- Good: Safe to run multiple times
CREATE TABLE IF NOT EXISTS users (...);

-- Bad: Will fail if table exists
CREATE TABLE users (...);
```

### 3. Never Modify Existing Migrations
Once a migration is deployed, never modify it. Create a new migration instead:
```sql
-- 0043_fix_user_table.sql
ALTER TABLE users ADD COLUMN phone TEXT;
```

### 4. Use Transactions for Complex Changes
```sql
BEGIN TRANSACTION;

CREATE TABLE new_users (...);
INSERT INTO new_users SELECT * FROM users;
DROP TABLE users;
ALTER TABLE new_users RENAME TO users;

COMMIT;
```

### 5. Add Indexes for Query Performance
```sql
-- Index for foreign keys
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Composite index for common queries
CREATE INDEX idx_trades_user_date ON trades(user_id, trade_date);

-- Unique index for constraints
CREATE UNIQUE INDEX idx_api_keys_key ON api_keys(key_hash);
```

### 6. Use Appropriate Data Types
```sql
CREATE TABLE example (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,              -- String data
  count INTEGER DEFAULT 0,         -- Whole numbers
  price REAL,                      -- Decimal numbers
  is_active INTEGER DEFAULT 1,    -- Boolean (0 or 1)
  created_at TEXT DEFAULT (datetime('now'))  -- ISO8601 timestamp
);
```

### 7. Add Constraints
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  role_id INTEGER NOT NULL,
  company_id INTEGER,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CHECK (email LIKE '%@%')
);
```

## D1 Database Limitations

Be aware of D1 specific limitations:
- SQLite-based (not PostgreSQL or MySQL)
- No stored procedures or triggers
- Limited to SQLite data types (INTEGER, REAL, TEXT, BLOB)
- Foreign key constraints must be explicitly enabled

## Checking Migration Status

```bash
# List all migrations
wrangler d1 migrations list trade-nexus-db

# View database info
wrangler d1 info trade-nexus-db
```

## Rolling Back

D1 doesn't support automatic rollback. To undo a migration:
1. Create a new migration that reverses the changes
2. Test thoroughly before deploying

Example rollback migration:
```sql
-- 0044_rollback_phone_column.sql
ALTER TABLE users DROP COLUMN phone;
```

## Seed Data

For development/testing, seed data can be included:
```sql
-- Only insert if not exists
INSERT OR IGNORE INTO roles (id, name) VALUES
  (1, 'admin'),
  (2, 'trader'),
  (3, 'viewer');
```

## Schema Documentation

Major tables in the database:
- `users` - User accounts and authentication
- `companies` - Company/organization data
- `traders` - Trader profiles
- `exchanges` - Exchange configuration
- `transactions` - Trade transactions
- `position_limits` - Position limit rules
- `market_limits` - Market limit rules
- `exemptions` - CFTC exemptions
- `alerts` - Alert configurations
- `audit_logs` - Audit trail
- `api_keys` - API authentication keys

For detailed schema information, examine the migration files in sequential order.

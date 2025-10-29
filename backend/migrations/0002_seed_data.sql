-- Seed Data for Trade Nexus Application

-- Insert default scopes
INSERT INTO scopes (scope_name) VALUES
('SPOT-MONTH-LIMIT'),
('ONE-MONTH-LIMIT'),
('ALL-MONTH-LIMIT'),
('SPOT-PLUS-MONTH-LIMIT'),
('ALL-MARKET-LIMIT'),
('REGISTER'),
('PROFILE'),
('LOGOUT'),
('USER-SCOPES'),
('ALL-USERS'),
('STATUS-COUNTS'),
('TRANSACTIONS-ALL'),
('TRANSACTIONS-SAVE'),
('MAPPING-ALL'),
('EXEMPTIONS-ALL');

-- Insert demo user (password: demo123 - hashed with bcrypt)
INSERT INTO users (name, email, password) VALUES
('Trader Demo', 'trader@nexus.com', '$2a$10$YourHashedPasswordHere'),
('Admin User', 'admin@nexus.com', '$2a$10$YourHashedPasswordHere');

-- Assign all scopes to demo user
INSERT INTO user_scopes (user_id, scope_id)
SELECT 1, id FROM scopes;

-- Insert sample market limits (Natural Gas, Crude Oil, Gold, Silver, Copper, Corn)
INSERT INTO market_limits (
    contract_name, commodity_code, market_type, contract_size, unit_of_trading,
    spot_month_limit, single_month_accountability_level, all_month_accountability_level,
    exchange_code, is_active, effective_date
) VALUES
('Natural Gas NYMEX', 'NG', 'Futures', 10000, 'MMBtu', 50000, 40000, 100000, 'CME', 1, '2024-01-01'),
('WTI Crude Oil', 'CL', 'Futures', 1000, 'Barrels', 100000, 80000, 200000, 'CME', 1, '2024-01-01'),
('Gold COMEX', 'GC', 'Futures', 100, 'Troy Oz', 75000, 60000, 150000, 'CME', 1, '2024-01-01'),
('Silver COMEX', 'SI', 'Futures', 5000, 'Troy Oz', 40000, 30000, 80000, 'CME', 1, '2024-01-01'),
('Copper COMEX', 'HG', 'Futures', 25000, 'Pounds', 60000, 50000, 120000, 'CME', 1, '2024-01-01'),
('Corn CBOT', 'C', 'Futures', 5000, 'Bushels', 80000, 60000, 150000, 'CME', 1, '2024-01-01'),
('RBOB Gasoline', 'RB', 'Futures', 42000, 'Gallons', 70000, 55000, 140000, 'CME', 1, '2024-01-01'),
('Heating Oil', 'HO', 'Futures', 42000, 'Gallons', 55000, 45000, 110000, 'CME', 1, '2024-01-01');

-- Insert market location mappings
INSERT INTO mapping (contract_name, market_location, commodity_code, unit_of_trading) VALUES
('Natural Gas NYMEX', 'NG_NGZ4', 'NG', 'MMBtu'),
('WTI Crude Oil', 'WTI_CLZ4', 'CL', 'MMBtu'),
('Gold COMEX', 'GC_GCZ4', 'GC', 'MMBtu'),
('Silver COMEX', 'SI_SIZ4', 'SI', 'MMBtu'),
('Copper COMEX', 'HG_HGZ4', 'HG', 'MMBtu'),
('Corn CBOT', 'C_CZ4', 'C', 'MMBtu'),
('RBOB Gasoline', 'RB_RBZ4', 'RB', 'MMBtu'),
('Heating Oil', 'HO_HOZ4', 'HO', 'MMBtu');

-- Insert sample transactions for December 2024 contracts
INSERT INTO transactions (market_location, contract_month, base_delta_notnl_nd, index_uom, trade_date, exchange, frequency) VALUES
('NG_NGZ4', '2024-12-01', 51000, 'MMBtu', '2024-10-17', 'CME', 1),
('WTI_CLZ4', '2024-12-01', 95000, 'MMBtu', '2024-10-17', 'CME', 1),
('GC_GCZ4', '2024-12-01', 58500, 'MMBtu', '2024-10-17', 'CME', 1),
('SI_SIZ4', '2024-12-01', 34000, 'MMBtu', '2024-10-17', 'CME', 1),
('HG_HGZ4', '2024-12-01', 37200, 'MMBtu', '2024-10-17', 'CME', 1),
('C_CZ4', '2024-12-01', 36000, 'MMBtu', '2024-10-17', 'CME', 1),
('RB_RBZ4', '2024-12-01', 42000, 'MMBtu', '2024-10-17', 'CME', 1),
('HO_HOZ4', '2024-12-01', 28500, 'MMBtu', '2024-10-17', 'CME', 1);

-- Insert aggregated temp transactions
INSERT INTO temp_transactions (market_location, contract_month, base_delta_notnl_nd, total_buy, total_sale, index_uom, exchange) VALUES
('NG_NGZ4', '2024-12-01', 51000, 51000, 0, 'MMBtu', 'CME'),
('WTI_CLZ4', '2024-12-01', 95000, 95000, 0, 'MMBtu', 'CME'),
('GC_GCZ4', '2024-12-01', 58500, 58500, 0, 'MMBtu', 'CME'),
('SI_SIZ4', '2024-12-01', 34000, 34000, 0, 'MMBtu', 'CME'),
('HG_HGZ4', '2024-12-01', 37200, 37200, 0, 'MMBtu', 'CME'),
('C_CZ4', '2024-12-01', 36000, 36000, 0, 'MMBtu', 'CME'),
('RB_RBZ4', '2024-12-01', 42000, 42000, 0, 'MMBtu', 'CME'),
('HO_HOZ4', '2024-12-01', 28500, 28500, 0, 'MMBtu', 'CME');

-- Insert sample calculated limits (Spot Month)
INSERT INTO limit_calculations (
    as_of_date, mkt_index, contract_month, reporting_limit_code, child_code,
    limit_lots, pos_lots, pos_pct, total_pos_lots, total_pos_pct,
    prioritization, limit_type, is_parent, is_active
) VALUES
('2024-10-17', 'NG_NGZ4', '2024-12-01', 'NG', 'NG', 50000, 51000, 102.0, 51000, 102.0, 'Breached', 1, 1, 1),
('2024-10-17', 'WTI_CLZ4', '2024-12-01', 'CL', 'CL', 100000, 95000, 95.0, 95000, 95.0, 'Remediate', 1, 1, 1),
('2024-10-17', 'GC_GCZ4', '2024-12-01', 'GC', 'GC', 75000, 58500, 78.0, 58500, 78.0, 'Validate', 1, 1, 1),
('2024-10-17', 'SI_SIZ4', '2024-12-01', 'SI', 'SI', 40000, 34000, 85.0, 34000, 85.0, 'Validate', 1, 1, 1),
('2024-10-17', 'HG_HGZ4', '2024-12-01', 'HG', 'HG', 60000, 37200, 62.0, 37200, 62.0, 'Monitor', 1, 1, 1),
('2024-10-17', 'C_CZ4', '2024-12-01', 'C', 'C', 80000, 36000, 45.0, 36000, 45.0, 'Monitor', 1, 1, 1);

-- Insert status counts
INSERT INTO limit_calculation_status_counts (limit_type, monitor, validate, remediate, breached, total) VALUES
(1, 2, 2, 1, 1, 6),
(2, 5, 1, 0, 0, 6),
(3, 4, 2, 0, 0, 6);

-- Insert sample alerts
INSERT INTO alerts (title, message, severity, read) VALUES
('Position Breach', 'Natural Gas NYMEX breached position limit', 'error', 0),
('High Utilization', 'WTI Crude Oil position at 95% of limit', 'warning', 0),
('Validation Required', 'Silver COMEX approaching validation threshold', 'warning', 1);

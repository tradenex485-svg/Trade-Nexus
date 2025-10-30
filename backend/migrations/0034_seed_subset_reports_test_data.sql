-- Trade Nexus - Seed Test Data for Subset Reports
-- Migration: 0034_seed_subset_reports_test_data.sql
-- Description: Add sample transactions data for testing subset reports functionality

-- Insert test transactions for Top Counterparties Report
INSERT INTO transactions (
    market_location, contract_month, base_delta_notnl_nd, trade_date,
    company_id, counterparty_name, commodity_code, transaction_type
) VALUES
-- Natural Gas transactions for counterparty analysis
('HIS-NG', '2025-01-01', 5000.0, '2025-01-15', 1, 'Shell Energy', 'NG', 'COMM-PHYS'),
('HIS-NG', '2025-02-01', 3500.0, '2025-01-16', 1, 'Shell Energy', 'NG', 'COMM-PHYS'),
('HHD-NG', '2025-01-01', -2000.0, '2025-01-17', 1, 'Shell Energy', 'NG', 'COMM-PHYS'),
('HIS-NG', '2025-01-01', 4500.0, '2025-01-18', 1, 'BP America', 'NG', 'COMM-PHYS'),
('HHD-NG', '2025-02-01', 6000.0, '2025-01-19', 1, 'BP America', 'NG', 'COMM-PHYS'),
('HIS-NG', '2025-01-01', -1500.0, '2025-01-20', 1, 'Chevron', 'NG', 'COMM-PHYS'),
('HHD-NG', '2025-01-01', 3000.0, '2025-01-21', 1, 'Exxon Mobil', 'NG', 'COMM-PHYS'),
('HIS-NG', '2025-02-01', 2500.0, '2025-01-22', 1, 'Total Energies', 'NG', 'COMM-PHYS'),
('HHD-NG', '2025-01-01', -1000.0, '2025-01-23', 1, 'Vitol', 'NG', 'COMM-PHYS'),
('HIS-NG', '2025-01-01', 3500.0, '2025-01-24', 1, 'Gunvor', 'NG', 'COMM-PHYS');

-- Insert test transactions for Next-Day Fixed Price Report
INSERT INTO transactions (
    market_location, contract_month, base_delta_notnl_nd, trade_date,
    company_id, counterparty_name, commodity_code, transaction_type,
    is_next_day, price_type
) VALUES
('HIS-NG', '2025-01-01', 2500.0, '2025-01-25', 1, 'Shell Energy', 'NG', 'COMM-PHYS', 1, 'FIXED'),
('HHD-NG', '2025-01-01', 1500.0, '2025-01-25', 1, 'BP America', 'NG', 'COMM-PHYS', 1, 'FIXED'),
('HIS-NG', '2025-02-01', -1000.0, '2025-01-25', 1, 'Chevron', 'NG', 'COMM-PHYS', 1, 'FIXED'),
('HHD-NG', '2025-01-01', 3000.0, '2025-01-25', 1, 'Exxon Mobil', 'NG', 'COMM-PHYS', 1, 'FIXED');

-- Insert test transactions for Next-Day Index Price Report
INSERT INTO transactions (
    market_location, contract_month, base_delta_notnl_nd, trade_date,
    company_id, counterparty_name, commodity_code, transaction_type,
    is_next_day, price_type
) VALUES
('HIS-NG', '2025-01-01', 1800.0, '2025-01-25', 1, 'Total Energies', 'NG', 'COMM-PHYS', 1, 'INDEX'),
('HHD-NG', '2025-01-01', 2200.0, '2025-01-25', 1, 'Vitol', 'NG', 'COMM-PHYS', 1, 'INDEX'),
('HIS-NG', '2025-02-01', -900.0, '2025-01-25', 1, 'Gunvor', 'NG', 'COMM-PHYS', 1, 'INDEX'),
('HHD-NG', '2025-01-01', 1600.0, '2025-01-25', 1, 'Trafigura', 'NG', 'COMM-PHYS', 1, 'INDEX');

-- Insert test transactions for Next-Day Exposure Report
-- (Already included in the previous inserts with is_next_day = 1)

-- Migration complete

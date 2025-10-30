-- Migration 0030 Part 1: Populate monthly schedules table - Holidays and 2025 Q1-Q2
-- Date: 2025-10-30

-- Delete any existing data to ensure clean slate
DELETE FROM monthly_schedules;

-- Insert US market holidays for 2025
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration) VALUES
(2, '2025-01-01', 'Wednesday', NULL, NULL, 'New Year''s Day', 0, 0, 0),
(2, '2025-01-20', 'Monday', NULL, NULL, 'Martin Luther King Jr. Day', 0, 0, 0),
(2, '2025-02-17', 'Monday', NULL, NULL, 'Presidents'' Day', 0, 0, 0),
(2, '2025-05-26', 'Monday', NULL, NULL, 'Memorial Day', 0, 0, 0),
(2, '2025-07-04', 'Friday', NULL, NULL, 'Independence Day', 0, 0, 0),
(2, '2025-09-01', 'Monday', NULL, NULL, 'Labor Day', 0, 0, 0),
(2, '2025-11-27', 'Thursday', NULL, NULL, 'Thanksgiving Day', 0, 0, 0),
(2, '2025-11-28', 'Friday', NULL, NULL, 'Day After Thanksgiving', 0, 0, 0),
(2, '2025-12-25', 'Thursday', NULL, NULL, 'Christmas Day', 0, 0, 0);

-- Insert US market holidays for 2026
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration) VALUES
(2, '2026-01-01', 'Thursday', NULL, NULL, 'New Year''s Day', 0, 0, 0),
(2, '2026-01-19', 'Monday', NULL, NULL, 'Martin Luther King Jr. Day', 0, 0, 0),
(2, '2026-02-16', 'Monday', NULL, NULL, 'Presidents'' Day', 0, 0, 0),
(2, '2026-05-25', 'Monday', NULL, NULL, 'Memorial Day', 0, 0, 0),
(2, '2026-07-03', 'Friday', NULL, NULL, 'Independence Day (Observed)', 0, 0, 0),
(2, '2026-09-07', 'Monday', NULL, NULL, 'Labor Day', 0, 0, 0),
(2, '2026-11-26', 'Thursday', NULL, NULL, 'Thanksgiving Day', 0, 0, 0),
(2, '2026-11-27', 'Friday', NULL, NULL, 'Day After Thanksgiving', 0, 0, 0),
(2, '2026-12-25', 'Friday', NULL, NULL, 'Christmas Day', 0, 0, 0);

-- Generate January 2025
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2025-01-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2025-01-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2025-01-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2025-01-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2025-01-' || printf('%02d', value) as trade_date,
    NULL as bid_week_day,
    NULL as holiday_name,
    0 as bidweek_prices_published,
    0 as bidweek_deals_submitted,
    0 as nymex_futures_contract_expiration
FROM (
    WITH RECURSIVE numbers(value) AS (
        SELECT 1
        UNION ALL
        SELECT value + 1 FROM numbers WHERE value < 31
    )
    SELECT value FROM numbers
)
WHERE '2025-01-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2025-01-%');

-- Generate February 2025
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2025-02-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2025-02-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2025-02-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2025-02-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2025-02-' || printf('%02d', value) as trade_date,
    NULL as bid_week_day,
    NULL as holiday_name,
    0 as bidweek_prices_published,
    0 as bidweek_deals_submitted,
    0 as nymex_futures_contract_expiration
FROM (
    WITH RECURSIVE numbers(value) AS (
        SELECT 1
        UNION ALL
        SELECT value + 1 FROM numbers WHERE value < 29
    )
    SELECT value FROM numbers
)
WHERE '2025-02-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2025-02-%');

-- Generate March 2025
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2025-03-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2025-03-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2025-03-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2025-03-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2025-03-' || printf('%02d', value) as trade_date,
    NULL as bid_week_day,
    NULL as holiday_name,
    0 as bidweek_prices_published,
    0 as bidweek_deals_submitted,
    0 as nymex_futures_contract_expiration
FROM (
    WITH RECURSIVE numbers(value) AS (
        SELECT 1
        UNION ALL
        SELECT value + 1 FROM numbers WHERE value < 32
    )
    SELECT value FROM numbers
)
WHERE '2025-03-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2025-03-%');

-- Generate April 2025
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2025-04-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2025-04-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2025-04-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2025-04-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2025-04-' || printf('%02d', value) as trade_date,
    NULL as bid_week_day,
    NULL as holiday_name,
    0 as bidweek_prices_published,
    0 as bidweek_deals_submitted,
    0 as nymex_futures_contract_expiration
FROM (
    WITH RECURSIVE numbers(value) AS (
        SELECT 1
        UNION ALL
        SELECT value + 1 FROM numbers WHERE value < 31
    )
    SELECT value FROM numbers
)
WHERE '2025-04-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2025-04-%');

-- Generate May 2025
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2025-05-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2025-05-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2025-05-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2025-05-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2025-05-' || printf('%02d', value) as trade_date,
    NULL as bid_week_day,
    NULL as holiday_name,
    0 as bidweek_prices_published,
    0 as bidweek_deals_submitted,
    0 as nymex_futures_contract_expiration
FROM (
    WITH RECURSIVE numbers(value) AS (
        SELECT 1
        UNION ALL
        SELECT value + 1 FROM numbers WHERE value < 32
    )
    SELECT value FROM numbers
)
WHERE '2025-05-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2025-05-%');

-- Generate June 2025
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2025-06-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2025-06-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2025-06-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2025-06-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2025-06-' || printf('%02d', value) as trade_date,
    NULL as bid_week_day,
    NULL as holiday_name,
    0 as bidweek_prices_published,
    0 as bidweek_deals_submitted,
    0 as nymex_futures_contract_expiration
FROM (
    WITH RECURSIVE numbers(value) AS (
        SELECT 1
        UNION ALL
        SELECT value + 1 FROM numbers WHERE value < 31
    )
    SELECT value FROM numbers
)
WHERE '2025-06-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2025-06-%');

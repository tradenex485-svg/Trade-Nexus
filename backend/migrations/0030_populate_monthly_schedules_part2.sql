-- Migration 0030 Part 2: Populate monthly schedules table - 2025 Q3-Q4
-- Date: 2025-10-30

-- Generate July 2025
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2025-07-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2025-07-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2025-07-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2025-07-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2025-07-' || printf('%02d', value) as trade_date,
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
WHERE '2025-07-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2025-07-%');

-- Generate August 2025
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2025-08-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2025-08-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2025-08-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2025-08-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2025-08-' || printf('%02d', value) as trade_date,
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
WHERE '2025-08-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2025-08-%');

-- Generate September 2025
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2025-09-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2025-09-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2025-09-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2025-09-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2025-09-' || printf('%02d', value) as trade_date,
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
WHERE '2025-09-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2025-09-%');

-- Generate October 2025
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2025-10-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2025-10-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2025-10-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2025-10-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2025-10-' || printf('%02d', value) as trade_date,
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
WHERE '2025-10-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2025-10-%');

-- Generate November 2025
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2025-11-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2025-11-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2025-11-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2025-11-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2025-11-' || printf('%02d', value) as trade_date,
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
WHERE '2025-11-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2025-11-%');

-- Generate December 2025
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2025-12-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2025-12-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2025-12-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2025-12-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2025-12-' || printf('%02d', value) as trade_date,
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
WHERE '2025-12-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2025-12-%');

-- Mark NYMEX expiration days for 2025 (typically third business day before month end)
UPDATE monthly_schedules
SET nymex_futures_contract_expiration = 1
WHERE dated IN (
    '2025-01-28', '2025-02-25', '2025-03-27', '2025-04-28', '2025-05-28', '2025-06-26',
    '2025-07-29', '2025-08-27', '2025-09-26', '2025-10-29', '2025-11-25', '2025-12-29'
);

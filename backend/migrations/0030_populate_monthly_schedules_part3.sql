-- Migration 0030 Part 3: Populate monthly schedules table - 2026
-- Date: 2025-10-30

-- Generate January 2026
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2026-01-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2026-01-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2026-01-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2026-01-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2026-01-' || printf('%02d', value) as trade_date,
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
WHERE '2026-01-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2026-01-%');

-- Generate February 2026
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2026-02-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2026-02-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2026-02-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2026-02-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2026-02-' || printf('%02d', value) as trade_date,
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
WHERE '2026-02-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2026-02-%');

-- Generate March 2026
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2026-03-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2026-03-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2026-03-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2026-03-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2026-03-' || printf('%02d', value) as trade_date,
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
WHERE '2026-03-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2026-03-%');

-- Generate April 2026
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2026-04-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2026-04-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2026-04-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2026-04-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2026-04-' || printf('%02d', value) as trade_date,
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
WHERE '2026-04-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2026-04-%');

-- Generate May 2026
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2026-05-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2026-05-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2026-05-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2026-05-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2026-05-' || printf('%02d', value) as trade_date,
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
WHERE '2026-05-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2026-05-%');

-- Generate June 2026
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2026-06-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2026-06-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2026-06-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2026-06-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2026-06-' || printf('%02d', value) as trade_date,
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
WHERE '2026-06-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2026-06-%');

-- Generate July 2026
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2026-07-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2026-07-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2026-07-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2026-07-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2026-07-' || printf('%02d', value) as trade_date,
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
WHERE '2026-07-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2026-07-%');

-- Generate August 2026
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2026-08-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2026-08-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2026-08-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2026-08-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2026-08-' || printf('%02d', value) as trade_date,
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
WHERE '2026-08-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2026-08-%');

-- Generate September 2026
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2026-09-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2026-09-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2026-09-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2026-09-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2026-09-' || printf('%02d', value) as trade_date,
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
WHERE '2026-09-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2026-09-%');

-- Generate October 2026
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2026-10-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2026-10-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2026-10-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2026-10-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2026-10-' || printf('%02d', value) as trade_date,
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
WHERE '2026-10-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2026-10-%');

-- Generate November 2026
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2026-11-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2026-11-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2026-11-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2026-11-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2026-11-' || printf('%02d', value) as trade_date,
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
WHERE '2026-11-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2026-11-%');

-- Generate December 2026
INSERT INTO monthly_schedules (lookup_id, dated, week_day, trade_date, bid_week_day, holiday_name, bidweek_prices_published, bidweek_deals_submitted, nymex_futures_contract_expiration)
SELECT
    CASE
        WHEN strftime('%w', '2026-12-' || printf('%02d', value)) IN ('0', '6') THEN 3
        WHEN '2026-12-' || printf('%02d', value) IN (SELECT dated FROM monthly_schedules WHERE holiday_name IS NOT NULL) THEN 2
        ELSE 1
    END as lookup_id,
    '2026-12-' || printf('%02d', value) as dated,
    CASE CAST(strftime('%w', '2026-12-' || printf('%02d', value)) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as week_day,
    '2026-12-' || printf('%02d', value) as trade_date,
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
WHERE '2026-12-' || printf('%02d', value) NOT IN (SELECT dated FROM monthly_schedules WHERE dated LIKE '2026-12-%');

-- Mark NYMEX expiration days for 2026 (typically third business day before month end)
UPDATE monthly_schedules
SET nymex_futures_contract_expiration = 1
WHERE dated IN (
    '2026-01-28', '2026-02-25', '2026-03-27', '2026-04-28', '2026-05-27', '2026-06-26',
    '2026-07-29', '2026-08-27', '2026-09-28', '2026-10-28', '2026-11-25', '2026-12-29'
);

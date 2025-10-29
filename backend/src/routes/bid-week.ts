/**
 * Bid Week and Holiday Calendar API Routes
 *
 * Endpoints for managing exchange holidays and bid week schedules
 * for CFTC Position Limits compliance
 */

import { Hono } from 'hono';
import { createBidWeekService } from '../services/bid-week-service';
import { authenticate } from '../middleware/auth';

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

// ============================================================================
// HOLIDAY CALENDAR ROUTES
// ============================================================================

/**
 * GET /api/bid-week/holidays
 * Get all holidays for an exchange
 */
app.get('/holidays', async (c) => {
  const db = c.env.DB;
  const { exchange_code, year, active_only } = c.req.query();

  try {
    const service = createBidWeekService(db);
    const activeOnlyBool = active_only !== 'false'; // Default to true
    const yearNum = year ? parseInt(year) : undefined;

    if (!exchange_code) {
      // Get all holidays for all exchanges
      const query = `SELECT * FROM exchange_holidays WHERE 1=1
        ${activeOnlyBool ? 'AND is_active = 1' : ''}
        ${yearNum ? `AND holiday_date LIKE '${yearNum}%'` : ''}
        ORDER BY exchange_code, holiday_date`;

      const result = await db.prepare(query).all();

      return c.json({
        holidays: result.results,
        total: result.results.length,
      });
    }

    const holidays = await service.getHolidays(
      exchange_code,
      yearNum,
      activeOnlyBool
    );

    return c.json({
      exchange_code,
      year: yearNum,
      holidays,
      total: holidays.length,
    });
  } catch (error: any) {
    console.error('Error fetching holidays:', error);
    return c.json({ error: 'Failed to fetch holidays', details: error.message }, 500);
  }
});

/**
 * POST /api/bid-week/holidays
 * Add a new holiday
 * Requires admin permission
 */
app.post('/holidays', authenticate, async (c) => {
  const db = c.env.DB;

  try {
    const body = await c.req.json();
    const { exchange_code, holiday_date, holiday_name, is_active } = body;

    if (!exchange_code || !holiday_date || !holiday_name) {
      return c.json({ error: 'exchange_code, holiday_date, and holiday_name are required' }, 400);
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday_date)) {
      return c.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, 400);
    }

    const service = createBidWeekService(db);
    await service.addHoliday({
      exchange_code,
      holiday_date,
      holiday_name,
      is_active: is_active ?? 1,
    });

    // Trigger bid week schedule regeneration
    const year = parseInt(holiday_date.substring(0, 4));
    await service.regenerateBidWeekSchedules(exchange_code, year, 12);

    return c.json({
      message: 'Holiday added successfully',
      holiday: { exchange_code, holiday_date, holiday_name },
    }, 201);
  } catch (error: any) {
    console.error('Error adding holiday:', error);
    return c.json({ error: 'Failed to add holiday', details: error.message }, 500);
  }
});

/**
 * PUT /api/bid-week/holidays/:exchange/:date
 * Update a holiday
 * Requires admin permission
 */
app.put('/holidays/:exchange/:date', authenticate, async (c) => {
  const db = c.env.DB;
  const exchange_code = c.req.param('exchange');
  const holiday_date = c.req.param('date');

  try {
    const body = await c.req.json();
    const { holiday_name, is_active } = body;

    const service = createBidWeekService(db);

    // Check if holiday exists
    const existing = await db
      .prepare('SELECT id FROM exchange_holidays WHERE exchange_code = ? AND holiday_date = ?')
      .bind(exchange_code, holiday_date)
      .first();

    if (!existing) {
      return c.json({ error: 'Holiday not found' }, 404);
    }

    // Update
    await db
      .prepare(
        `UPDATE exchange_holidays
         SET holiday_name = COALESCE(?, holiday_name),
             is_active = COALESCE(?, is_active),
             updated_at = datetime('now')
         WHERE exchange_code = ? AND holiday_date = ?`
      )
      .bind(holiday_name, is_active, exchange_code, holiday_date)
      .run();

    // Trigger regeneration
    const year = parseInt(holiday_date.substring(0, 4));
    await service.regenerateBidWeekSchedules(exchange_code, year, 12);

    return c.json({ message: 'Holiday updated successfully' });
  } catch (error: any) {
    console.error('Error updating holiday:', error);
    return c.json({ error: 'Failed to update holiday', details: error.message }, 500);
  }
});

/**
 * DELETE /api/bid-week/holidays/:exchange/:date
 * Delete (deactivate) a holiday
 * Requires admin permission
 */
app.delete('/holidays/:exchange/:date', authenticate, async (c) => {
  const db = c.env.DB;
  const exchange_code = c.req.param('exchange');
  const holiday_date = c.req.param('date');

  try {
    const service = createBidWeekService(db);
    await service.deleteHoliday(exchange_code, holiday_date);

    // Trigger regeneration
    const year = parseInt(holiday_date.substring(0, 4));
    await service.regenerateBidWeekSchedules(exchange_code, year, 12);

    return c.json({ message: 'Holiday deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting holiday:', error);
    return c.json({ error: 'Failed to delete holiday', details: error.message }, 500);
  }
});

/**
 * POST /api/bid-week/holidays/bulk-import
 * Bulk import holidays
 * Requires admin permission
 */
app.post('/holidays/bulk-import', authenticate, async (c) => {
  const db = c.env.DB;

  try {
    const body = await c.req.json();
    const { holidays } = body;

    if (!Array.isArray(holidays) || holidays.length === 0) {
      return c.json({ error: 'holidays array is required and must not be empty' }, 400);
    }

    const service = createBidWeekService(db);
    const importCount = await service.bulkImportHolidays(holidays);

    // Regenerate schedules for all affected exchanges and years
    const exchangeYears = new Map<string, Set<number>>();
    holidays.forEach((h: any) => {
      const year = parseInt(h.holiday_date.substring(0, 4));
      if (!exchangeYears.has(h.exchange_code)) {
        exchangeYears.set(h.exchange_code, new Set());
      }
      exchangeYears.get(h.exchange_code)!.add(year);
    });

    for (const [exchange, years] of exchangeYears) {
      for (const year of years) {
        await service.regenerateBidWeekSchedules(exchange, year, 12);
      }
    }

    return c.json({
      message: 'Holidays imported successfully',
      imported_count: importCount,
      total_submitted: holidays.length,
    }, 201);
  } catch (error: any) {
    console.error('Error importing holidays:', error);
    return c.json({ error: 'Failed to import holidays', details: error.message }, 500);
  }
});

// ============================================================================
// BID WEEK SCHEDULE ROUTES
// ============================================================================

/**
 * GET /api/bid-week/schedules
 * Get bid week schedules for an exchange
 */
app.get('/schedules', async (c) => {
  const db = c.env.DB;
  const { exchange_code, start_date, end_date } = c.req.query();

  try {
    if (!exchange_code) {
      return c.json({ error: 'exchange_code query parameter is required' }, 400);
    }

    const service = createBidWeekService(db);
    const schedules = await service.getBidWeekSchedules(
      exchange_code,
      start_date,
      end_date
    );

    return c.json({
      exchange_code,
      schedules,
      total: schedules.length,
    });
  } catch (error: any) {
    console.error('Error fetching bid week schedules:', error);
    return c.json({ error: 'Failed to fetch schedules', details: error.message }, 500);
  }
});

/**
 * POST /api/bid-week/schedules/generate
 * Generate bid week schedules for an exchange
 * Requires admin permission
 */
app.post('/schedules/generate', authenticate, async (c) => {
  const db = c.env.DB;

  try {
    const body = await c.req.json();
    const { exchange_code, year, month, months_ahead } = body;

    if (!exchange_code || !year || !month) {
      return c.json({ error: 'exchange_code, year, and month are required' }, 400);
    }

    const service = createBidWeekService(db);
    const schedules = await service.generateBidWeekSchedules(
      exchange_code,
      parseInt(year),
      parseInt(month),
      months_ahead || 12
    );

    return c.json({
      message: 'Bid week schedules generated successfully',
      exchange_code,
      schedules_generated: schedules.length,
      schedules,
    }, 201);
  } catch (error: any) {
    console.error('Error generating bid week schedules:', error);
    return c.json({ error: 'Failed to generate schedules', details: error.message }, 500);
  }
});

/**
 * POST /api/bid-week/schedules/regenerate
 * Regenerate bid week schedules after holiday changes
 * Requires admin permission
 */
app.post('/schedules/regenerate', authenticate, async (c) => {
  const db = c.env.DB;

  try {
    const body = await c.req.json();
    const { exchange_code, year, months_to_generate } = body;

    if (!exchange_code || !year) {
      return c.json({ error: 'exchange_code and year are required' }, 400);
    }

    const service = createBidWeekService(db);
    const schedules = await service.regenerateBidWeekSchedules(
      exchange_code,
      parseInt(year),
      months_to_generate || 12
    );

    return c.json({
      message: 'Bid week schedules regenerated successfully',
      exchange_code,
      year,
      schedules_generated: schedules.length,
    });
  } catch (error: any) {
    console.error('Error regenerating bid week schedules:', error);
    return c.json({ error: 'Failed to regenerate schedules', details: error.message }, 500);
  }
});

// ============================================================================
// BID WEEK STATUS ROUTES
// ============================================================================

/**
 * GET /api/bid-week/status
 * Get current bid week status for an exchange
 */
app.get('/status', async (c) => {
  const db = c.env.DB;
  const { exchange_code, check_date } = c.req.query();

  try {
    if (!exchange_code) {
      return c.json({ error: 'exchange_code query parameter is required' }, 400);
    }

    const service = createBidWeekService(db);
    const checkDate = check_date ? new Date(check_date) : new Date();

    const status = await service.getBidWeekStatus(exchange_code, checkDate);

    return c.json(status);
  } catch (error: any) {
    console.error('Error getting bid week status:', error);
    return c.json({ error: 'Failed to get bid week status', details: error.message }, 500);
  }
});

/**
 * GET /api/bid-week/status/all
 * Get bid week status for all exchanges
 */
app.get('/status/all', async (c) => {
  const db = c.env.DB;
  const { check_date } = c.req.query();

  try {
    const service = createBidWeekService(db);
    const checkDate = check_date ? new Date(check_date) : new Date();

    const statuses = await service.getAllExchangesBidWeekStatus(checkDate);

    return c.json({
      check_date: checkDate.toISOString().split('T')[0],
      exchanges: statuses,
      total: statuses.length,
    });
  } catch (error: any) {
    console.error('Error getting all bid week statuses:', error);
    return c.json({ error: 'Failed to get bid week statuses', details: error.message }, 500);
  }
});

/**
 * GET /api/bid-week/spot-month
 * Get spot month for position limit calculations
 */
app.get('/spot-month', async (c) => {
  const db = c.env.DB;
  const { exchange_code, check_date } = c.req.query();

  try {
    if (!exchange_code) {
      return c.json({ error: 'exchange_code query parameter is required' }, 400);
    }

    const service = createBidWeekService(db);
    const checkDate = check_date ? new Date(check_date) : new Date();

    const spotMonth = await service.getSpotMonth(exchange_code, checkDate);
    const status = await service.getBidWeekStatus(exchange_code, checkDate);

    return c.json({
      exchange_code,
      check_date: checkDate.toISOString().split('T')[0],
      spot_month: spotMonth,
      current_month: status.current_month,
      is_in_bid_week: status.is_in_bid_week,
      bid_week_start: status.bid_week_start,
      bid_week_end: status.bid_week_end,
    });
  } catch (error: any) {
    console.error('Error getting spot month:', error);
    return c.json({ error: 'Failed to get spot month', details: error.message }, 500);
  }
});

/**
 * POST /api/bid-week/auto-generate
 * Auto-generate schedules if needed
 * Public endpoint (can be called by cron job)
 */
app.post('/auto-generate', async (c) => {
  const db = c.env.DB;

  try {
    const exchanges = ['ICE', 'CME', 'NYMEX'];
    const results = [];

    for (const exchange of exchanges) {
      try {
        const service = createBidWeekService(db);
        await service.autoGenerateSchedules(exchange);
        results.push({ exchange, status: 'success' });
      } catch (error: any) {
        results.push({ exchange, status: 'error', error: error.message });
      }
    }

    return c.json({
      message: 'Auto-generation completed',
      results,
    });
  } catch (error: any) {
    console.error('Error in auto-generation:', error);
    return c.json({ error: 'Auto-generation failed', details: error.message }, 500);
  }
});

/**
 * GET /api/bid-week/gbd-check
 * Check if a specific date is a Good Business Day
 */
app.get('/gbd-check', async (c) => {
  const db = c.env.DB;
  const { exchange_code, check_date } = c.req.query();

  try {
    if (!exchange_code || !check_date) {
      return c.json({ error: 'exchange_code and check_date are required' }, 400);
    }

    const service = createBidWeekService(db);
    const date = new Date(check_date);
    const isGBD = await service.isGoodBusinessDay(exchange_code, date);

    return c.json({
      exchange_code,
      check_date,
      is_good_business_day: isGBD,
      day_of_week: date.toLocaleDateString('en-US', { weekday: 'long' }),
    });
  } catch (error: any) {
    console.error('Error checking GBD:', error);
    return c.json({ error: 'Failed to check GBD', details: error.message }, 500);
  }
});

export default app;

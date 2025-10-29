import { Hono } from 'hono';

export const monthlySchedulesRoutes = new Hono();

// Get all monthly schedules with optional date range filter
monthlySchedulesRoutes.get('/', async (c) => {
  try {
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    let query = 'SELECT * FROM monthly_schedules WHERE 1=1';
    const params: any[] = [];

    if (startDate) {
      query += ' AND dated >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND dated <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY dated DESC';

    const stmt = c.env.DB.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

    return c.json({
      success: true,
      data: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// Get single monthly schedule by ID
monthlySchedulesRoutes.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const schedule = await c.env.DB.prepare(`
      SELECT * FROM monthly_schedules WHERE id = ?
    `).bind(id).first();

    if (!schedule) {
      return c.json({
        success: false,
        message: 'Monthly schedule not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: schedule,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// Get schedule by date
monthlySchedulesRoutes.get('/date/:date', async (c) => {
  try {
    const date = c.req.param('date');

    const schedule = await c.env.DB.prepare(`
      SELECT * FROM monthly_schedules WHERE dated = ?
    `).bind(date).first();

    if (!schedule) {
      return c.json({
        success: false,
        message: 'No schedule found for this date',
      }, 404);
    }

    return c.json({
      success: true,
      data: schedule,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// Create new monthly schedule
monthlySchedulesRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.dated) {
      return c.json({
        success: false,
        message: 'Missing required field: dated',
      }, 400);
    }

    // Check if schedule already exists for this date
    const existing = await c.env.DB.prepare(`
      SELECT id FROM monthly_schedules WHERE dated = ?
    `).bind(body.dated).first();

    if (existing) {
      return c.json({
        success: false,
        message: 'Schedule already exists for this date',
      }, 409);
    }

    // Insert new schedule
    const result = await c.env.DB.prepare(`
      INSERT INTO monthly_schedules (
        lookup_id, dated, week_day, trade_date, bid_week_day,
        holiday_name, bidweek_prices_published, bidweek_deals_submitted,
        nymex_futures_contract_expiration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.lookup_id || null,
      body.dated,
      body.week_day || null,
      body.trade_date || null,
      body.bid_week_day || null,
      body.holiday_name || null,
      body.bidweek_prices_published || 0,
      body.bidweek_deals_submitted || 0,
      body.nymex_futures_contract_expiration || 0
    ).run();

    // Get the created schedule
    const created = await c.env.DB.prepare(`
      SELECT * FROM monthly_schedules WHERE id = ?
    `).bind(result.meta.last_row_id).first();

    return c.json({
      success: true,
      message: 'Monthly schedule created successfully',
      data: created,
    }, 201);

  } catch (error: any) {
    console.error('Create monthly schedule error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// Update monthly schedule
monthlySchedulesRoutes.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    // Check if schedule exists
    const existing = await c.env.DB.prepare(`
      SELECT id FROM monthly_schedules WHERE id = ?
    `).bind(id).first();

    if (!existing) {
      return c.json({
        success: false,
        message: 'Monthly schedule not found',
      }, 404);
    }

    // Update schedule
    await c.env.DB.prepare(`
      UPDATE monthly_schedules
      SET
        lookup_id = ?,
        dated = ?,
        week_day = ?,
        trade_date = ?,
        bid_week_day = ?,
        holiday_name = ?,
        bidweek_prices_published = ?,
        bidweek_deals_submitted = ?,
        nymex_futures_contract_expiration = ?
      WHERE id = ?
    `).bind(
      body.lookup_id || null,
      body.dated,
      body.week_day || null,
      body.trade_date || null,
      body.bid_week_day || null,
      body.holiday_name || null,
      body.bidweek_prices_published || 0,
      body.bidweek_deals_submitted || 0,
      body.nymex_futures_contract_expiration || 0,
      id
    ).run();

    // Get updated schedule
    const updated = await c.env.DB.prepare(`
      SELECT * FROM monthly_schedules WHERE id = ?
    `).bind(id).first();

    return c.json({
      success: true,
      message: 'Monthly schedule updated successfully',
      data: updated,
    });

  } catch (error: any) {
    console.error('Update monthly schedule error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// Delete monthly schedule
monthlySchedulesRoutes.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    // Check if schedule exists
    const existing = await c.env.DB.prepare(`
      SELECT id FROM monthly_schedules WHERE id = ?
    `).bind(id).first();

    if (!existing) {
      return c.json({
        success: false,
        message: 'Monthly schedule not found',
      }, 404);
    }

    // Delete schedule
    await c.env.DB.prepare(`
      DELETE FROM monthly_schedules WHERE id = ?
    `).bind(id).run();

    return c.json({
      success: true,
      message: 'Monthly schedule deleted successfully',
    });

  } catch (error: any) {
    console.error('Delete monthly schedule error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// Bulk import monthly schedules from CSV
monthlySchedulesRoutes.post('/import', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return c.json({
        success: false,
        message: 'No file uploaded or invalid file',
      }, 400);
    }

    const csvText = await file.text();
    const lines = csvText.trim().split('\n');

    if (lines.length < 2) {
      return c.json({
        success: false,
        message: 'CSV file is empty or invalid',
      }, 400);
    }

    const headers = lines[0].split(',').map(h => h.trim());
    let insertedCount = 0;
    let skippedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        skippedCount++;
        continue;
      }

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Validate required field
      if (!row.dated) {
        skippedCount++;
        continue;
      }

      try {
        // Check if already exists
        const existing = await c.env.DB.prepare(`
          SELECT id FROM monthly_schedules WHERE dated = ?
        `).bind(row.dated).first();

        if (existing) {
          skippedCount++;
          continue;
        }

        // Insert
        await c.env.DB.prepare(`
          INSERT INTO monthly_schedules (
            lookup_id, dated, week_day, trade_date, bid_week_day,
            holiday_name, bidweek_prices_published, bidweek_deals_submitted,
            nymex_futures_contract_expiration
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          row.lookup_id || null,
          row.dated,
          row.week_day || null,
          row.trade_date || null,
          parseInt(row.bid_week_day) || null,
          row.holiday_name || null,
          parseInt(row.bidweek_prices_published) || 0,
          parseInt(row.bidweek_deals_submitted) || 0,
          parseInt(row.nymex_futures_contract_expiration) || 0
        ).run();

        insertedCount++;
      } catch (error: any) {
        console.error(`Error inserting schedule for ${row.dated}:`, error);
        skippedCount++;
      }
    }

    return c.json({
      success: true,
      message: `Successfully imported ${insertedCount} monthly schedules`,
      inserted: insertedCount,
      skipped: skippedCount,
    });

  } catch (error: any) {
    console.error('Monthly schedule import error:', error);
    return c.json({
      success: false,
      message: 'Import failed',
      error: error.message,
    }, 500);
  }
});

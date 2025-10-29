/**
 * Exception Handling API Routes
 *
 * Endpoints for tracking and managing calculation exceptions
 */

import { Hono } from 'hono';
import { createExceptionHandlingService } from '../services/exception-handling-service';
import { authenticate } from '../middleware/auth';

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/exceptions
 * List exceptions with filters
 */
app.get('/', authenticate, async (c) => {
  const db = c.env.DB;
  const { status, severity, exception_type, limit } = c.req.query();

  try {
    const user = c.get('user') as any;
    const companyId = user?.companyId || undefined;

    const service = createExceptionHandlingService(db);
    const exceptions = await service.getExceptions({
      status,
      severity,
      exception_type,
      company_id: companyId,
      limit: limit ? parseInt(limit) : undefined,
    });

    return c.json({
      exceptions,
      total: exceptions.length,
    });
  } catch (error: any) {
    console.error('Error fetching exceptions:', error);
    return c.json(
      { error: 'Failed to fetch exceptions', details: error.message },
      500
    );
  }
});

/**
 * GET /api/exceptions/stats
 * Get exception statistics
 */
app.get('/stats', authenticate, async (c) => {
  const db = c.env.DB;

  try {
    const user = c.get('user') as any;
    const companyId = user?.companyId || undefined;

    const service = createExceptionHandlingService(db);
    const stats = await service.getExceptionStats(companyId);

    return c.json(stats);
  } catch (error: any) {
    console.error('Error fetching exception stats:', error);
    return c.json(
      { error: 'Failed to fetch stats', details: error.message },
      500
    );
  }
});

/**
 * GET /api/exceptions/:id
 * Get exception by ID
 */
app.get('/:id', authenticate, async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  try {
    if (isNaN(id)) {
      return c.json({ error: 'Invalid exception ID' }, 400);
    }

    const service = createExceptionHandlingService(db);
    const exception = await service.getException(id);

    if (!exception) {
      return c.json({ error: 'Exception not found' }, 404);
    }

    return c.json(exception);
  } catch (error: any) {
    console.error('Error fetching exception:', error);
    return c.json(
      { error: 'Failed to fetch exception', details: error.message },
      500
    );
  }
});

/**
 * POST /api/exceptions
 * Log a new exception
 */
app.post('/', authenticate, async (c) => {
  const db = c.env.DB;

  try {
    const body = await c.req.json();
    const {
      exception_type,
      exception_severity,
      entity_type,
      entity_id,
      exception_message,
      exception_details,
    } = body;

    if (!exception_type || !exception_severity || !entity_type || !exception_message) {
      return c.json(
        {
          error:
            'exception_type, exception_severity, entity_type, and exception_message are required',
        },
        400
      );
    }

    const user = c.get('user') as any;
    const companyId = user?.companyId || null;

    const service = createExceptionHandlingService(db);
    const exceptionId = await service.logException({
      exception_type,
      exception_severity,
      entity_type,
      entity_id,
      exception_message,
      exception_details,
      status: 'OPEN',
      company_id: companyId,
    });

    return c.json(
      {
        message: 'Exception logged successfully',
        exception_id: exceptionId,
      },
      201
    );
  } catch (error: any) {
    console.error('Error logging exception:', error);
    return c.json(
      { error: 'Failed to log exception', details: error.message },
      500
    );
  }
});

/**
 * PUT /api/exceptions/:id/status
 * Update exception status
 */
app.put('/:id/status', authenticate, async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  try {
    if (isNaN(id)) {
      return c.json({ error: 'Invalid exception ID' }, 400);
    }

    const body = await c.req.json();
    const { status, resolution_notes } = body;

    if (!status) {
      return c.json({ error: 'status is required' }, 400);
    }

    const user = c.get('user') as any;
    const userId = user?.userId;

    const service = createExceptionHandlingService(db);
    await service.updateExceptionStatus(id, status, resolution_notes, userId);

    return c.json({ message: 'Exception status updated successfully' });
  } catch (error: any) {
    console.error('Error updating exception status:', error);
    return c.json(
      { error: 'Failed to update status', details: error.message },
      500
    );
  }
});

/**
 * PUT /api/exceptions/:id/assign
 * Assign exception to user
 */
app.put('/:id/assign', authenticate, async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  try {
    if (isNaN(id)) {
      return c.json({ error: 'Invalid exception ID' }, 400);
    }

    const body = await c.req.json();
    const { user_id } = body;

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    const service = createExceptionHandlingService(db);
    await service.assignException(id, user_id);

    return c.json({ message: 'Exception assigned successfully' });
  } catch (error: any) {
    console.error('Error assigning exception:', error);
    return c.json(
      { error: 'Failed to assign exception', details: error.message },
      500
    );
  }
});

/**
 * DELETE /api/exceptions/cleanup
 * Delete old resolved exceptions
 */
app.delete('/cleanup', authenticate, async (c) => {
  const db = c.env.DB;
  const { days_to_keep } = c.req.query();

  try {
    const daysToKeep = days_to_keep ? parseInt(days_to_keep) : 90;

    const service = createExceptionHandlingService(db);
    const deletedCount = await service.deleteOldExceptions(daysToKeep);

    return c.json({
      message: 'Old exceptions cleaned up successfully',
      deleted_count: deletedCount,
      days_kept: daysToKeep,
    });
  } catch (error: any) {
    console.error('Error cleaning up exceptions:', error);
    return c.json(
      { error: 'Failed to clean up exceptions', details: error.message },
      500
    );
  }
});

export default app;

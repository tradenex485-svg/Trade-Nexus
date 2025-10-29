/**
 * CFTC Phase 7: Audit Trail API Routes
 *
 * Endpoints for querying and managing audit trail:
 * - GET /api/audit-trail - Query audit entries with filters
 * - GET /api/audit-trail/stats - Get audit statistics
 * - GET /api/audit-trail/entity/:type/:id - Get entity history
 * - GET /api/audit-trail/user/:userId - Get user activity
 * - GET /api/audit-trail/search - Search audit trail
 * - POST /api/audit-trail - Create audit entry (manual logging)
 * - DELETE /api/audit-trail/cleanup - Cleanup old entries
 */

import { Hono } from 'hono';
import { AppContext } from '../types';
import { AuditTrailService } from '../services/audit-trail-service';

const app = new Hono<AppContext>();

/**
 * GET /api/audit-trail
 * Query audit trail with filters
 */
app.get('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const {
      event_type,
      entity_type,
      entity_id,
      user_id,
      action,
      start_date,
      end_date,
      limit,
      offset,
    } = c.req.query();

    const service = new AuditTrailService(c.env.DB);

    const filters = {
      event_type,
      entity_type,
      entity_id: entity_id ? parseInt(entity_id) : undefined,
      user_id: user_id ? parseInt(user_id) : undefined,
      company_id: user.company_id,
      action,
      start_date,
      end_date,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    };

    const entries = await service.queryAuditTrail(filters);

    return c.json({
      success: true,
      entries,
      count: entries.length,
      filters,
    });
  } catch (error: any) {
    console.error('Error querying audit trail:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Failed to query audit trail',
      },
      500
    );
  }
});

/**
 * GET /api/audit-trail/stats
 * Get audit trail statistics
 */
app.get('/stats', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { start_date, end_date } = c.req.query();

    const service = new AuditTrailService(c.env.DB);
    const stats = await service.getAuditStats(
      user.company_id,
      start_date,
      end_date
    );

    return c.json({
      success: true,
      stats,
      company_id: user.company_id,
      date_range: {
        start: start_date || 'beginning',
        end: end_date || 'now',
      },
    });
  } catch (error: any) {
    console.error('Error getting audit stats:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Failed to get audit statistics',
      },
      500
    );
  }
});

/**
 * GET /api/audit-trail/entity/:type/:id
 * Get audit history for a specific entity
 */
app.get('/entity/:type/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const entityType = c.req.param('type');
    const entityId = parseInt(c.req.param('id'));
    const { limit } = c.req.query();

    if (isNaN(entityId)) {
      return c.json(
        {
          success: false,
          error: 'Invalid entity ID',
        },
        400
      );
    }

    const service = new AuditTrailService(c.env.DB);
    const history = await service.getEntityHistory(
      entityType,
      entityId,
      limit ? parseInt(limit) : 50
    );

    return c.json({
      success: true,
      entity_type: entityType,
      entity_id: entityId,
      history,
      count: history.length,
    });
  } catch (error: any) {
    console.error('Error getting entity history:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Failed to get entity history',
      },
      500
    );
  }
});

/**
 * GET /api/audit-trail/user/:userId
 * Get user activity history
 */
app.get('/user/:userId', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = parseInt(c.req.param('userId'));
    const { limit } = c.req.query();

    if (isNaN(userId)) {
      return c.json(
        {
          success: false,
          error: 'Invalid user ID',
        },
        400
      );
    }

    // Users can only view their own activity unless they're admin
    if (user.id !== userId && user.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const service = new AuditTrailService(c.env.DB);
    const activity = await service.getUserActivity(
      userId,
      limit ? parseInt(limit) : 50
    );

    return c.json({
      success: true,
      user_id: userId,
      activity,
      count: activity.length,
    });
  } catch (error: any) {
    console.error('Error getting user activity:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Failed to get user activity',
      },
      500
    );
  }
});

/**
 * GET /api/audit-trail/search
 * Search audit trail by keyword
 */
app.get('/search', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { q, limit } = c.req.query();

    if (!q || q.trim().length < 2) {
      return c.json(
        {
          success: false,
          error: 'Search query must be at least 2 characters',
        },
        400
      );
    }

    const service = new AuditTrailService(c.env.DB);
    const results = await service.searchAuditTrail(
      q,
      user.company_id,
      limit ? parseInt(limit) : 50
    );

    return c.json({
      success: true,
      query: q,
      results,
      count: results.length,
    });
  } catch (error: any) {
    console.error('Error searching audit trail:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Failed to search audit trail',
      },
      500
    );
  }
});

/**
 * POST /api/audit-trail
 * Create audit entry (manual logging)
 */
app.post('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const {
      event_type,
      entity_type,
      entity_id,
      action,
      changes,
      metadata,
    } = body;

    if (!event_type || !entity_type || !entity_id || !action) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: event_type, entity_type, entity_id, action',
        },
        400
      );
    }

    const service = new AuditTrailService(c.env.DB);

    // Get IP and User-Agent from request headers
    const ip_address = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip');
    const user_agent = c.req.header('user-agent');

    const auditId = await service.logEvent({
      event_type,
      entity_type,
      entity_id: parseInt(entity_id),
      action,
      user_id: user.id,
      company_id: user.company_id,
      changes: changes ? JSON.stringify(changes) : undefined,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      ip_address,
      user_agent,
    });

    return c.json({
      success: true,
      audit_id: auditId,
      message: 'Audit entry created successfully',
    });
  } catch (error: any) {
    console.error('Error creating audit entry:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Failed to create audit entry',
      },
      500
    );
  }
});

/**
 * DELETE /api/audit-trail/cleanup
 * Cleanup old audit entries (admin only)
 */
app.delete('/cleanup', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (user.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const { retention_days } = c.req.query();
    const retentionDays = retention_days ? parseInt(retention_days) : 365;

    if (retentionDays < 90) {
      return c.json(
        {
          success: false,
          error: 'Retention period must be at least 90 days for compliance',
        },
        400
      );
    }

    const service = new AuditTrailService(c.env.DB);
    const deletedCount = await service.cleanupOldEntries(
      retentionDays,
      user.company_id
    );

    return c.json({
      success: true,
      deleted_count: deletedCount,
      retention_days: retentionDays,
      message: `Deleted ${deletedCount} audit entries older than ${retentionDays} days`,
    });
  } catch (error: any) {
    console.error('Error cleaning up audit trail:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Failed to cleanup audit trail',
      },
      500
    );
  }
});

export default app;

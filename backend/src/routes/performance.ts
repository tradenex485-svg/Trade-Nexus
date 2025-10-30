/**
 * Performance Monitoring API Routes
 * Provides system performance statistics and rate limiting analytics
 * Requires authentication and system.configure permission (admin/super_admin only)
 */

import { Hono } from 'hono';
import { getPerformanceStats } from '../middleware/performance';
import { getRateLimitStats } from '../middleware/rate-limiter';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

export const performanceRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * Helper function to check if user has system.configure permission
 */
async function hasSystemAccess(c: any): Promise<boolean> {
  const user = c.get('user');
  if (!user) {
    return false;
  }

  // Load user's permissions from database
  const permissions = await c.env.DB.prepare(`
    SELECT p.permission_name
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = ?
  `).bind(user.roleId).all();

  const userPermissions = permissions.results.map((p: any) => p.permission_name);

  // Check if user has system.configure permission
  return userPermissions.includes('system.configure');
}

/**
 * GET /api/performance/stats
 * Get API performance statistics
 *
 * Query Parameters:
 * - hours: Number of hours to analyze (default: 24)
 *
 * Returns:
 * - overall: Overall performance metrics
 * - slowestEndpoints: Top 10 slowest endpoints
 * - statusDistribution: HTTP status code distribution
 * - requestsPerHour: Hourly request breakdown
 *
 * Auth Required: Yes (system.configure permission)
 */
performanceRoutes.get('/stats', async (c) => {
  try {
    // Check authentication
    const user = c.get('user');
    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      }, 401);
    }

    // Check permission
    if (!(await hasSystemAccess(c))) {
      return c.json({
        success: false,
        error: 'Forbidden',
        message: 'Insufficient permissions. Requires system.configure permission.',
      }, 403);
    }

    const hours = parseInt(c.req.query('hours') || '24');

    // Validate hours parameter
    if (isNaN(hours) || hours < 1 || hours > 168) { // Max 7 days
      return c.json({
        success: false,
        error: 'Invalid parameter',
        message: 'Hours must be between 1 and 168',
      }, 400);
    }

    const stats = await getPerformanceStats(c.env.DB, hours);

    if (stats === null) {
      return c.json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve performance statistics',
      }, 500);
    }

    return c.json({
      success: true,
      data: stats,
      period: {
        hours: hours,
        from: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /performance/stats:', error);
    return c.json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /api/performance/rate-limits
 * Get rate limiting statistics
 *
 * Query Parameters:
 * - hours: Number of hours to analyze (default: 24)
 *
 * Returns:
 * - topLimited: Top 20 users/IPs by request count
 * - topEndpoints: Top 10 most hit endpoints
 * - requestsOverTime: Hourly request breakdown
 *
 * Auth Required: Yes (system.configure permission)
 */
performanceRoutes.get('/rate-limits', async (c) => {
  try {
    // Check authentication
    const user = c.get('user');
    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      }, 401);
    }

    // Check permission
    if (!(await hasSystemAccess(c))) {
      return c.json({
        success: false,
        error: 'Forbidden',
        message: 'Insufficient permissions. Requires system.configure permission.',
      }, 403);
    }

    const hours = parseInt(c.req.query('hours') || '24');

    // Validate hours parameter
    if (isNaN(hours) || hours < 1 || hours > 168) { // Max 7 days
      return c.json({
        success: false,
        error: 'Invalid parameter',
        message: 'Hours must be between 1 and 168',
      }, 400);
    }

    const stats = await getRateLimitStats(c.env.DB, hours);

    if (stats === null) {
      return c.json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve rate limit statistics',
      }, 500);
    }

    return c.json({
      success: true,
      data: stats,
      period: {
        hours: hours,
        from: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /performance/rate-limits:', error);
    return c.json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    }, 500);
  }
});

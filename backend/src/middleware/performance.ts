// Performance Monitoring Middleware
// Tracks API response times, query counts, and cache hits

import { Context, Next } from 'hono';

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  queryCount: number;
  cacheHit: number;
  timestamp: Date;
}

/**
 * Performance monitoring middleware
 * Tracks request timing and stores metrics in database
 */
export const performanceMonitoring = async (c: Context, next: Next) => {
  const startTime = Date.now();
  const endpoint = c.req.path;
  const method = c.req.method;

  // Initialize performance context
  c.set('perfMetrics', {
    queryCount: 0,
    cacheHit: 0,
  });

  // Execute request
  await next();

  // Calculate response time
  const responseTime = Date.now() - startTime;
  const statusCode = c.res.status;
  const perfData = c.get('perfMetrics') || { queryCount: 0, cacheHit: 0 };

  // Store metrics in background (non-blocking)
  c.executionCtx.waitUntil(
    storeMetrics(c.env.DB, {
      endpoint,
      method,
      statusCode,
      responseTimeMs: responseTime,
      queryCount: perfData.queryCount || 0,
      cacheHit: perfData.cacheHit || 0,
      timestamp: new Date(),
    })
  );

  // Add performance headers
  c.res.headers.set('X-Response-Time', `${responseTime}ms`);
  c.res.headers.set('X-Query-Count', String(perfData.queryCount || 0));
  c.res.headers.set('X-Cache-Hit', String(perfData.cacheHit || 0));
};

/**
 * Store performance metrics in database
 */
async function storeMetrics(
  db: D1Database,
  metrics: PerformanceMetrics
): Promise<void> {
  try {
    await db
      .prepare(
        `
      INSERT INTO performance_metrics (endpoint, method, status_code, response_time_ms, query_count, cache_hit, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `
      )
      .bind(
        metrics.endpoint,
        metrics.method,
        metrics.statusCode,
        metrics.responseTimeMs,
        metrics.queryCount,
        metrics.cacheHit
      )
      .run();
  } catch (error) {
    // Silent fail - don't let metrics tracking break the app
    console.error('Failed to store performance metrics:', error);
  }
}

/**
 * Helper to increment query count in request context
 */
export function incrementQueryCount(c: Context, count: number = 1): void {
  const perfData = c.get('perfMetrics') || { queryCount: 0, cacheHit: 0 };
  perfData.queryCount += count;
  c.set('perfMetrics', perfData);
}

/**
 * Helper to mark cache hit in request context
 */
export function markCacheHit(c: Context): void {
  const perfData = c.get('perfMetrics') || { queryCount: 0, cacheHit: 0 };
  perfData.cacheHit = 1;
  c.set('perfMetrics', perfData);
}

/**
 * Get performance statistics for monitoring
 */
export async function getPerformanceStats(
  db: D1Database,
  hours: number = 24
): Promise<any> {
  try {
    // Overall stats
    const overallStats = await db
      .prepare(
        `
      SELECT
        COUNT(*) as total_requests,
        AVG(response_time_ms) as avg_response_time,
        MAX(response_time_ms) as max_response_time,
        MIN(response_time_ms) as min_response_time,
        AVG(query_count) as avg_query_count,
        SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as cache_hits,
        COUNT(*) as total_requests_for_cache,
        ROUND(CAST(SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 2) as cache_hit_rate
      FROM performance_metrics
      WHERE created_at >= datetime('now', '-${hours} hours')
    `
      )
      .first();

    // Slowest endpoints
    const slowestEndpoints = await db
      .prepare(
        `
      SELECT
        endpoint,
        method,
        AVG(response_time_ms) as avg_response_time,
        MAX(response_time_ms) as max_response_time,
        COUNT(*) as request_count
      FROM performance_metrics
      WHERE created_at >= datetime('now', '-${hours} hours')
      GROUP BY endpoint, method
      ORDER BY avg_response_time DESC
      LIMIT 10
    `
      )
      .all();

    // Status code distribution
    const statusDistribution = await db
      .prepare(
        `
      SELECT
        status_code,
        COUNT(*) as count,
        ROUND(CAST(COUNT(*) AS REAL) / (SELECT COUNT(*) FROM performance_metrics WHERE created_at >= datetime('now', '-${hours} hours')) * 100, 2) as percentage
      FROM performance_metrics
      WHERE created_at >= datetime('now', '-${hours} hours')
      GROUP BY status_code
      ORDER BY status_code
    `
      )
      .all();

    // Requests per hour
    const requestsPerHour = await db
      .prepare(
        `
      SELECT
        strftime('%Y-%m-%d %H:00', created_at) as hour,
        COUNT(*) as request_count,
        AVG(response_time_ms) as avg_response_time
      FROM performance_metrics
      WHERE created_at >= datetime('now', '-${hours} hours')
      GROUP BY hour
      ORDER BY hour
    `
      )
      .all();

    return {
      overall: overallStats,
      slowestEndpoints: slowestEndpoints.results,
      statusDistribution: statusDistribution.results,
      requestsPerHour: requestsPerHour.results,
    };
  } catch (error) {
    console.error('Error fetching performance stats:', error);
    return null;
  }
}

/**
 * Get slow queries for alerting
 */
export async function getSlowQueries(
  db: D1Database,
  thresholdMs: number = 1000,
  hours: number = 1
): Promise<any[]> {
  try {
    const result = await db
      .prepare(
        `
      SELECT
        endpoint,
        method,
        response_time_ms,
        status_code,
        created_at
      FROM performance_metrics
      WHERE response_time_ms > ?
        AND created_at >= datetime('now', '-${hours} hours')
      ORDER BY created_at DESC
      LIMIT 100
    `
      )
      .bind(thresholdMs)
      .all();

    return result.results || [];
  } catch (error) {
    console.error('Error fetching slow queries:', error);
    return [];
  }
}

/**
 * Cleanup old performance metrics
 */
export async function cleanupOldMetrics(
  db: D1Database,
  daysToKeep: number = 7
): Promise<void> {
  try {
    await db
      .prepare(
        `
      DELETE FROM performance_metrics
      WHERE created_at < datetime('now', '-${daysToKeep} days')
    `
      )
      .run();
  } catch (error) {
    console.error('Error cleaning up old metrics:', error);
  }
}

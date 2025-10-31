// Rate Limiting Middleware
// Prevents API abuse by limiting requests per time window

import { Context, Next } from 'hono';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean; // Only count failed requests
  skipFailedRequests?: boolean; // Only count successful requests
  keyGenerator?: (c: Context) => string; // Custom key generator
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

/**
 * Default key generator - uses IP address or user ID
 */
function defaultKeyGenerator(c: Context): string {
  // Try to get user ID from auth context
  const user = c.get('user');
  if (user?.id) {
    return `user:${user.id}`;
  }

  // Fall back to IP address
  const ip =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for') ||
    c.req.header('x-real-ip') ||
    'unknown';

  return `ip:${ip}`;
}

/**
 * Rate limiter middleware factory
 */
export function rateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = defaultKeyGenerator,
  } = config;

  return async (c: Context, next: Next) => {
    const db: D1Database = c.env.DB;
    const endpoint = c.req.path;
    const identifier = keyGenerator(c);

    // Get current rate limit status
    const rateLimitInfo = await getRateLimitInfo(
      db,
      identifier,
      endpoint,
      windowMs,
      maxRequests
    );

    // Check if rate limit exceeded
    if (rateLimitInfo.remaining <= 0) {
      // Set rate limit headers
      c.res.headers.set('X-RateLimit-Limit', String(rateLimitInfo.limit));
      c.res.headers.set('X-RateLimit-Remaining', '0');
      c.res.headers.set('X-RateLimit-Reset', rateLimitInfo.resetTime.toISOString());
      c.res.headers.set('Retry-After', String(Math.ceil((rateLimitInfo.resetTime.getTime() - Date.now()) / 1000)));

      return c.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again after ${rateLimitInfo.resetTime.toISOString()}`,
          limit: rateLimitInfo.limit,
          resetTime: rateLimitInfo.resetTime.toISOString(),
        },
        429
      );
    }

    // Process request
    await next();

    // Determine if we should count this request
    const shouldCount =
      (!skipSuccessfulRequests || c.res.status >= 400) &&
      (!skipFailedRequests || c.res.status < 400);

    if (shouldCount) {
      // Increment counter in background (non-blocking)
      c.executionCtx.waitUntil(
        incrementRateLimit(db, identifier, endpoint, windowMs)
      );
    }

    // Set rate limit headers
    c.res.headers.set('X-RateLimit-Limit', String(rateLimitInfo.limit));
    c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, rateLimitInfo.remaining - 1)));
    c.res.headers.set('X-RateLimit-Reset', rateLimitInfo.resetTime.toISOString());
  };
}

/**
 * Get current rate limit information
 */
async function getRateLimitInfo(
  db: D1Database,
  identifier: string,
  endpoint: string,
  windowMs: number,
  maxRequests: number
): Promise<RateLimitInfo> {
  const windowStart = new Date(Date.now() - windowMs);

  try {
    // Get current count within window
    const result = await db
      .prepare(
        `
      SELECT
        COALESCE(SUM(request_count), 0) as current_count,
        MAX(window_start) as latest_window
      FROM rate_limits
      WHERE identifier = ?
        AND endpoint = ?
        AND window_start >= datetime(?)
    `
      )
      .bind(identifier, endpoint, windowStart.toISOString())
      .first<{ current_count: number; latest_window: string | null }>();

    const currentCount = result?.current_count || 0;
    const resetTime = new Date(Date.now() + windowMs);

    return {
      limit: maxRequests,
      current: currentCount,
      remaining: Math.max(0, maxRequests - currentCount),
      resetTime,
    };
  } catch (error) {
    console.error('Error getting rate limit info:', error);
    // Fail open - allow request if we can't check rate limit
    return {
      limit: maxRequests,
      current: 0,
      remaining: maxRequests,
      resetTime: new Date(Date.now() + windowMs),
    };
  }
}

/**
 * Increment rate limit counter
 */
async function incrementRateLimit(
  db: D1Database,
  identifier: string,
  endpoint: string,
  windowMs: number
): Promise<void> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);

  try {
    await db
      .prepare(
        `
      INSERT INTO rate_limits (identifier, endpoint, request_count, window_start, created_at)
      VALUES (?, ?, 1, datetime(?), CURRENT_TIMESTAMP)
      ON CONFLICT(identifier, endpoint, window_start) DO UPDATE SET
        request_count = request_count + 1
    `
      )
      .bind(identifier, endpoint, windowStart.toISOString())
      .run();

    // Also ensure we have a unique constraint
    // This would be in the migration but we add logic here for safety
  } catch (error) {
    console.error('Error incrementing rate limit:', error);
    // Silent fail - don't break request if rate limiting fails
  }
}

/**
 * Cleanup old rate limit records
 */
export async function cleanupOldRateLimits(
  db: D1Database,
  hoursToKeep: number = 24
): Promise<void> {
  try {
    const cutoffTime = new Date(Date.now() - hoursToKeep * 60 * 60 * 1000).toISOString();
    await db
      .prepare(
        `
      DELETE FROM rate_limits
      WHERE created_at < datetime(?)
    `
      )
      .bind(cutoffTime)
      .run();
  } catch (error) {
    console.error('Error cleaning up old rate limits:', error);
  }
}

/**
 * Get rate limit statistics
 */
export async function getRateLimitStats(
  db: D1Database,
  hours: number = 24
): Promise<any> {
  try {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Top rate limited users
    const topLimited = await db
      .prepare(
        `
      SELECT
        identifier,
        endpoint,
        SUM(request_count) as total_requests,
        COUNT(DISTINCT window_start) as windows_hit
      FROM rate_limits
      WHERE created_at >= datetime(?)
      GROUP BY identifier, endpoint
      ORDER BY total_requests DESC
      LIMIT 20
    `
      )
      .bind(cutoffTime)
      .all();

    // Most hit endpoints
    const topEndpoints = await db
      .prepare(
        `
      SELECT
        endpoint,
        SUM(request_count) as total_requests,
        COUNT(DISTINCT identifier) as unique_users
      FROM rate_limits
      WHERE created_at >= datetime(?)
      GROUP BY endpoint
      ORDER BY total_requests DESC
      LIMIT 10
    `
      )
      .bind(cutoffTime)
      .all();

    // Requests over time
    const requestsOverTime = await db
      .prepare(
        `
      SELECT
        strftime('%Y-%m-%d %H:00', created_at) as hour,
        SUM(request_count) as request_count,
        COUNT(DISTINCT identifier) as unique_identifiers
      FROM rate_limits
      WHERE created_at >= datetime(?)
      GROUP BY hour
      ORDER BY hour
    `
      )
      .bind(cutoffTime)
      .all();

    return {
      topLimited: topLimited.results,
      topEndpoints: topEndpoints.results,
      requestsOverTime: requestsOverTime.results,
    };
  } catch (error) {
    console.error('Error fetching rate limit stats:', error);
    return null;
  }
}

/**
 * Preset rate limit configurations
 */
export const RateLimitPresets = {
  // Strict - 10 requests per minute
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  // Standard - 100 requests per minute
  standard: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  // Relaxed - 1000 requests per minute
  relaxed: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
  },
  // Auth endpoints - 5 attempts per 15 minutes
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    skipSuccessfulRequests: true, // Only count failed login attempts
  },
  // Write operations - 50 per minute
  writes: {
    windowMs: 60 * 1000,
    maxRequests: 50,
  },
  // Expensive operations - 10 per hour
  expensive: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
  },
};

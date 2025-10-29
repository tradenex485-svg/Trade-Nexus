/**
 * API Key Rate Limiter Middleware
 * Implements per-API-key rate limiting for better abuse protection
 */

import { Context, Next } from 'hono';
import { Logger } from '../utils/logger';

export interface ApiKeyRateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour?: number;
  burstSize?: number;
}

export const ApiKeyRateLimitPresets = {
  standard: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    burstSize: 10,
  },
  premium: {
    requestsPerMinute: 300,
    requestsPerHour: 10000,
    burstSize: 50,
  },
  restricted: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    burstSize: 2,
  },
};

/**
 * API Key Rate Limiter Middleware
 * Checks rate limits based on API key in X-API-Key header
 */
export function apiKeyRateLimiter(config: ApiKeyRateLimitConfig) {
  return async (c: Context, next: Next) => {
    const logger = Logger.fromContext('ApiKeyRateLimiter', c);
    const apiKey = c.req.header('X-API-Key');

    // If no API key, skip (will be handled by other auth middleware)
    if (!apiKey) {
      return next();
    }

    try {
      // Check if rate limiting is available
      if (!c.env.CACHE) {
        logger.warn('CACHE namespace not available, skipping rate limit');
        return next();
      }

      const now = Date.now();
      const minuteKey = `ratelimit:apikey:${apiKey}:minute`;
      const hourKey = `ratelimit:apikey:${apiKey}:hour`;

      // Check minute-based rate limit
      const minuteCount = await getRateLimitCount(c.env.CACHE, minuteKey);
      if (minuteCount >= config.requestsPerMinute) {
        logger.warn('API key rate limit exceeded (minute)', {
          apiKey: apiKey.substring(0, 8) + '...',
          limit: config.requestsPerMinute,
          count: minuteCount,
        });

        return c.json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Limit: ${config.requestsPerMinute} requests per minute`,
          retryAfter: 60,
        }, 429);
      }

      // Check hour-based rate limit (if configured)
      if (config.requestsPerHour) {
        const hourCount = await getRateLimitCount(c.env.CACHE, hourKey);
        if (hourCount >= config.requestsPerHour) {
          logger.warn('API key rate limit exceeded (hour)', {
            apiKey: apiKey.substring(0, 8) + '...',
            limit: config.requestsPerHour,
            count: hourCount,
          });

          return c.json({
            error: 'Rate limit exceeded',
            message: `Too many requests. Limit: ${config.requestsPerHour} requests per hour`,
            retryAfter: 3600,
          }, 429);
        }
      }

      // Increment counters
      await incrementRateLimit(c.env.CACHE, minuteKey, 60); // 1 minute TTL
      if (config.requestsPerHour) {
        await incrementRateLimit(c.env.CACHE, hourKey, 3600); // 1 hour TTL
      }

      // Add rate limit headers
      c.header('X-RateLimit-Limit', config.requestsPerMinute.toString());
      c.header('X-RateLimit-Remaining', Math.max(0, config.requestsPerMinute - minuteCount - 1).toString());
      c.header('X-RateLimit-Reset', new Date(now + 60000).toISOString());

      await next();
    } catch (error: any) {
      logger.error('Rate limit check failed', error);
      // Don't block on rate limit errors, just log and continue
      await next();
    }
  };
}

/**
 * Get current rate limit count from KV
 */
async function getRateLimitCount(cache: KVNamespace, key: string): Promise<number> {
  const value = await cache.get(key);
  return value ? parseInt(value) : 0;
}

/**
 * Increment rate limit counter in KV
 */
async function incrementRateLimit(cache: KVNamespace, key: string, ttl: number): Promise<void> {
  const current = await getRateLimitCount(cache, key);
  const newValue = (current + 1).toString();

  await cache.put(key, newValue, {
    expirationTtl: ttl,
  });
}

/**
 * Check and enforce API key rate limit from database config
 * This version looks up the API key's rate limit from the database
 */
export function dynamicApiKeyRateLimiter() {
  return async (c: Context, next: Next) => {
    const logger = Logger.fromContext('DynamicApiKeyRateLimiter', c);
    const apiKey = c.req.header('X-API-Key');

    // If no API key, skip
    if (!apiKey) {
      return next();
    }

    try {
      // Look up API key in database
      const apiKeyRecord = await c.env.DB.prepare(`
        SELECT id, user_id, rate_limit, is_active, expires_at
        FROM api_keys
        WHERE key_hash = ? AND is_active = 1
      `).bind(hashApiKey(apiKey)).first();

      if (!apiKeyRecord) {
        return c.json({ error: 'Invalid API key' }, 401);
      }

      // Check if expired
      if (apiKeyRecord.expires_at) {
        const expiresAt = new Date(apiKeyRecord.expires_at as string);
        if (expiresAt < new Date()) {
          logger.security('Expired API key used', 'medium', {
            apiKeyId: apiKeyRecord.id,
            userId: apiKeyRecord.user_id,
          });

          return c.json({ error: 'API key expired' }, 401);
        }
      }

      // Apply rate limit from database (or use default)
      const rateLimit = apiKeyRecord.rate_limit as number || 60;

      // Check rate limit
      if (c.env.CACHE) {
        const minuteKey = `ratelimit:apikey:${apiKeyRecord.id}:minute`;
        const count = await getRateLimitCount(c.env.CACHE, minuteKey);

        if (count >= rateLimit) {
          logger.warn('API key rate limit exceeded', {
            apiKeyId: apiKeyRecord.id,
            userId: apiKeyRecord.user_id,
            limit: rateLimit,
            count,
          });

          return c.json({
            error: 'Rate limit exceeded',
            message: `Too many requests. Limit: ${rateLimit} requests per minute`,
            retryAfter: 60,
          }, 429);
        }

        // Increment counter
        await incrementRateLimit(c.env.CACHE, minuteKey, 60);

        // Add headers
        c.header('X-RateLimit-Limit', rateLimit.toString());
        c.header('X-RateLimit-Remaining', Math.max(0, rateLimit - count - 1).toString());
      }

      // Set API key info in context for downstream use
      c.set('apiKey', {
        id: apiKeyRecord.id,
        userId: apiKeyRecord.user_id,
      });

      // Log API key usage
      await c.env.DB.prepare(`
        UPDATE api_keys
        SET last_used_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(apiKeyRecord.id).run();

      await next();
    } catch (error: any) {
      logger.error('Dynamic rate limit check failed', error);
      return c.json({ error: 'Rate limit check failed' }, 500);
    }
  };
}

/**
 * Hash API key for secure storage lookup
 * Uses same hashing as when API key is created
 */
function hashApiKey(apiKey: string): string {
  // Simple hash for demo - in production, use proper crypto.subtle
  // This should match the hashing used when creating API keys
  return apiKey; // TODO: Implement proper hashing
}

/**
 * Get rate limit statistics for monitoring
 */
export async function getApiKeyRateLimitStats(db: D1Database, hours: number = 24): Promise<any> {
  // This would require storing rate limit hits in a separate table
  // For now, return basic API key stats
  const stats = await db.prepare(`
    SELECT
      COUNT(*) as total_keys,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_keys,
      AVG(rate_limit) as avg_rate_limit
    FROM api_keys
    WHERE created_at > datetime('now', '-${hours} hours')
  `).first();

  return stats;
}

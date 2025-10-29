// Cache Service - KV-based caching with TTL
// Provides high-performance caching for frequently accessed data

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  type?: 'json' | 'text' | 'stream';
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

/**
 * Cache service using Cloudflare KV
 * Provides get, set, delete operations with TTL support
 */
export class CacheService {
  private kv: KVNamespace;
  private db: D1Database;
  private prefix: string;

  constructor(kv: KVNamespace, db: D1Database, prefix: string = 'cache:') {
    this.kv = kv;
    this.db = db;
    this.prefix = prefix;
  }

  /**
   * Get cached value
   */
  async get<T = any>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.prefix + key;

    try {
      const value = await this.kv.get(fullKey, {
        type: options?.type || 'json',
      });

      // Track cache hit/miss
      if (value !== null) {
        await this.trackHit(key);
        return value as T;
      } else {
        await this.trackMiss(key);
        return null;
      }
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      await this.trackMiss(key);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set(key: string, value: any, options?: CacheOptions): Promise<void> {
    const fullKey = this.prefix + key;
    const ttl = options?.ttl || 300; // Default 5 minutes

    try {
      if (options?.type === 'text' || typeof value === 'string') {
        await this.kv.put(fullKey, value, {
          expirationTtl: ttl,
        });
      } else {
        await this.kv.put(fullKey, JSON.stringify(value), {
          expirationTtl: ttl,
        });
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.prefix + key;

    try {
      await this.kv.delete(fullKey);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const list = await this.kv.list({ prefix: this.prefix + pattern });

      for (const key of list.keys) {
        await this.kv.delete(key.name);
      }
    } catch (error) {
      console.error(`Cache deletePattern error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Get or compute - cache wrapper pattern
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Compute value
    const value = await computeFn();

    // Store in cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Track cache hit
   */
  private async trackHit(key: string): Promise<void> {
    try {
      await this.db.prepare(`
        INSERT INTO cache_statistics (cache_key, hit_count, last_hit)
        VALUES (?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(cache_key) DO UPDATE SET
          hit_count = hit_count + 1,
          last_hit = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `).bind(key).run();
    } catch (error) {
      // Silent fail - don't let stats tracking break functionality
    }
  }

  /**
   * Track cache miss
   */
  private async trackMiss(key: string): Promise<void> {
    try {
      await this.db.prepare(`
        INSERT INTO cache_statistics (cache_key, miss_count, last_miss)
        VALUES (?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(cache_key) DO UPDATE SET
          miss_count = miss_count + 1,
          last_miss = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `).bind(key).run();
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(key?: string): Promise<CacheStats | CacheStats[]> {
    try {
      if (key) {
        const result = await this.db.prepare(`
          SELECT
            COALESCE(hit_count, 0) as hits,
            COALESCE(miss_count, 0) as misses,
            ROUND(CAST(COALESCE(hit_count, 0) AS REAL) /
              NULLIF(COALESCE(hit_count, 0) + COALESCE(miss_count, 0), 0) * 100, 2) as hitRate
          FROM cache_statistics
          WHERE cache_key = ?
        `).bind(key).first();

        return result as CacheStats || { hits: 0, misses: 0, hitRate: 0 };
      } else {
        const result = await this.db.prepare(`
          SELECT
            cache_key,
            COALESCE(hit_count, 0) as hits,
            COALESCE(miss_count, 0) as misses,
            ROUND(CAST(COALESCE(hit_count, 0) AS REAL) /
              NULLIF(COALESCE(hit_count, 0) + COALESCE(miss_count, 0), 0) * 100, 2) as hitRate
          FROM cache_statistics
          ORDER BY (hit_count + miss_count) DESC
          LIMIT 50
        `).all();

        return result.results as CacheStats[];
      }
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return key ? { hits: 0, misses: 0, hitRate: 0 } : [];
    }
  }
}

/**
 * Cache key generators for common data types
 */
export const CacheKeys = {
  // Dashboard
  dashboardOverview: () => 'dashboard:overview',
  dashboardByCommodity: (limitType: number) => `dashboard:commodity:${limitType}`,
  dashboardTrending: (days: number, code?: string) => `dashboard:trending:${days}:${code || 'all'}`,

  // Position Limits
  positionLimits: (limitType: string, filters?: any) => {
    const filterKey = filters ? `:${JSON.stringify(filters)}` : '';
    return `position-limits:${limitType}${filterKey}`;
  },
  positionLimit: (mktIndex: string) => `position-limit:${mktIndex}`,
  positionStatusCounts: (limitType: string) => `position:status:${limitType}`,

  // Market Limits
  marketLimits: () => 'market-limits:all',
  marketLimit: (mktIndex: string) => `market-limit:${mktIndex}`,

  // Alerts
  alerts: (unread?: boolean) => `alerts:${unread ? 'unread' : 'all'}`,
  alertStats: () => 'alerts:stats',

  // Reports
  reportSummary: () => 'report:summary',

  // Data Quality
  dataQualityDashboard: () => 'data-quality:dashboard',
  dataQualityStats: () => 'data-quality:stats',

  // Risk
  riskMetricsDashboard: () => 'risk:dashboard',
  riskConcentration: () => 'risk:concentration',
};

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  SHORT: 60,        // 1 minute - fast changing data
  MEDIUM: 300,      // 5 minutes - dashboard stats
  LONG: 3600,       // 1 hour - market limits
  DAY: 86400,       // 24 hours - reference data
};

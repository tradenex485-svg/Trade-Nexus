/**
 * Error Tracking Middleware
 * Integrates with Sentry for production error monitoring
 */

import { Context, Next } from 'hono';
import { Logger } from '../utils/logger';

/**
 * Initialize Sentry (would be called in index.ts)
 * Note: Actual Sentry integration requires @sentry/cloudflare package
 */
export function initializeSentry(env: any) {
  if (env.SENTRY_DSN && env.NODE_ENV === 'production') {
    // In a real implementation, you would:
    // import * as Sentry from '@sentry/cloudflare';
    // Sentry.init({
    //   dsn: env.SENTRY_DSN,
    //   environment: env.NODE_ENV,
    //   tracesSampleRate: 0.1,
    //   beforeSend(event) {
    //     // Sanitize sensitive data
    //     return sanitizeEvent(event);
    //   },
    // });

    console.log('Sentry initialized (placeholder)');
  }
}

/**
 * Error tracking middleware
 * Captures exceptions and sends them to Sentry
 */
export async function errorTracking(c: Context, next: Next) {
  const logger = Logger.fromContext('ErrorTracking', c);

  try {
    await next();

    // Track non-2xx responses as well
    const status = c.res.status;
    if (status >= 400 && status < 600) {
      trackHttpError(c, status);
    }
  } catch (error: any) {
    // Log the error
    logger.error('Unhandled exception', error, {
      url: c.req.url,
      method: c.req.method,
      path: c.req.path,
      headers: sanitizeHeaders(c.req.header()),
    });

    // Capture exception in Sentry
    captureException(c, error);

    // Re-throw to let Hono's error handler deal with it
    throw error;
  }
}

/**
 * Track HTTP errors (4xx, 5xx)
 */
function trackHttpError(c: Context, status: number) {
  const logger = Logger.fromContext('ErrorTracking', c);

  // Only track server errors (5xx) in Sentry, log client errors
  if (status >= 500) {
    logger.error(`HTTP ${status} error`, undefined, {
      url: c.req.url,
      method: c.req.method,
      path: c.req.path,
      status,
    });

    // Capture in Sentry
    if (c.env.SENTRY_DSN) {
      // Sentry.captureMessage(`HTTP ${status}: ${c.req.path}`, {
      //   level: 'error',
      //   extra: {
      //     url: c.req.url,
      //     method: c.req.method,
      //     status,
      //   },
      // });
    }
  } else if (status >= 400) {
    logger.warn(`HTTP ${status} client error`, {
      url: c.req.url,
      method: c.req.method,
      path: c.req.path,
      status,
    });
  }
}

/**
 * Capture exception in Sentry
 */
function captureException(c: Context, error: Error) {
  if (!c.env.SENTRY_DSN) {
    return;
  }

  const user = c.get('user');
  const requestId = c.get('requestId');

  // In a real implementation:
  // Sentry.captureException(error, {
  //   user: user ? {
  //     id: user.userId.toString(),
  //     email: user.email,
  //   } : undefined,
  //   tags: {
  //     requestId,
  //     path: c.req.path,
  //     method: c.req.method,
  //   },
  //   extra: {
  //     url: c.req.url,
  //     headers: sanitizeHeaders(c.req.header()),
  //     companyId: user?.companyId,
  //   },
  // });

  console.log(`[Sentry Placeholder] Would capture exception: ${error.message}`);
}

/**
 * Sanitize headers to remove sensitive data
 */
function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Capture breadcrumb (for context)
 */
export function captureBreadcrumb(
  c: Context,
  message: string,
  category: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: any
) {
  if (!c.env.SENTRY_DSN) {
    return;
  }

  // In a real implementation:
  // Sentry.addBreadcrumb({
  //   message,
  //   category,
  //   level,
  //   data,
  //   timestamp: Date.now() / 1000,
  // });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(c: Context, user: any) {
  if (!c.env.SENTRY_DSN || !user) {
    return;
  }

  // In a real implementation:
  // Sentry.setUser({
  //   id: user.userId.toString(),
  //   email: user.email,
  //   username: user.name,
  // });
}

/**
 * Track performance metrics
 */
export function trackPerformance(
  c: Context,
  operation: string,
  duration: number,
  data?: any
) {
  if (!c.env.SENTRY_DSN) {
    return;
  }

  const logger = Logger.fromContext('Performance', c);
  logger.metric(operation, duration, 'ms', data);

  // In a real implementation, create Sentry transaction:
  // const transaction = Sentry.startTransaction({
  //   op: operation,
  //   name: operation,
  // });
  // transaction.setMeasurement(operation, duration, 'millisecond');
  // transaction.finish();
}

/**
 * Manual error capture helper
 */
export function captureError(error: Error, context?: any) {
  // In a real implementation:
  // Sentry.captureException(error, {
  //   extra: context,
  // });

  console.error('[Sentry Placeholder] Would capture error:', error.message, context);
}

/**
 * Installation guide comment for implementing Sentry
 */
/*
To fully implement Sentry error tracking:

1. Install the package:
   npm install @sentry/cloudflare

2. Set the Sentry DSN secret:
   wrangler secret put SENTRY_DSN

3. Uncomment the Sentry integration code in this file

4. Add to src/index.ts:
   import { initializeSentry, errorTracking } from './middleware/error-tracking';

   // Initialize Sentry
   initializeSentry(env);

   // Add error tracking middleware
   app.use('*', errorTracking);

5. The middleware will automatically:
   - Capture unhandled exceptions
   - Track HTTP errors (4xx, 5xx)
   - Add user context to errors
   - Record breadcrumbs for debugging
   - Monitor performance metrics

6. Sentry dashboard will show:
   - Error frequency and trends
   - Stack traces with source maps
   - User impact analysis
   - Performance bottlenecks
   - Release tracking
*/

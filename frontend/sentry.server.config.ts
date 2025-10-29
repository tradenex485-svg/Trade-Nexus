/**
 * Sentry Server Configuration
 * Configures error tracking for server-side errors (SSR, API routes)
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT,

  // Adjust this value in production
  tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,

  // Performance monitoring
  integrations: [
    Sentry.httpIntegration(),
  ],

  // Don't send errors in development if DSN not configured
  enabled: Boolean(SENTRY_DSN),

  // Error filtering
  beforeSend(event, hint) {
    // Filter out non-critical errors
    const error = hint.originalException;

    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message);

      // Ignore expected errors
      if (
        message.includes('ECONNREFUSED') ||
        message.includes('ENOTFOUND')
      ) {
        // These are network errors that might be temporary
        return null;
      }
    }

    return event;
  },

  // Add server context
  initialScope: {
    tags: {
      app: 'trade-nexus-frontend',
      runtime: 'nodejs',
    },
  },
});

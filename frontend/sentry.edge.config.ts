/**
 * Sentry Edge Configuration
 * Configures error tracking for Edge Runtime (middleware, edge functions)
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT,

  // Adjust this value in production
  tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,

  // Don't send errors in development if DSN not configured
  enabled: Boolean(SENTRY_DSN),

  // Add edge context
  initialScope: {
    tags: {
      app: 'trade-nexus-frontend',
      runtime: 'edge',
    },
  },
});

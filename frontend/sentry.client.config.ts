/**
 * Sentry Client Configuration
 * Configures error tracking for browser/client-side errors
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT,

  // Adjust this value in production
  tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 0,
  replaysOnErrorSampleRate: 1.0,

  // Performance monitoring
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Don't send errors in development if DSN not configured
  enabled: Boolean(SENTRY_DSN),

  // Error filtering
  beforeSend(event, hint) {
    // Filter out non-critical errors in development
    if (SENTRY_ENVIRONMENT === 'development') {
      const error = hint.originalException;

      // Ignore common development errors
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);
        if (
          message.includes('ResizeObserver') ||
          message.includes('NotAllowedError') ||
          message.includes('hydration')
        ) {
          return null;
        }
      }
    }

    return event;
  },

  // Add user context
  initialScope: {
    tags: {
      app: 'trade-nexus-frontend',
    },
  },
});

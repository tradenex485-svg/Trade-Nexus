'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

/**
 * Global Error Page
 *
 * This component catches errors that occur in the root layout.
 * It must define its own <html> and <body> tags.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error
    console.error('Global Error:', error);

    // TODO: Send to error tracking service (e.g., Sentry)
    // if (typeof window !== 'undefined') {
    //   window.Sentry?.captureException(error, { extra: { digest: error.digest, scope: 'global' } });
    // }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxWidth: '42rem',
              width: '100%',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(71, 85, 105, 1)',
              borderRadius: '0.75rem',
              padding: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '0.5rem',
                }}
              >
                <AlertTriangle
                  style={{ width: '2rem', height: '2rem', color: '#ef4444' }}
                />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                  Application Error
                </h1>
                <p style={{ color: '#94a3b8', marginTop: '0.25rem', margin: 0 }}>
                  A critical error occurred. Please refresh the page.
                </p>
              </div>
            </div>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && (
              <div
                style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(71, 85, 105, 1)',
                }}
              >
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#f87171',
                    marginBottom: '0.5rem',
                  }}
                >
                  Error Details (Dev Only):
                </p>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#cbd5e1',
                    fontFamily: 'monospace',
                    marginBottom: '0.5rem',
                    wordBreak: 'break-word',
                  }}
                >
                  {error.message}
                </p>
                {error.digest && (
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                      fontFamily: 'monospace',
                    }}
                  >
                    Digest: {error.digest}
                  </p>
                )}
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={() => reset()}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
              onFocus={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
              onBlur={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            >
              <RefreshCcw style={{ width: '1rem', height: '1rem' }} />
              Reload Application
            </button>

            {/* Support Information */}
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid rgba(71, 85, 105, 1)',
              }}
            >
              <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                If this problem persists, please contact support at{' '}
                <a
                  href="mailto:support@tradenexus.com"
                  style={{ color: '#60a5fa', textDecoration: 'underline' }}
                >
                  support@tradenexus.com
                </a>
                {error.digest && (
                  <>
                    <br />
                    <span
                      style={{
                        display: 'block',
                        marginTop: '0.25rem',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: '#64748b',
                      }}
                    >
                      Error ID: {error.digest}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

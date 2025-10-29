'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

/**
 * Next.js Error Page
 *
 * This component is displayed when an error occurs in the app directory.
 * It automatically catches errors in Server Components and Client Components.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console/service
    logger.error('Page Error', error, {
      digest: error.digest,
    });

    // TODO: Send to error tracking service (e.g., Sentry)
    // if (typeof window !== 'undefined') {
    //   window.Sentry?.captureException(error, { extra: { digest: error.digest } });
    // }
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-red-500/10 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Something Went Wrong</h1>
            <p className="text-slate-400 mt-1">
              An unexpected error occurred while loading this page.
            </p>
          </div>
        </div>

        {/* Error Details (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <p className="text-sm font-semibold text-red-400 mb-2">Error Details (Dev Only):</p>
            <p className="text-xs text-slate-300 font-mono mb-2">{error.message}</p>
            {error.digest && (
              <p className="text-xs text-slate-400 font-mono">Digest: {error.digest}</p>
            )}
            {error.stack && (
              <details className="text-xs text-slate-400 font-mono mt-2">
                <summary className="cursor-pointer text-slate-300 hover:text-white">
                  Stack Trace
                </summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => reset()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
        </div>

        {/* Support Information */}
        <div className="mt-6 pt-6 border-t border-slate-700">
          <p className="text-sm text-slate-400">
            If this problem persists, please contact support.
            {error.digest && (
              <span className="block mt-1 font-mono text-xs text-slate-500">
                Error ID: {error.digest}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

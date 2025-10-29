'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithSSO } = useAuthStore();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleSSOCallback = async () => {
      try {
        // Extract tokens from URL
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refresh_token');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('message');

        // Check for errors from SSO provider
        if (error) {
          console.error('[SSO Callback] Error from SSO provider:', error, errorDescription);
          setStatus('error');
          setErrorMessage(errorDescription || error);

          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push(`/login?error=${encodeURIComponent(errorDescription || error)}`);
          }, 3000);
          return;
        }

        // Validate required tokens
        if (!token || !refreshToken) {
          console.error('[SSO Callback] Missing tokens in callback URL');
          setStatus('error');
          setErrorMessage('Missing authentication tokens. Please try logging in again.');

          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login?error=missing_tokens');
          }, 3000);
          return;
        }

        console.log('[SSO Callback] Processing SSO login with tokens');

        // Login with SSO tokens
        await loginWithSSO(token, refreshToken);

        console.log('[SSO Callback] Login successful, redirecting to dashboard');
        setStatus('success');

        // Wait a moment to show success state, then redirect
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } catch (error: any) {
        console.error('[SSO Callback] Login failed:', error);
        setStatus('error');
        setErrorMessage(error.message || 'SSO login failed. Please try again.');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push(`/login?error=${encodeURIComponent(error.message || 'sso_failed')}`);
        }, 3000);
      }
    };

    handleSSOCallback();
  }, [searchParams, loginWithSSO, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-white">
              {status === 'processing' && 'Completing Sign In'}
              {status === 'success' && 'Success!'}
              {status === 'error' && 'Authentication Failed'}
            </CardTitle>
            <CardDescription className="text-center text-slate-400">
              {status === 'processing' && 'Please wait while we sign you in...'}
              {status === 'success' && 'Redirecting to dashboard...'}
              {status === 'error' && 'Redirecting back to login...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {status === 'processing' && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="h-16 w-16 text-blue-500" />
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <CheckCircle className="h-16 w-16 text-green-500" />
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="text-center"
              >
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                {errorMessage && (
                  <p className="text-red-400 text-sm max-w-xs">
                    {errorMessage}
                  </p>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

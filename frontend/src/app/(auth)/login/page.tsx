'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { authApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Shield, Building, TrendingUp, FileCheck, Eye, Settings, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMethod, setAuthMethod] = useState<'password' | 'saml' | 'oauth' | null>(null);
  const [ssoProvider, setSsoProvider] = useState<string | null>(null);
  const [ssoLoginUrl, setSsoLoginUrl] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);

  // Active token persistence verification - checks every 50ms until token appears
  const waitForTokenPersistence = async (maxWaitMs = 3000): Promise<boolean> => {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const stored = localStorage.getItem('auth-storage');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.state?.token) {
            const elapsed = Date.now() - startTime;
            console.log(`[Login] ✓ Token persisted successfully after ${elapsed}ms`);
            return true;
          }
        }
      } catch (e) {
        console.error('[Login] Storage check error:', e);
      }

      // Check every 50ms (60 attempts over 3 seconds)
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.warn(`[Login] ⚠️ Token persistence timeout after ${maxWaitMs}ms - proceeding anyway`);
    return false;
  };

  // Check email for SSO authentication method
  const handleEmailCheck = async () => {
    if (!email || !email.includes('@')) {
      return;
    }

    setIsCheckingEmail(true);
    clearError();

    try {
      const result = await authApi.detectAuthMethod(email);

      setAuthMethod(result.auth_method);
      setSsoProvider(result.provider_name);
      setSsoLoginUrl(result.sso_login_url || null);

      if (result.auth_method === 'password') {
        // Show password field for standard login
        setShowPasswordField(true);
      } else if (result.auth_method === 'saml' || result.auth_method === 'oauth') {
        // SSO detected - no password needed
        setShowPasswordField(false);
      }
    } catch (error: any) {
      console.error('[Login] Email detection failed:', error);
      // Default to password login on error
      setAuthMethod('password');
      setShowPasswordField(true);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Handle SSO login redirect
  const handleSSOLogin = () => {
    if (ssoLoginUrl) {
      console.log('[Login] Redirecting to SSO provider:', ssoProvider);
      window.location.href = ssoLoginUrl;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password);

      // Wait for token to actually appear in localStorage
      console.log('[Login] Waiting for token persistence...');
      await waitForTokenPersistence();
      console.log('[Login] Navigating to dashboard');

      router.push('/');
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    clearError();
    setEmail(demoEmail);
    setPassword(demoPassword);

    try {
      await login(demoEmail, demoPassword);

      // Wait for token to actually appear in localStorage
      console.log('[Login] Waiting for token persistence...');
      await waitForTokenPersistence();
      console.log('[Login] Navigating to dashboard');

      router.push('/');
    } catch (error) {
      // Error is handled by the store
    }
  };

  const demoAccounts = [
    {
      role: 'Super Admin',
      email: 'superadmin@nexus.com',
      password: 'demo123',
      description: 'Full system access across all exchanges and companies',
      icon: Shield,
      color: 'purple',
    },
    {
      role: 'System Admin',
      email: 'sysadmin@nexus.com',
      password: 'demo123',
      description: 'System administrator with full platform access',
      icon: Settings,
      color: 'indigo',
    },
    {
      role: 'Company Admin',
      email: 'admin@nexus.com',
      password: 'demo123',
      description: 'Manage company traders and view company positions',
      icon: Building,
      color: 'blue',
    },
    {
      role: 'Compliance Officer',
      email: 'compliance@nexus.com',
      password: 'demo123',
      description: 'Compliance and regulatory oversight',
      icon: FileCheck,
      color: 'amber',
    },
    {
      role: 'Trader',
      email: 'trader@nexus.com',
      password: 'demo123',
      description: 'Execute trades and monitor personal positions',
      icon: TrendingUp,
      color: 'green',
    },
    {
      role: 'Auditor',
      email: 'auditor@nexus.com',
      password: 'demo123',
      description: 'Read-only access for auditing purposes',
      icon: Eye,
      color: 'slate',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 py-12">
      <div className="w-full max-w-6xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md mx-auto"
        >
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-white">
                Trade Nexus
              </CardTitle>
              <CardDescription className="text-center text-slate-400">
                Sign in to your account
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      // Reset state when email changes
                      setShowPasswordField(false);
                      setAuthMethod(null);
                      setSsoProvider(null);
                    }}
                    onBlur={handleEmailCheck}
                    required
                    disabled={isLoading || isCheckingEmail}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                  {ssoProvider && (
                    <p className="text-sm text-blue-400">
                      {ssoProvider} SSO detected
                    </p>
                  )}
                </div>

                {/* Show Continue button if email is entered but method not detected yet */}
                {email && !showPasswordField && authMethod === null && !isCheckingEmail && (
                  <Button
                    type="button"
                    onClick={handleEmailCheck}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}

                {/* Show SSO login button if SSO is detected */}
                {authMethod && (authMethod === 'saml' || authMethod === 'oauth') && ssoLoginUrl && (
                  <Button
                    type="button"
                    onClick={handleSSOLogin}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      <>
                        Continue with {ssoProvider}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}

                {/* Show password field only for password-based auth */}
                {showPasswordField && authMethod === 'password' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-slate-200">
                        Password
                      </Label>
                      <Link
                        href="/forgot-password"
                        prefetch={false}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                {/* Show Sign In button only for password-based auth */}
                {showPasswordField && authMethod === 'password' && (
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                )}

                <div className="text-center text-sm text-slate-400">
                  Don't have an account?{' '}
                  <Link
                    href="/register"
                    prefetch={false}
                    className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    Sign up
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-slate-500 text-sm mt-6"
          >
            Position Limit Monitoring System
          </motion.p>
        </motion.div>

        {/* Quick Demo Login Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full"
        >
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-white">Quick Demo Access</h3>
              <Badge className="bg-blue-600 text-white">Demo</Badge>
            </div>
            <p className="text-slate-400 text-sm">
              Try different role perspectives instantly - no registration required
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {demoAccounts.map((account, index) => {
              const Icon = account.icon;
              const colorClassesMap: Record<string, {
                bg: string;
                border: string;
                text: string;
                hover: string;
                badge: string;
              }> = {
                purple: {
                  bg: 'bg-purple-500/10',
                  border: 'border-purple-500/30',
                  text: 'text-purple-400',
                  hover: 'hover:bg-purple-500/20',
                  badge: 'bg-purple-600',
                },
                indigo: {
                  bg: 'bg-indigo-500/10',
                  border: 'border-indigo-500/30',
                  text: 'text-indigo-400',
                  hover: 'hover:bg-indigo-500/20',
                  badge: 'bg-indigo-600',
                },
                blue: {
                  bg: 'bg-blue-500/10',
                  border: 'border-blue-500/30',
                  text: 'text-blue-400',
                  hover: 'hover:bg-blue-500/20',
                  badge: 'bg-blue-600',
                },
                amber: {
                  bg: 'bg-amber-500/10',
                  border: 'border-amber-500/30',
                  text: 'text-amber-400',
                  hover: 'hover:bg-amber-500/20',
                  badge: 'bg-amber-600',
                },
                green: {
                  bg: 'bg-green-500/10',
                  border: 'border-green-500/30',
                  text: 'text-green-400',
                  hover: 'hover:bg-green-500/20',
                  badge: 'bg-green-600',
                },
                slate: {
                  bg: 'bg-slate-500/10',
                  border: 'border-slate-500/30',
                  text: 'text-slate-400',
                  hover: 'hover:bg-slate-500/20',
                  badge: 'bg-slate-600',
                },
              };
              const colorClasses = colorClassesMap[account.color];

              return (
                <motion.div
                  key={account.email}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                >
                  <Card
                    className={cn(
                      'border backdrop-blur transition-all cursor-pointer',
                      colorClasses.bg,
                      colorClasses.border,
                      colorClasses.hover
                    )}
                    onClick={() => handleDemoLogin(account.email, account.password)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={cn('h-8 w-8', colorClasses.text)} />
                        <Badge className={cn('text-white', colorClasses.badge)}>
                          {account.role}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg text-white">
                        {account.role}
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-sm">
                        {account.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-xs text-slate-500 font-mono">
                          {account.email}
                        </div>
                        <Button
                          className={cn(
                            'w-full text-white',
                            colorClasses.badge
                          )}
                          disabled={isLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDemoLogin(account.email, account.password);
                          }}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            `Login as ${account.role}`
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

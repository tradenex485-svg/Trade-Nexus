'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { approvalsApi } from '@/lib/api';
import { AlertsBell } from '@/components/alerts/alerts-bell';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { ThemeSyncer } from '@/components/theme/theme-initializer';
import { NewsTicker } from '@/components/news-ticker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Shield,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  Gauge,
  Building2,
  Building,
  Users,
  Eye,
  Scale,
  FileText as DocumentIcon,
  CreditCard,
  HelpCircle,
  Wallet,
  GitPullRequest,
  Calendar,
  GitMerge,
} from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

// Role-based navigation configuration
const getNavigationForRole = (role?: string) => {
  // Super Admin Navigation
  if (role === 'super_admin') {
    return {
      main: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Compliance Monitor', href: '/monitoring', icon: Eye },
        { name: 'Aggregation', href: '/aggregation', icon: GitMerge },
        { name: 'Exchanges', href: '/admin/exchanges', icon: Building2 },
        { name: 'Companies', href: '/admin/companies', icon: Building },
        { name: 'Position Limits', href: '/limits', icon: Activity },
        { name: 'Exemptions', href: '/exemptions', icon: Scale },
        { name: 'Risk Management', href: '/risk', icon: Shield },
        { name: 'Documents', href: '/documents', icon: DocumentIcon },
        { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
      ],
      secondary: [
        { name: 'Workflow Approvals', href: '/workflow-approvals', icon: GitPullRequest, hasBadge: true },
        { name: 'Calendar', href: '/calendar', icon: Calendar },
        { name: 'Financial', href: '/financial', icon: Wallet },
        { name: 'Support', href: '/support', icon: HelpCircle },
        { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
        { name: 'Reports', href: '/reports', icon: FileText },
        { name: 'Data Quality', href: '/data-quality', icon: Database },
        { name: 'Performance', href: '/performance', icon: Gauge },
        { name: 'Security', href: '/security', icon: Shield },
        { name: 'Settings', href: '/settings', icon: Settings },
      ],
    };
  }

  // Company Admin Navigation
  if (role === 'company_admin') {
    return {
      main: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Compliance Monitor', href: '/monitoring', icon: Eye },
        { name: 'Aggregation', href: '/aggregation', icon: GitMerge },
        { name: 'My Company', href: '/admin/companies', icon: Building },
        { name: 'Traders', href: '/admin/traders', icon: Users },
        { name: 'Position Limits', href: '/limits', icon: Activity },
        { name: 'Exemptions', href: '/exemptions', icon: Scale },
        { name: 'Pre-Trade Check', href: '/pre-trade', icon: Shield },
        { name: 'Approvals', href: '/approvals', icon: CheckCircle, hasBadge: true },
        { name: 'Documents', href: '/documents', icon: DocumentIcon },
      ],
      secondary: [
        { name: 'Workflow Approvals', href: '/workflow-approvals', icon: GitPullRequest, hasBadge: true },
        { name: 'Calendar', href: '/calendar', icon: Calendar },
        { name: 'Financial', href: '/financial', icon: Wallet },
        { name: 'Support', href: '/support', icon: HelpCircle },
        { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
        { name: 'Reports', href: '/reports', icon: FileText },
        { name: 'Risk Management', href: '/risk', icon: Shield },
        { name: 'Security', href: '/security', icon: Shield },
        { name: 'Settings', href: '/settings', icon: Settings },
      ],
    };
  }

  // Default Navigation (Trader and others)
  return {
    main: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Aggregation', href: '/aggregation', icon: GitMerge },
      { name: 'Position Limits', href: '/limits', icon: Activity },
      { name: 'Exemptions', href: '/exemptions', icon: Scale },
      { name: 'Pre-Trade Check', href: '/pre-trade', icon: Shield },
      { name: 'Approvals', href: '/approvals', icon: CheckCircle, hasBadge: true },
      { name: 'Risk Management', href: '/risk', icon: Shield },
      { name: 'Documents', href: '/documents', icon: DocumentIcon },
    ],
    secondary: [
      { name: 'Support', href: '/support', icon: HelpCircle },
      { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Data Quality', href: '/data-quality', icon: Database },
      { name: 'Performance', href: '/performance', icon: Gauge },
      { name: 'Security', href: '/security', icon: Shield },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  };
};

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout, _hasHydrated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Get navigation based on user role
  const navigation = getNavigationForRole(user?.role);
  const mainNavigation = navigation.main;
  const secondaryNavigation = navigation.secondary;

  // Load pending approvals count
  useEffect(() => {
    // Only proceed if user exists and has necessary data including token
    if (!user || !user.id || !token) {
      setPendingCount(0);
      return;
    }

    const loadPendingCount = async () => {
      try {
        const response = await approvalsApi.getPendingCount();
        setPendingCount(response.count || 0);
      } catch (error) {
        // Silently fail if not authenticated or API error
        setPendingCount(0);
      }
    };

    loadPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, [user, token]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Don't show layout on auth pages
  if (
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/forgot-password')
  ) {
    return <>{children}</>;
  }

  // Show loading state during initial hydration to prevent sidebar flash
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {children}
      </div>
    );
  }

  return (
    <>
      <ThemeSyncer />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 light:from-slate-50 light:via-slate-100 light:to-slate-50">
        {/* Mobile Overlay */}
        {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSidebarOpen(false);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-slate-900/95 backdrop-blur border-r border-slate-700 transition-all duration-300 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64',
          'w-64'
        )}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-slate-700">
          <Link href="/" prefetch={false} className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-500 flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-white font-bold text-xl">Trade Nexus</span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Main Navigation */}
          <div className="px-3 mb-6">
            {!sidebarCollapsed && (
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
                Main
              </p>
            )}
            <div className="space-y-1">
              {mainNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const showBadge = item.hasBadge && pendingCount > 0;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="flex-1">{item.name}</span>
                    )}
                    {!sidebarCollapsed && showBadge && (
                      <Badge className="bg-red-500 text-white text-xs">
                        {pendingCount}
                      </Badge>
                    )}
                    {sidebarCollapsed && showBadge && (
                      <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Secondary Navigation */}
          <div className="px-3">
            {!sidebarCollapsed && (
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
                Other
              </p>
            )}
            <div className="space-y-1">
              {secondaryNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Bottom Section - User & Logout */}
        {user && (
          <div className="p-3 border-t border-slate-700">
            <div className="space-y-1">
              <Link
                href="/profile"
                prefetch={false}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  pathname === '/profile'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
                title={sidebarCollapsed ? 'Profile' : undefined}
              >
                <User className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      {(user.role === 'super_admin' || user.role === 'company_admin') && (
                        <Badge className="text-xs bg-purple-600 text-white">
                          {user.role === 'super_admin' ? 'Admin' : 'Company'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                )}
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all"
                title={sidebarCollapsed ? 'Logout' : undefined}
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>Logout</span>}
              </button>
            </div>
          </div>
        )}

        {/* Collapse Toggle (Desktop Only) */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex items-center justify-center p-2 border-t border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </aside>

      {/* Main Content Area */}
      <div
        className={cn(
          'transition-all duration-300',
          'lg:ml-64',
          sidebarCollapsed && 'lg:ml-16'
        )}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-slate-900/95 backdrop-blur border-b border-slate-700">
          <div className="h-full px-4 flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-300 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Desktop Spacer */}
            <div className="hidden lg:block" />

            {/* Right Side - Alerts & Theme Toggle */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <AlertsBell />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)] pb-16">{children}</main>

        {/* News Ticker - Fixed at bottom */}
        {user && <NewsTicker />}
      </div>
    </div>
    </>
  );
}

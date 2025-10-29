import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { authRoutes } from './routes/auth';
import { samlRoutes } from './routes/saml';
import { oauthRoutes } from './routes/oauth';
import { usersRoutes, forgotPasswordRoute } from './routes/users';
import { positionLimitsRoutes } from './routes/position-limits';
import { marketLimitsRoutes } from './routes/market-limits';
import { transactionsRoutes } from './routes/transactions';
import { exemptionsRoutes} from './routes/exemptions';
import { alertsRoutes } from './routes/alerts';
import { reportsRoutes } from './routes/reports';
import { dataImportRoutes } from './routes/data-import';
import { csvImportRoutes } from './routes/csv-import';
import { mappingRoutes } from './routes/mapping';
import { monthlySchedulesRoutes } from './routes/monthly-schedules';
import { auditLogsRoutes } from './routes/audit-logs';
import { dashboardRoutes } from './routes/dashboard';
import { preTradeRoutes } from './routes/pre-trade';
import { riskThresholdsRoutes } from './routes/risk-thresholds';
import { tradeApprovalsRoutes } from './routes/trade-approvals';
import { riskScenariosRoutes } from './routes/risk-scenarios';
import { riskMetricsRoutes } from './routes/risk-metrics';
import { dataQualityRoutes } from './routes/data-quality';
import { exchangesRoutes } from './routes/exchanges';
import { companiesRoutes } from './routes/companies';
import { tradersRoutes } from './routes/traders';
import { monitoringRoutes } from './routes/monitoring';
import testEmailsRoutes from './routes/test-emails';
import regulatoryFilingsRoutes from './routes/regulatory-filings';
import aggregationRoutes from './routes/aggregation';
import apiKeysRoutes from './routes/api-keys';
import securityRoutes from './routes/security';
import documentsRoutes from './routes/documents';
import subscriptionsRoutes from './routes/subscriptions';
import supportRoutes from './routes/support';
import financialRoutes from './routes/financial';
import approvalsRoutes from './routes/approvals';
import bidWeekRoutes from './routes/bid-week';
import subsetReportsRoutes from './routes/subset-reports';
import exceptionsHandlingRoutes from './routes/exceptions-handling';
import auditTrailRoutes from './routes/audit-trail';
import preTradeValidationRoutes from './routes/pre-trade-validation';
import { scheduled } from './scheduled';
import { performanceMonitoring, getPerformanceStats } from './middleware/performance';
import { rateLimiter, RateLimitPresets, getRateLimitStats } from './middleware/rate-limiter';
import { companyScopingContext } from './middleware/company-scoping';
import { optionalAuth } from './middleware/auth';
import { securityHeaders } from './middleware/security-headers';

type Bindings = {
  DB: D1Database;
  CACHE: KVNamespace;
  DOCUMENTS: R2Bucket;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
  FRONTEND_URL?: string;
  SENTRY_DSN?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  DATABASE_ENCRYPTION_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());

// Security headers (OWASP best practices)
app.use('*', securityHeaders);

// CORS configuration - restrict to known domains
app.use('*', cors({
  origin: (origin) => {
    // Get allowed origins from environment
    const allowedOrigins = [
      'https://trade-nexus-frontend.pages.dev',
      'https://dev.trade-nexus-frontend.pages.dev', // Dev branch alias
      'http://localhost:5173', // Vite dev server
      'http://localhost:3000', // Alternative dev port
    ];

    // Allow if origin is in the list or if no origin (same-origin requests)
    if (!origin || allowedOrigins.includes(origin)) {
      return origin || allowedOrigins[0];
    }

    // Allow all Cloudflare Pages preview deployments for trade-nexus-frontend
    if (origin && origin.match(/^https:\/\/[a-f0-9]+\.trade-nexus-frontend\.pages\.dev$/)) {
      return origin;
    }

    // Default to first allowed origin for security
    return allowedOrigins[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposeHeaders: ['Content-Length', 'X-Request-Id', 'X-Response-Time', 'X-Query-Count', 'X-Cache-Hit', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
  credentials: true,
}));

// Performance monitoring (tracks all requests)
app.use('*', performanceMonitoring);

// Rate limiting for API routes
app.use('/api/*', rateLimiter(RateLimitPresets.standard));

// Company scoping context for all API routes (uses optionalAuth to get user if present)
app.use('/api/*', optionalAuth);
app.use('/api/*', companyScopingContext);

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'Trade Nexus API',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (c) => {
  try {
    // Test database connectivity
    const dbTest = await c.env.DB.prepare('SELECT 1 as test').first();

    // Get some basic stats
    const marketLimitsCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM market_limits'
    ).first();

    const calculationsCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM limit_calculations WHERE is_active = 1'
    ).first();

    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbTest?.test === 1,
        marketLimits: marketLimitsCount?.count || 0,
        activeCalculations: calculationsCount?.count || 0,
      },
      version: '1.0.0',
    });
  } catch (error: any) {
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    }, 500);
  }
});

// Performance monitoring endpoints
app.get('/api/performance/stats', async (c) => {
  const hours = parseInt(c.req.query('hours') || '24');
  const stats = await getPerformanceStats(c.env.DB, hours);
  return c.json(stats);
});

app.get('/api/performance/rate-limits', async (c) => {
  const hours = parseInt(c.req.query('hours') || '24');
  const stats = await getRateLimitStats(c.env.DB, hours);
  return c.json(stats);
});

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/auth/saml', samlRoutes);
app.route('/api/auth/oauth', oauthRoutes);
app.route('/api/auth', forgotPasswordRoute);
app.route('/api/users', usersRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/exchanges', exchangesRoutes);
app.route('/api/companies', companiesRoutes);
app.route('/api/traders', tradersRoutes);
app.route('/api/position-limits', positionLimitsRoutes);
app.route('/api/market-limits', marketLimitsRoutes);
app.route('/api/transactions', transactionsRoutes);
app.route('/api/exemptions', exemptionsRoutes);
app.route('/api/alerts', alertsRoutes);
app.route('/api/reports', reportsRoutes);
app.route('/api/data', dataImportRoutes);
app.route('/api/csv-import', csvImportRoutes);
app.route('/api/mapping', mappingRoutes);
app.route('/api/monthly-schedules', monthlySchedulesRoutes);
app.route('/api/audit-logs', auditLogsRoutes);
app.route('/api/pre-trade', preTradeRoutes);
app.route('/api/risk-thresholds', riskThresholdsRoutes);
app.route('/api/trade-approvals', tradeApprovalsRoutes);
app.route('/api/risk-scenarios', riskScenariosRoutes);
app.route('/api/risk-metrics', riskMetricsRoutes);
app.route('/api/data-quality', dataQualityRoutes);
app.route('/api/monitoring', monitoringRoutes);
app.route('/api/test-emails', testEmailsRoutes); // FOR TESTING ONLY
app.route('/api/regulatory-filings', regulatoryFilingsRoutes);
app.route('/api/aggregation', aggregationRoutes);
app.route('/api/api-keys', apiKeysRoutes);
app.route('/api/security', securityRoutes);
app.route('/api/documents', documentsRoutes);
app.route('/api/subscriptions', subscriptionsRoutes);
app.route('/api/support', supportRoutes);
app.route('/api/financial', financialRoutes);
app.route('/api/approvals', approvalsRoutes);
app.route('/api/bid-week', bidWeekRoutes);
app.route('/api/subset-reports', subsetReportsRoutes);
app.route('/api/exceptions-handling', exceptionsHandlingRoutes);
app.route('/api/audit-trail', auditTrailRoutes);
app.route('/api/pre-trade-validation', preTradeValidationRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
  }, 500);
});

// Export for Cloudflare Workers with scheduled handler
export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    // Validate security configuration on startup (will throw if invalid)
    try {
      const { validateSecurityConfig } = await import('./middleware/security-headers');
      validateSecurityConfig(env);
    } catch (error: any) {
      console.error('[SECURITY FATAL]', error.message);
      return new Response(
        JSON.stringify({
          error: 'Security configuration error',
          message: 'Application failed security validation',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return app.fetch(request, env, ctx);
  },
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    return scheduled(event, env, ctx);
  },
};

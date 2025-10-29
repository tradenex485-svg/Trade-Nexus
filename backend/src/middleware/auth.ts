/**
 * Authentication and Authorization Middleware
 */

import { Context, Next } from 'hono';
import { verifyToken, TokenPayload } from '../services/auth-service';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

// Extend Context to include user information
export interface AuthContext extends Context {
  user?: TokenPayload;
}

/**
 * Authentication middleware - verifies JWT token
 */
export async function authenticate(c: Context<{ Bindings: Bindings }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized - No token provided' }, 401);
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ success: false, error: 'Unauthorized - Invalid or expired token' }, 401);
  }

  // Check if user exists and is active
  const user = await c.env.DB.prepare(`
    SELECT id, email, role_id, company_id, is_active FROM users WHERE id = ?
  `).bind(payload.userId).first();

  if (!user || user.is_active !== 1) {
    return c.json({ success: false, error: 'Unauthorized - User inactive or not found' }, 401);
  }

  // Attach full user object to context (not just token payload)
  c.set('user', user);

  await next();
}

/**
 * Authorization middleware - checks if user has required permission
 */
export function authorize(...requiredPermissions: string[]) {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const user = c.get('user') as TokenPayload | undefined;

    if (!user) {
      return c.json({ success: false, error: 'Forbidden - No user context' }, 403);
    }

    // Get user's permissions
    const permissions = await c.env.DB.prepare(`
      SELECT p.permission_name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `).bind(user.roleId).all();

    const userPermissions = permissions.results.map((p: any) => p.permission_name);

    // Check if user has at least one of the required permissions
    const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      return c.json({
        success: false,
        error: 'Forbidden - Insufficient permissions',
        required: requiredPermissions,
        has: userPermissions
      }, 403);
    }

    await next();
  };
}

/**
 * Optional authentication - doesn't fail if no token, but attaches user if present
 */
export async function optionalAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = await verifyToken(token, c.env.JWT_SECRET);

    if (payload) {
      const user = await c.env.DB.prepare(`
        SELECT id, email, role_id, is_active FROM users WHERE id = ?
      `).bind(payload.userId).first();

      if (user && user.is_active === 1) {
        c.set('user', payload);
      }
    }
  }

  await next();
}

/**
 * Role-based middleware - checks if user has specific role
 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const user = c.get('user') as TokenPayload | undefined;

    if (!user) {
      return c.json({ success: false, error: 'Forbidden - No user context' }, 403);
    }

    // Get user's role
    const role = await c.env.DB.prepare(`
      SELECT role_name FROM roles WHERE id = ?
    `).bind(user.roleId).first();

    if (!role || !allowedRoles.includes(role.role_name as string)) {
      return c.json({
        success: false,
        error: 'Forbidden - Insufficient role',
        required: allowedRoles,
        has: role?.role_name
      }, 403);
    }

    await next();
  };
}

/**
 * Rate limiting middleware
 */
export async function rateLimit(c: Context<{ Bindings: Bindings }>, next: Next) {
  const user = c.get('user') as TokenPayload | undefined;
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const endpoint = c.req.path;

  const MAX_REQUESTS = 100;
  const WINDOW_MINUTES = 1;

  // Create identifier (user or IP)
  const identifier = user ? `user:${user.userId}` : `ip:${ip}`;

  // Get current window start
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
  const windowStartStr = windowStart.toISOString();

  // Check rate limit
  const existingLimit = await c.env.DB.prepare(`
    SELECT request_count FROM rate_limits
    WHERE (user_id = ? OR ip_address = ?)
    AND endpoint = ?
    AND window_start = ?
  `).bind(
    user?.userId || null,
    ip,
    endpoint,
    windowStartStr
  ).first();

  if (existingLimit) {
    const count = existingLimit.request_count as number;

    if (count >= MAX_REQUESTS) {
      return c.json({
        success: false,
        error: 'Rate limit exceeded',
        limit: MAX_REQUESTS,
        window: `${WINDOW_MINUTES} minute(s)`,
        retry_after: 60 - now.getSeconds()
      }, 429);
    }

    // Increment count
    await c.env.DB.prepare(`
      UPDATE rate_limits
      SET request_count = request_count + 1
      WHERE (user_id = ? OR ip_address = ?)
      AND endpoint = ?
      AND window_start = ?
    `).bind(
      user?.userId || null,
      ip,
      endpoint,
      windowStartStr
    ).run();
  } else {
    // Create new rate limit record
    await c.env.DB.prepare(`
      INSERT INTO rate_limits (user_id, ip_address, endpoint, request_count, window_start)
      VALUES (?, ?, ?, 1, ?)
    `).bind(
      user?.userId || null,
      ip,
      endpoint,
      windowStartStr
    ).run();
  }

  // Clean up old rate limit records (optional, can be done in scheduled job)
  const cutoff = new Date(now.getTime() - (WINDOW_MINUTES * 2 * 60 * 1000));
  await c.env.DB.prepare(`
    DELETE FROM rate_limits WHERE window_start < ?
  `).bind(cutoff.toISOString()).run();

  await next();
}

/**
 * Audit middleware - logs all authenticated actions
 */
export async function auditLog(c: Context<{ Bindings: Bindings }>, next: Next) {
  const user = c.get('user') as TokenPayload | undefined;
  const method = c.req.method;
  const path = c.req.path;

  // Only log mutating operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const ip = c.req.header('cf-connecting-ip') || 'unknown';

    console.log(`[AUDIT] User ${user?.userId || 'anonymous'} ${method} ${path} from ${ip}`);
  }

  await next();
}

// Alias for authenticate (for backward compatibility)
export const requireAuth = authenticate;

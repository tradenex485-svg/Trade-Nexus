/**
 * Security Headers Middleware
 * Implements OWASP security headers to protect against common attacks
 */

import { Context, Next } from 'hono';

/**
 * Security Headers Middleware
 * Adds comprehensive security headers to all responses
 */
export async function securityHeaders(c: Context, next: Next) {
  await next();

  // Prevent MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking attacks
  c.header('X-Frame-Options', 'DENY');

  // Enable browser XSS protection
  c.header('X-XSS-Protection', '1; mode=block');

  // Force HTTPS (Strict Transport Security)
  // max-age: 1 year, includeSubDomains: applies to all subdomains, preload: submit to browser preload list
  c.header(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Content Security Policy
  // Restricts sources for scripts, styles, images, etc. to prevent XSS
  const csp = [
    "default-src 'self'",
    "script-src 'self'", // Only allow scripts from same origin
    "style-src 'self' 'unsafe-inline'", // Allow inline styles for compatibility
    "img-src 'self' data: https:", // Allow images from same origin, data URIs, and HTTPS
    "font-src 'self' data:", // Allow fonts from same origin and data URIs
    "connect-src 'self' https://*.workers.dev", // API endpoints
    "frame-ancestors 'none'", // Prevent embedding in frames (same as X-Frame-Options: DENY)
    "base-uri 'self'", // Restrict base tag to same origin
    "form-action 'self'", // Only allow form submissions to same origin
    "upgrade-insecure-requests", // Automatically upgrade HTTP to HTTPS
  ].join('; ');

  c.header('Content-Security-Policy', csp);

  // Referrer Policy
  // Controls how much referrer information is included with requests
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (formerly Feature Policy)
  // Disable unnecessary browser features
  c.header(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
  );

  // Cross-Origin policies for additional security
  // Prevents other origins from reading the response
  c.header('Cross-Origin-Resource-Policy', 'same-origin');

  // Prevents other origins from embedding this resource
  c.header('Cross-Origin-Embedder-Policy', 'require-corp');

  // Isolates the browsing context from other origins
  c.header('Cross-Origin-Opener-Policy', 'same-origin');

  // Remove potentially leaky server information
  c.header('X-Powered-By', 'Trade Nexus');

  // Cache control for security-sensitive endpoints
  const path = c.req.path;
  if (
    path.includes('/auth/') ||
    path.includes('/api/users/') ||
    path.includes('/api/security/')
  ) {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
  }
}

/**
 * Validate critical security configuration on startup
 */
export function validateSecurityConfig(env: any): void {
  const errors: string[] = [];

  // Validate JWT secret
  if (!env.JWT_SECRET) {
    errors.push('JWT_SECRET environment variable is required');
  } else if (env.JWT_SECRET.length < 32) {
    errors.push(
      'JWT_SECRET must be at least 32 characters (256 bits) for security'
    );
  }

  // Validate database encryption key
  if (env.DATABASE_ENCRYPTION_KEY) {
    if (env.DATABASE_ENCRYPTION_KEY.length < 32) {
      errors.push('DATABASE_ENCRYPTION_KEY must be at least 32 characters');
    }
  }

  // Validate NODE_ENV
  if (!env.NODE_ENV) {
    console.warn(
      '[Security Warning] NODE_ENV is not set. Defaulting to production mode for security.'
    );
  }

  // Throw error if any critical validation fails
  if (errors.length > 0) {
    throw new Error(
      `Security configuration errors:\n${errors.map((e) => `- ${e}`).join('\n')}`
    );
  }

  // Log security configuration status
  console.log('[Security] Configuration validated successfully');
  console.log('[Security] JWT secret length:', env.JWT_SECRET?.length || 0);
  console.log('[Security] Encryption key configured:', !!env.DATABASE_ENCRYPTION_KEY);
  console.log('[Security] Environment:', env.NODE_ENV || 'production (default)');
}

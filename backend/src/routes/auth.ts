import { Hono } from 'hono';
import {
  hashPassword,
  verifyPassword,
  generateAuthTokens,
  verifyToken,
  generateResetToken,
  isAccountLocked,
  incrementFailedAttempts,
  resetFailedAttempts,
  User,
  TokenPayload
} from '../services/auth-service';
import { rateLimit } from '../middleware/auth';
import { validatePassword } from '../utils/password-validator';
import { sanitizeError, SecureLogger } from '../utils/error-handler';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

export const authRoutes = new Hono<{ Bindings: Bindings }>();

// Apply rate limiting to all auth routes
authRoutes.use('*', rateLimit);

/**
 * POST /api/auth/register
 * Register a new user
 */
authRoutes.post('/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    // Validation
    if (!email || !password || !name) {
      return c.json({
        success: false,
        error: 'Missing required fields: email, password, name'
      }, 400);
    }

    // Validate password strength (OWASP requirements)
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return c.json({
        success: false,
        error: passwordValidation.error
      }, 400);
    }

    // Check if user already exists
    const existingUser = await c.env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email).first();

    if (existingUser) {
      return c.json({
        success: false,
        error: 'User with this email already exists'
      }, 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Get default role (trader)
    const traderRole = await c.env.DB.prepare(`
      SELECT id FROM roles WHERE role_name = 'trader'
    `).first();

    // Create user
    const result = await c.env.DB.prepare(`
      INSERT INTO users (name, email, password, role_id, is_active, password_changed_at)
      VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    `).bind(name, email, hashedPassword, traderRole?.id || 3).run();

    const userId = result.meta.last_row_id;

    // Get full user record
    const newUser = await c.env.DB.prepare(`
      SELECT id, name, email, role_id, is_active FROM users WHERE id = ?
    `).bind(userId).first() as User;

    // Generate tokens
    const tokens = await generateAuthTokens(newUser, c.env.JWT_SECRET);

    // Store session
    await c.env.DB.prepare(`
      INSERT INTO sessions (user_id, token, refresh_token, expires_at)
      VALUES (?, ?, ?, datetime('now', '+1 hour'))
    `).bind(newUser.id, tokens.accessToken, tokens.refreshToken).run();

    return c.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role_id: newUser.role_id
      },
      token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    }, 201);

  } catch (error: any) {
    console.error('Registration error:', error);
    return c.json({
      success: false,
      error: 'Registration failed',
      message: error.message
    }, 500);
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
authRoutes.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({
        success: false,
        error: 'Missing required fields: email, password'
      }, 400);
    }

    // Get user
    const user = await c.env.DB.prepare(`
      SELECT id, name, email, password, role_id, is_active, locked_until, failed_login_attempts
      FROM users WHERE email = ?
    `).bind(email).first() as (User & { locked_until?: string | null; failed_login_attempts?: number }) | undefined;

    if (!user) {
      return c.json({
        success: false,
        error: 'Invalid email or password'
      }, 401);
    }

    // Check if account is active
    if (!user.is_active) {
      return c.json({
        success: false,
        error: 'Account is inactive. Please contact administrator.'
      }, 403);
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      return c.json({
        success: false,
        error: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
        locked_until: user.locked_until
      }, 403);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password!);

    if (!isValid) {
      // Increment failed attempts
      await incrementFailedAttempts(c.env.DB, user.id);

      return c.json({
        success: false,
        error: 'Invalid email or password'
      }, 401);
    }

    // Reset failed attempts
    await resetFailedAttempts(c.env.DB, user.id);

    // Get role information
    const role = await c.env.DB.prepare(`
      SELECT role_name FROM roles WHERE id = ?
    `).bind(user.role_id).first();

    // Get user permissions
    const permissions = await c.env.DB.prepare(`
      SELECT p.permission_name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `).bind(user.role_id).all();

    // Generate tokens
    const tokens = await generateAuthTokens(user, c.env.JWT_SECRET);

    // Store session
    const ip = c.req.header('cf-connecting-ip') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    await c.env.DB.prepare(`
      INSERT INTO sessions (user_id, token, refresh_token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '+1 hour'))
    `).bind(user.id, tokens.accessToken, tokens.refreshToken, ip, userAgent).run();

    return c.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role: role?.role_name,
        permissions: permissions.results.map((p: any) => p.permission_name)
      },
      token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return c.json({
      success: false,
      error: 'Login failed',
      message: error.message
    }, 500);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
authRoutes.post('/refresh', async (c) => {
  try {
    const { refreshToken } = await c.req.json();

    if (!refreshToken) {
      return c.json({
        success: false,
        error: 'Refresh token required'
      }, 400);
    }

    // Verify refresh token
    const payload = await verifyToken(refreshToken, c.env.JWT_SECRET);

    if (!payload) {
      return c.json({
        success: false,
        error: 'Invalid or expired refresh token'
      }, 401);
    }

    // Check if session exists
    const session = await c.env.DB.prepare(`
      SELECT id FROM sessions WHERE refresh_token = ? AND user_id = ?
    `).bind(refreshToken, payload.userId).first();

    if (!session) {
      return c.json({
        success: false,
        error: 'Session not found'
      }, 401);
    }

    // Get user
    const user = await c.env.DB.prepare(`
      SELECT id, name, email, role_id, is_active FROM users WHERE id = ?
    `).bind(payload.userId).first() as User;

    if (!user || !user.is_active) {
      return c.json({
        success: false,
        error: 'User not found or inactive'
      }, 401);
    }

    // Generate new tokens
    const tokens = await generateAuthTokens(user, c.env.JWT_SECRET);

    // Update session
    await c.env.DB.prepare(`
      UPDATE sessions
      SET token = ?, refresh_token = ?, expires_at = datetime('now', '+1 hour')
      WHERE id = ?
    `).bind(tokens.accessToken, tokens.refreshToken, session.id).run();

    return c.json({
      success: true,
      token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    });

  } catch (error: any) {
    console.error('Refresh token error:', error);
    return c.json({
      success: false,
      error: 'Token refresh failed',
      message: error.message
    }, 500);
  }
});

/**
 * POST /api/auth/logout
 * Logout and invalidate session
 */
authRoutes.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: true,
        message: 'Logged out successfully'
      });
    }

    const token = authHeader.substring(7);

    // Delete session
    await c.env.DB.prepare(`
      DELETE FROM sessions WHERE token = ?
    `).bind(token).run();

    return c.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error: any) {
    console.error('Logout error:', error);
    return c.json({
      success: false,
      error: 'Logout failed',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
authRoutes.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token, c.env.JWT_SECRET);

    if (!payload) {
      return c.json({
        success: false,
        error: 'Invalid or expired token'
      }, 401);
    }

    // Get user with role
    const user = await c.env.DB.prepare(`
      SELECT u.id, u.name, u.email, u.role_id, u.is_active, u.last_login_at,
             r.role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `).bind(payload.userId).first();

    if (!user) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404);
    }

    // Get user permissions
    const permissions = await c.env.DB.prepare(`
      SELECT p.permission_name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `).bind(user.role_id).all();

    return c.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role: user.role_name,
        permissions: permissions.results.map((p: any) => p.permission_name),
        last_login_at: user.last_login_at
      }
    });

  } catch (error: any) {
    console.error('Get user error:', error);
    return c.json({
      success: false,
      error: 'Failed to get user information',
      message: error.message
    }, 500);
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
authRoutes.post('/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({
        success: false,
        error: 'Email required'
      }, 400);
    }

    const user = await c.env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email).first();

    // Always return success to prevent email enumeration
    if (!user) {
      return c.json({
        success: true,
        message: 'If the email exists, a password reset link will be sent'
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

    await c.env.DB.prepare(`
      INSERT INTO password_resets (user_id, reset_token, expires_at)
      VALUES (?, ?, ?)
    `).bind(user.id, resetToken, expiresAt.toISOString()).run();

    // Send password reset email
    try {
      const { EmailService } = await import('../services/email-service');
      const emailService = new EmailService();
      await emailService.sendPasswordReset(email, resetToken, 60); // 60 minutes expiration
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't fail the request if email fails, just log it
    }

    // Log token for development testing (not in response)
    if (c.env.NODE_ENV === 'development') {
      SecureLogger.debug('[Development Only] Password reset token generated', { email, resetToken }, c.env);
    }

    return c.json({
      success: true,
      message: 'If the email exists, a password reset link will be sent'
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return c.json({
      success: false,
      error: 'Password reset request failed',
      message: error.message
    }, 500);
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
authRoutes.post('/reset-password', async (c) => {
  try {
    const { token, newPassword } = await c.req.json();

    if (!token || !newPassword) {
      return c.json({
        success: false,
        error: 'Token and new password required'
      }, 400);
    }

    // Validate password strength (OWASP requirements)
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return c.json({
        success: false,
        error: passwordValidation.error
      }, 400);
    }

    // Find valid reset token
    const resetRecord = await c.env.DB.prepare(`
      SELECT id, user_id, expires_at, used_at
      FROM password_resets
      WHERE reset_token = ?
    `).bind(token).first();

    if (!resetRecord) {
      return c.json({
        success: false,
        error: 'Invalid reset token'
      }, 400);
    }

    if (resetRecord.used_at) {
      return c.json({
        success: false,
        error: 'Reset token already used'
      }, 400);
    }

    const expiresAt = new Date(resetRecord.expires_at as string);
    if (expiresAt < new Date()) {
      return c.json({
        success: false,
        error: 'Reset token expired'
      }, 400);
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await c.env.DB.prepare(`
      UPDATE users
      SET password = ?, password_changed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(hashedPassword, resetRecord.user_id).run();

    // Mark token as used
    await c.env.DB.prepare(`
      UPDATE password_resets
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(resetRecord.id).run();

    // Invalidate all existing sessions
    await c.env.DB.prepare(`
      DELETE FROM sessions WHERE user_id = ?
    `).bind(resetRecord.user_id).run();

    return c.json({
      success: true,
      message: 'Password reset successful. Please login with your new password.'
    });

  } catch (error: any) {
    console.error('Reset password error:', error);
    return c.json({
      success: false,
      error: 'Password reset failed',
      message: error.message
    }, 500);
  }
});

/**
 * POST /api/auth/detect-auth-method
 * Detect authentication method based on email domain
 * Used by frontend to route to appropriate login method (password vs SSO)
 */
authRoutes.post('/detect-auth-method', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email || !email.includes('@')) {
      return c.json({
        success: false,
        error: 'Valid email required'
      }, 400);
    }

    const domain = email.split('@')[1].toLowerCase();

    // Lookup auth config by email domain
    const authConfig = await c.env.DB.prepare(`
      SELECT
        cac.*,
        c.id as company_id,
        c.company_name,
        c.company_code
      FROM company_auth_configs cac
      JOIN companies c ON c.id = cac.company_id
      WHERE cac.email_domains LIKE ?
        AND cac.is_active = 1
        AND cac.is_primary = 1
      ORDER BY cac.created_at DESC
      LIMIT 1
    `).bind(`%${domain}%`).first<any>();

    if (!authConfig) {
      // No SSO configured - use password auth
      return c.json({
        success: true,
        auth_method: 'password',
        provider_name: null,
        requires_password: true,
        message: 'Please enter your password',
      });
    }

    // SSO configured
    const response: any = {
      success: true,
      auth_method: authConfig.auth_method,
      provider_name: authConfig.provider_name,
      company: {
        id: authConfig.company_id,
        name: authConfig.company_name,
        code: authConfig.company_code,
      },
    };

    // Generate SSO login URL
    if (authConfig.auth_method === 'saml') {
      response.sso_login_url = `/api/auth/saml/login?email=${encodeURIComponent(email)}`;
      response.message = `Redirecting to ${authConfig.provider_name} SSO...`;
    } else if (authConfig.auth_method === 'oauth') {
      response.sso_login_url = `/api/auth/oauth/login?email=${encodeURIComponent(email)}`;
      response.message = `Redirecting to ${authConfig.provider_name} SSO...`;
    }

    return c.json(response);

  } catch (error: any) {
    console.error('Auth method detection error:', error);
    return c.json({
      success: false,
      error: 'Failed to detect auth method',
      message: error.message
    }, 500);
  }
});

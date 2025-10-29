import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { hashPassword, verifyPassword } from '../services/auth-service';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

export const usersRoutes = new Hono<{ Bindings: Bindings }>();

// All user routes require authentication
usersRoutes.use('*', requireAuth);

/**
 * GET /api/users/profile
 * Get current user profile
 */
usersRoutes.get('/profile', async (c) => {
  try {
    const user = c.get('user');

    const profile = await c.env.DB.prepare(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.trader_code,
        u.department,
        u.desk_name,
        u.company_id,
        u.role_id,
        u.is_active,
        u.is_primary,
        u.last_login,
        u.created_at,
        c.company_name,
        c.company_code,
        r.role_name,
        (
          SELECT GROUP_CONCAT(p.permission_name)
          FROM role_permissions rp
          JOIN permissions p ON rp.permission_id = p.id
          WHERE rp.role_id = u.role_id
        ) as permissions
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `).bind(user.userId).first();

    if (!profile) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json({
      success: true,
      user: {
        ...profile,
        role: profile.role_name,
        permissions: profile.permissions ? profile.permissions.split(',') : [],
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * PUT /api/users/profile
 * Update current user profile
 */
usersRoutes.put('/profile', async (c) => {
  try {
    const user = c.get('user');
    const { name, trader_code, department, desk_name } = await c.req.json();

    // Validation
    if (!name || name.trim().length === 0) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }

    // Update user profile
    await c.env.DB.prepare(`
      UPDATE users
      SET name = ?, trader_code = ?, department = ?, desk_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(name, trader_code || null, department || null, desk_name || null, user.userId).run();

    // Get updated profile
    const updatedProfile = await c.env.DB.prepare(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.trader_code,
        u.department,
        u.desk_name,
        u.company_id,
        u.role_id,
        c.company_name,
        r.role_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `).bind(user.userId).first();

    return c.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedProfile,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/users/settings
 * Get user settings and preferences
 */
usersRoutes.get('/settings', async (c) => {
  try {
    const user = c.get('user');

    // Get user settings (stored in user_settings table or default values)
    const settings = await c.env.DB.prepare(`
      SELECT
        notifications_enabled,
        email_alerts,
        position_alerts,
        breach_alerts,
        daily_summary,
        alert_email,
        data_retention_days,
        auto_import_enabled,
        theme
      FROM user_settings
      WHERE user_id = ?
    `).bind(user.userId).first();

    // If no settings exist, return defaults
    if (!settings) {
      const defaults = {
        notifications_enabled: 1,
        email_alerts: 1,
        position_alerts: 1,
        breach_alerts: 1,
        daily_summary: 0,
        alert_email: null,
        data_retention_days: 365,
        auto_import_enabled: 1,
        theme: 'dark',
      };

      // Create default settings
      await c.env.DB.prepare(`
        INSERT INTO user_settings (
          user_id, notifications_enabled, email_alerts, position_alerts,
          breach_alerts, daily_summary, data_retention_days, auto_import_enabled, theme
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        user.userId,
        defaults.notifications_enabled,
        defaults.email_alerts,
        defaults.position_alerts,
        defaults.breach_alerts,
        defaults.daily_summary,
        defaults.data_retention_days,
        defaults.auto_import_enabled,
        defaults.theme
      ).run();

      return c.json({ success: true, settings: defaults });
    }

    return c.json({ success: true, settings });
  } catch (error: any) {
    console.error('Get settings error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * PUT /api/users/settings
 * Update user settings and preferences
 */
usersRoutes.put('/settings', async (c) => {
  try {
    const user = c.get('user');
    const {
      notifications_enabled,
      email_alerts,
      position_alerts,
      breach_alerts,
      daily_summary,
      alert_email,
      data_retention_days,
      auto_import_enabled,
      theme,
    } = await c.req.json();

    // Check if settings exist
    const existing = await c.env.DB.prepare(`
      SELECT id FROM user_settings WHERE user_id = ?
    `).bind(user.userId).first();

    if (existing) {
      // Update existing settings
      await c.env.DB.prepare(`
        UPDATE user_settings
        SET
          notifications_enabled = COALESCE(?, notifications_enabled),
          email_alerts = COALESCE(?, email_alerts),
          position_alerts = COALESCE(?, position_alerts),
          breach_alerts = COALESCE(?, breach_alerts),
          daily_summary = COALESCE(?, daily_summary),
          alert_email = COALESCE(?, alert_email),
          data_retention_days = COALESCE(?, data_retention_days),
          auto_import_enabled = COALESCE(?, auto_import_enabled),
          theme = COALESCE(?, theme),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(
        notifications_enabled,
        email_alerts,
        position_alerts,
        breach_alerts,
        daily_summary,
        alert_email,
        data_retention_days,
        auto_import_enabled,
        theme,
        user.userId
      ).run();
    } else {
      // Create new settings
      await c.env.DB.prepare(`
        INSERT INTO user_settings (
          user_id, notifications_enabled, email_alerts, position_alerts,
          breach_alerts, daily_summary, alert_email, data_retention_days,
          auto_import_enabled, theme
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        user.userId,
        notifications_enabled ?? 1,
        email_alerts ?? 1,
        position_alerts ?? 1,
        breach_alerts ?? 1,
        daily_summary ?? 0,
        alert_email,
        data_retention_days ?? 365,
        auto_import_enabled ?? 1,
        theme ?? 'dark'
      ).run();
    }

    // Get updated settings
    const updatedSettings = await c.env.DB.prepare(`
      SELECT * FROM user_settings WHERE user_id = ?
    `).bind(user.userId).first();

    return c.json({
      success: true,
      message: 'Settings updated successfully',
      settings: updatedSettings,
    });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/users/change-password
 * Change user password
 */
usersRoutes.post('/change-password', async (c) => {
  try {
    const user = c.get('user');
    const { current_password, new_password } = await c.req.json();

    // Validation
    if (!current_password || !new_password) {
      return c.json({
        success: false,
        error: 'Current password and new password are required',
      }, 400);
    }

    if (new_password.length < 8) {
      return c.json({
        success: false,
        error: 'New password must be at least 8 characters long',
      }, 400);
    }

    // Get current user password
    const userRecord = await c.env.DB.prepare(`
      SELECT password FROM users WHERE id = ?
    `).bind(user.userId).first();

    if (!userRecord) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    // Verify current password
    const isValid = await verifyPassword(current_password, userRecord.password as string);
    if (!isValid) {
      return c.json({
        success: false,
        error: 'Current password is incorrect',
      }, 401);
    }

    // Hash new password
    const hashedPassword = await hashPassword(new_password);

    // Update password
    await c.env.DB.prepare(`
      UPDATE users
      SET password = ?, password_changed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(hashedPassword, user.userId).run();

    return c.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/users/forgot-password
 * Request password reset (public endpoint - no auth required)
 */
export const forgotPasswordRoute = new Hono<{ Bindings: Bindings }>();

forgotPasswordRoute.post('/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ success: false, error: 'Email is required' }, 400);
    }

    // Check if user exists
    const user = await c.env.DB.prepare(`
      SELECT id, email, name FROM users WHERE email = ? AND is_active = 1
    `).bind(email).first();

    // Always return success to prevent email enumeration
    if (!user) {
      return c.json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.',
      });
    }

    // Generate reset token (6-digit code valid for 1 hour)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    // Store reset token
    await c.env.DB.prepare(`
      INSERT INTO password_resets (user_id, reset_code, expires_at)
      VALUES (?, ?, ?)
    `).bind(user.id, resetCode, expiresAt).run();

    // Send password reset email
    try {
      const { EmailService } = await import('../services/email-service');
      const emailService = new EmailService();
      await emailService.sendPasswordReset(email, resetCode, 60); // 60 minutes expiration
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't fail the request if email fails, just log it
    }

    return c.json({
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent.',
      // In development, include the code
      ...(c.env.NODE_ENV === 'development' && { reset_code: resetCode }),
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/users/reset-password
 * Reset password with code (public endpoint)
 */
forgotPasswordRoute.post('/reset-password', async (c) => {
  try {
    const { email, reset_code, new_password } = await c.req.json();

    if (!email || !reset_code || !new_password) {
      return c.json({
        success: false,
        error: 'Email, reset code, and new password are required',
      }, 400);
    }

    if (new_password.length < 8) {
      return c.json({
        success: false,
        error: 'Password must be at least 8 characters long',
      }, 400);
    }

    // Find valid reset request
    const resetRequest = await c.env.DB.prepare(`
      SELECT pr.id, pr.user_id, u.email
      FROM password_resets pr
      JOIN users u ON pr.user_id = u.id
      WHERE u.email = ?
        AND pr.reset_code = ?
        AND pr.expires_at > datetime('now')
        AND pr.used_at IS NULL
      ORDER BY pr.created_at DESC
      LIMIT 1
    `).bind(email, reset_code).first();

    if (!resetRequest) {
      return c.json({
        success: false,
        error: 'Invalid or expired reset code',
      }, 400);
    }

    // Hash new password
    const hashedPassword = await hashPassword(new_password);

    // Update password
    await c.env.DB.prepare(`
      UPDATE users
      SET password = ?, password_changed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(hashedPassword, resetRequest.user_id).run();

    // Mark reset code as used
    await c.env.DB.prepare(`
      UPDATE password_resets
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(resetRequest.id).run();

    return c.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

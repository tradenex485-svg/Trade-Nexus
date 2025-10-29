/**
 * Security Logging Service
 * Comprehensive security event tracking for OWASP compliance
 */

interface SecurityEvent {
  type: string;
  userId?: number;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityAlert {
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, any>;
}

export class SecurityLogger {
  /**
   * Log a security event
   */
  static async log(db: D1Database, event: SecurityEvent): Promise<void> {
    try {
      await db
        .prepare(
          `
        INSERT INTO security_events (
          event_type, user_id, ip_address, user_agent, details, severity, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `
        )
        .bind(
          event.type,
          event.userId || null,
          event.ipAddress,
          event.userAgent,
          JSON.stringify(event.details || {}),
          event.severity
        )
        .run();

      console.log('[Security Event]', {
        type: event.type,
        severity: event.severity,
        userId: event.userId,
        ipAddress: event.ipAddress,
      });
    } catch (error: any) {
      console.error('[Security Logger Error]', error.message);
      // Don't throw - logging should never break the application
    }
  }

  /**
   * Log successful login
   */
  static async logLoginSuccess(
    db: D1Database,
    userId: number,
    email: string,
    ipAddress: string,
    userAgent: string,
    method: 'password' | 'saml' | 'oauth' = 'password'
  ): Promise<void> {
    await this.log(db, {
      type: 'login_success',
      userId,
      ipAddress,
      userAgent,
      details: { email, method },
      severity: 'low',
    });
  }

  /**
   * Log failed login attempt
   */
  static async logLoginFailed(
    db: D1Database,
    email: string,
    reason: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.log(db, {
      type: 'login_failed',
      ipAddress,
      userAgent,
      details: { email, reason },
      severity: 'medium',
    });

    // Check for suspicious patterns and potentially trigger alerts
    await this.checkLoginFailurePattern(db, ipAddress);
  }

  /**
   * Log account lockout
   */
  static async logAccountLockout(
    db: D1Database,
    userId: number,
    email: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.log(db, {
      type: 'account_lockout',
      userId,
      ipAddress,
      userAgent,
      details: { email },
      severity: 'high',
    });

    // Create alert for account lockout
    await this.createAlert(db, {
      title: 'Account Lockout',
      message: `Account ${email} has been locked due to multiple failed login attempts`,
      severity: 'high',
      details: { userId, email, ipAddress },
    });
  }

  /**
   * Log password change
   */
  static async logPasswordChanged(
    db: D1Database,
    userId: number,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.log(db, {
      type: 'password_changed',
      userId,
      ipAddress,
      userAgent,
      severity: 'medium',
    });
  }

  /**
   * Log SSO authentication
   */
  static async logSSOAuthentication(
    db: D1Database,
    userId: number,
    provider: string,
    method: 'saml' | 'oauth',
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.log(db, {
      type: 'sso_authentication',
      userId,
      ipAddress,
      userAgent,
      details: { provider, method },
      severity: 'low',
    });
  }

  /**
   * Log permission/role change
   */
  static async logRoleChanged(
    db: D1Database,
    targetUserId: number,
    adminUserId: number,
    oldRole: string,
    newRole: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.log(db, {
      type: 'role_changed',
      userId: adminUserId,
      ipAddress,
      userAgent,
      details: { targetUserId, oldRole, newRole },
      severity: 'high',
    });

    // Create alert for role changes
    await this.createAlert(db, {
      title: 'User Role Changed',
      message: `User ${targetUserId} role changed from ${oldRole} to ${newRole}`,
      severity: 'medium',
      details: { targetUserId, adminUserId, oldRole, newRole },
    });
  }

  /**
   * Log API key creation/revocation
   */
  static async logAPIKeyAction(
    db: D1Database,
    userId: number,
    action: 'created' | 'revoked',
    keyName: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.log(db, {
      type: `api_key_${action}`,
      userId,
      ipAddress,
      userAgent,
      details: { keyName },
      severity: 'medium',
    });
  }

  /**
   * Log rate limit violation
   */
  static async logRateLimitViolation(
    db: D1Database,
    userId: number | undefined,
    endpoint: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.log(db, {
      type: 'rate_limit_violation',
      userId,
      ipAddress,
      userAgent,
      details: { endpoint },
      severity: 'medium',
    });

    // Check for repeated rate limit violations
    await this.checkRateLimitPattern(db, ipAddress);
  }

  /**
   * Log unauthorized access attempt
   */
  static async logUnauthorizedAccess(
    db: D1Database,
    userId: number | undefined,
    resource: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.log(db, {
      type: 'unauthorized_access',
      userId,
      ipAddress,
      userAgent,
      details: { resource },
      severity: 'high',
    });
  }

  /**
   * Log data export/download
   */
  static async logDataExport(
    db: D1Database,
    userId: number,
    dataType: string,
    recordCount: number,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.log(db, {
      type: 'data_export',
      userId,
      ipAddress,
      userAgent,
      details: { dataType, recordCount },
      severity: 'medium',
    });
  }

  /**
   * Create security alert
   */
  private static async createAlert(
    db: D1Database,
    alert: SecurityAlert
  ): Promise<void> {
    try {
      await db
        .prepare(
          `
        INSERT INTO security_alerts (
          title, message, severity, details, status, created_at
        ) VALUES (?, ?, ?, ?, 'open', datetime('now'))
      `
        )
        .bind(
          alert.title,
          alert.message,
          alert.severity,
          JSON.stringify(alert.details || {})
        )
        .run();

      console.warn('[Security Alert]', {
        title: alert.title,
        severity: alert.severity,
      });
    } catch (error: any) {
      console.error('[Security Alert Error]', error.message);
    }
  }

  /**
   * Check for suspicious login failure patterns
   */
  private static async checkLoginFailurePattern(
    db: D1Database,
    ipAddress: string
  ): Promise<void> {
    try {
      const recentFailures = await db
        .prepare(
          `
        SELECT COUNT(*) as count
        FROM security_events
        WHERE event_type = 'login_failed'
          AND ip_address = ?
          AND created_at > datetime('now', '-15 minutes')
      `
        )
        .bind(ipAddress)
        .first<{ count: number }>();

      if (recentFailures && recentFailures.count >= 10) {
        await this.createAlert(db, {
          title: 'Multiple Failed Login Attempts',
          message: `IP ${ipAddress} has ${recentFailures.count} failed login attempts in the last 15 minutes`,
          severity: 'high',
          details: { ipAddress, failureCount: recentFailures.count },
        });
      }
    } catch (error: any) {
      console.error('[Login Pattern Check Error]', error.message);
    }
  }

  /**
   * Check for suspicious rate limit violation patterns
   */
  private static async checkRateLimitPattern(
    db: D1Database,
    ipAddress: string
  ): Promise<void> {
    try {
      const recentViolations = await db
        .prepare(
          `
        SELECT COUNT(*) as count
        FROM security_events
        WHERE event_type = 'rate_limit_violation'
          AND ip_address = ?
          AND created_at > datetime('now', '-1 hour')
      `
        )
        .bind(ipAddress)
        .first<{ count: number }>();

      if (recentViolations && recentViolations.count >= 5) {
        await this.createAlert(db, {
          title: 'Repeated Rate Limit Violations',
          message: `IP ${ipAddress} has ${recentViolations.count} rate limit violations in the last hour`,
          severity: 'medium',
          details: { ipAddress, violationCount: recentViolations.count },
        });
      }
    } catch (error: any) {
      console.error('[Rate Limit Pattern Check Error]', error.message);
    }
  }

  /**
   * Get recent security events (for dashboard/monitoring)
   */
  static async getRecentEvents(
    db: D1Database,
    hours: number = 24,
    limit: number = 100
  ): Promise<any[]> {
    const result = await db
      .prepare(
        `
      SELECT *
      FROM security_events
      WHERE created_at > datetime('now', '-${hours} hours')
      ORDER BY created_at DESC
      LIMIT ?
    `
      )
      .bind(limit)
      .all();

    return result.results || [];
  }

  /**
   * Get open security alerts
   */
  static async getOpenAlerts(db: D1Database, limit: number = 50): Promise<any[]> {
    const result = await db
      .prepare(
        `
      SELECT *
      FROM security_alerts
      WHERE status = 'open'
      ORDER BY severity DESC, created_at DESC
      LIMIT ?
    `
      )
      .bind(limit)
      .all();

    return result.results || [];
  }

  /**
   * Get security event statistics
   */
  static async getEventStats(
    db: D1Database,
    hours: number = 24
  ): Promise<Record<string, number>> {
    const result = await db
      .prepare(
        `
      SELECT event_type, COUNT(*) as count
      FROM security_events
      WHERE created_at > datetime('now', '-${hours} hours')
      GROUP BY event_type
      ORDER BY count DESC
    `
      )
      .all();

    const stats: Record<string, number> = {};
    for (const row of result.results || []) {
      stats[row.event_type as string] = row.count as number;
    }

    return stats;
  }
}

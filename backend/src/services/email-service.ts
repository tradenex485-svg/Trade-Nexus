/**
 * Email Service
 * Implements email notifications using MailChannels (free on Cloudflare Workers)
 */

import { Logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: {
    email: string;
    name: string;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

export class EmailService {
  private logger: Logger;
  private fromEmail: string;
  private fromName: string;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('EmailService');
    this.fromEmail = 'noreply@trade-nexus.com';
    this.fromName = 'Trade Nexus';
  }

  /**
   * Send an email using MailChannels API
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const from = options.from || {
        email: this.fromEmail,
        name: this.fromName,
      };

      const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: options.to }],
            },
          ],
          from: {
            email: from.email,
            name: from.name,
          },
          subject: options.subject,
          content: [
            {
              type: 'text/html',
              value: options.html,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Email send failed', new Error(errorText), {
          to: options.to,
          subject: options.subject,
          status: response.status,
        });
        return false;
      }

      this.logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
      });

      return true;
    } catch (error: any) {
      this.logger.error('Email send exception', error, {
        to: options.to,
        subject: options.subject,
      });
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, resetCode: string, expiresInMinutes: number = 15): Promise<boolean> {
    const template = this.getPasswordResetTemplate(resetCode, expiresInMinutes);

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Send position limit breach alert email
   */
  async sendPositionBreachAlert(
    email: string,
    breach: {
      commodity_code: string;
      market_location: string;
      pos_lots: number;
      limit_lots: number;
      utilization_pct: number;
      severity: string;
    }
  ): Promise<boolean> {
    const template = this.getPositionBreachAlertTemplate(breach);

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Send threshold warning email
   */
  async sendThresholdWarning(
    email: string,
    warning: {
      commodity_code: string;
      market_location: string;
      pos_lots: number;
      limit_lots: number;
      utilization_pct: number;
      threshold_pct: number;
    }
  ): Promise<boolean> {
    const template = this.getThresholdWarningTemplate(warning);

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email: string, name: string, temporaryPassword?: string): Promise<boolean> {
    const template = this.getWelcomeEmailTemplate(name, temporaryPassword);

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Send regulatory filing notification
   */
  async sendFilingNotification(
    email: string,
    filing: {
      filing_type: string;
      due_date: string;
      status: string;
    }
  ): Promise<boolean> {
    const template = this.getFilingNotificationTemplate(filing);

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Send daily compliance summary report
   */
  async sendDailySummary(
    email: string,
    summary: {
      report_date: string;
      total_positions: number;
      compliant_positions: number;
      warning_positions: number;
      breach_positions: number;
      avg_utilization: number;
      max_utilization: number;
      critical_items: Array<{
        commodity_code: string;
        market_location: string;
        utilization_pct: number;
        status: string;
      }>;
      new_breaches_today: number;
      resolved_breaches_today: number;
    }
  ): Promise<boolean> {
    const template = this.getDailySummaryTemplate(summary);

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Send immediate breach alert (wrapper for monitoring integration)
   */
  async sendBreachAlert(
    recipients: string[],
    breach: {
      commodity_code: string;
      market_location: string;
      pos_lots: number;
      limit_lots: number;
      utilization_pct: number;
      severity: 'critical' | 'high';
      contract_month?: string;
      prioritization?: string;
    }
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        const success = await this.sendPositionBreachAlert(recipient, breach);
        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        this.logger.error('Breach alert send failed', error as Error, { recipient });
      }
    }

    return { sent, failed };
  }

  /**
   * Send weekly compliance digest
   */
  async sendWeeklyDigest(
    email: string,
    digest: {
      week_start: string;
      week_end: string;
      total_positions: number;
      avg_utilization_week: number;
      peak_utilization_week: number;
      total_breaches_week: number;
      total_warnings_week: number;
      new_breaches: number;
      resolved_breaches: number;
      trending_up: Array<{
        commodity_code: string;
        market_location: string;
        current_utilization: number;
        previous_utilization: number;
        change_pct: number;
      }>;
      trending_down: Array<{
        commodity_code: string;
        market_location: string;
        current_utilization: number;
        previous_utilization: number;
        change_pct: number;
      }>;
      top_breaches: Array<{
        commodity_code: string;
        market_location: string;
        utilization_pct: number;
        days_breached: number;
      }>;
    }
  ): Promise<boolean> {
    const template = this.getWeeklyDigestTemplate(digest);

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });
  }

  // ============================================================================
  // Email Templates
  // ============================================================================

  private getPasswordResetTemplate(resetCode: string, expiresInMinutes: number): EmailTemplate {
    return {
      subject: 'Password Reset Request - Trade Nexus',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .code {
              background-color: #fff;
              border: 2px solid #1e40af;
              padding: 15px;
              font-size: 24px;
              font-weight: bold;
              text-align: center;
              letter-spacing: 5px;
              margin: 20px 0;
            }
            .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>You have requested to reset your password for your Trade Nexus account.</p>

              <p>Your password reset code is:</p>
              <div class="code">${resetCode}</div>

              <p>Enter this code on the password reset page to create a new password.</p>

              <p class="warning">
                ⚠️ This code will expire in ${expiresInMinutes} minutes.<br>
                If you did not request a password reset, please ignore this email or contact support if you have concerns.
              </p>
            </div>
            <div class="footer">
              <p>Trade Nexus Position Limit Monitoring<br>
              © ${new Date().getFullYear()} All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }

  private getPositionBreachAlertTemplate(breach: any): EmailTemplate {
    const severityColor = breach.severity === 'critical' ? '#dc2626' : '#f59e0b';

    return {
      subject: `🚨 URGENT: Position Limit Breach - ${breach.commodity_code}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${severityColor}; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .alert-box { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
            .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .data-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .data-table td:first-child { font-weight: bold; width: 40%; }
            .action-required {
              background-color: #dc2626;
              color: white;
              padding: 15px;
              text-align: center;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ POSITION LIMIT BREACH ALERT</h1>
            </div>
            <div class="content">
              <div class="alert-box">
                <strong>IMMEDIATE ACTION REQUIRED</strong><br>
                A position limit breach has been detected in your trading portfolio.
              </div>

              <table class="data-table">
                <tr>
                  <td>Commodity:</td>
                  <td><strong>${breach.commodity_code}</strong></td>
                </tr>
                <tr>
                  <td>Market Location:</td>
                  <td>${breach.market_location}</td>
                </tr>
                <tr>
                  <td>Current Position:</td>
                  <td>${breach.pos_lots.toFixed(2)} lots</td>
                </tr>
                <tr>
                  <td>Position Limit:</td>
                  <td>${breach.limit_lots.toFixed(2)} lots</td>
                </tr>
                <tr>
                  <td>Utilization:</td>
                  <td><strong style="color: ${severityColor}">${breach.utilization_pct.toFixed(2)}%</strong></td>
                </tr>
                <tr>
                  <td>Severity:</td>
                  <td><strong style="color: ${severityColor}">${breach.severity.toUpperCase()}</strong></td>
                </tr>
              </table>

              <div class="action-required">
                IMMEDIATE ACTION REQUIRED
              </div>

              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Log in to Trade Nexus immediately to review the position</li>
                <li>Reduce position or request an exemption</li>
                <li>Document remediation actions</li>
                <li>Ensure compliance within required timeframe</li>
              </ol>

              <p>For questions or assistance, contact your compliance team or support@trade-nexus.com</p>
            </div>
            <div class="footer">
              <p>Trade Nexus Position Limit Monitoring<br>
              This is an automated alert. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }

  private getThresholdWarningTemplate(warning: any): EmailTemplate {
    return {
      subject: `⚠️ Warning: Position Approaching Limit - ${warning.commodity_code}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .warning-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .data-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .data-table td:first-child { font-weight: bold; width: 40%; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ POSITION THRESHOLD WARNING</h1>
            </div>
            <div class="content">
              <div class="warning-box">
                A position is approaching your defined threshold limit.
              </div>

              <table class="data-table">
                <tr>
                  <td>Commodity:</td>
                  <td><strong>${warning.commodity_code}</strong></td>
                </tr>
                <tr>
                  <td>Market Location:</td>
                  <td>${warning.market_location}</td>
                </tr>
                <tr>
                  <td>Current Position:</td>
                  <td>${warning.pos_lots.toFixed(2)} lots</td>
                </tr>
                <tr>
                  <td>Position Limit:</td>
                  <td>${warning.limit_lots.toFixed(2)} lots</td>
                </tr>
                <tr>
                  <td>Utilization:</td>
                  <td><strong style="color: #f59e0b">${warning.utilization_pct.toFixed(2)}%</strong></td>
                </tr>
                <tr>
                  <td>Alert Threshold:</td>
                  <td>${warning.threshold_pct}%</td>
                </tr>
              </table>

              <p><strong>Recommended Actions:</strong></p>
              <ul>
                <li>Monitor position closely</li>
                <li>Review trading strategy</li>
                <li>Prepare contingency plans if position continues to grow</li>
                <li>Consider pre-trade validation for new trades in this commodity</li>
              </ul>
            </div>
            <div class="footer">
              <p>Trade Nexus Position Limit Monitoring<br>
              © ${new Date().getFullYear()} All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }

  private getWelcomeEmailTemplate(name: string, temporaryPassword?: string): EmailTemplate {
    return {
      subject: 'Welcome to Trade Nexus',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Trade Nexus</h1>
            </div>
            <div class="content">
              <p>Hello ${name},</p>

              <p>Your Trade Nexus account has been created successfully!</p>

              ${temporaryPassword ? `
                <p>Your temporary password is: <strong>${temporaryPassword}</strong></p>
                <p>Please log in and change your password immediately.</p>
              ` : ''}

              <p>Trade Nexus provides comprehensive position limit monitoring and compliance management for commodity trading operations.</p>

              <p>If you have any questions, please contact support@trade-nexus.com</p>
            </div>
            <div class="footer">
              <p>Trade Nexus Position Limit Monitoring<br>
              © ${new Date().getFullYear()} All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }

  private getFilingNotificationTemplate(filing: any): EmailTemplate {
    return {
      subject: `Regulatory Filing ${filing.status}: ${filing.filing_type}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Regulatory Filing Notification</h1>
            </div>
            <div class="content">
              <p>A regulatory filing has been updated:</p>

              <p><strong>Filing Type:</strong> ${filing.filing_type}</p>
              <p><strong>Status:</strong> ${filing.status.toUpperCase()}</p>
              <p><strong>Due Date:</strong> ${filing.due_date}</p>

              <p>Please log in to Trade Nexus to review the filing details.</p>
            </div>
            <div class="footer">
              <p>Trade Nexus Position Limit Monitoring<br>
              © ${new Date().getFullYear()} All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }

  private getDailySummaryTemplate(summary: any): EmailTemplate {
    const complianceRate = summary.total_positions > 0
      ? ((summary.compliant_positions / summary.total_positions) * 100).toFixed(1)
      : '100.0';

    const statusColor = summary.breach_positions > 0 ? '#dc2626' : summary.warning_positions > 0 ? '#f59e0b' : '#10b981';

    return {
      subject: `Daily Compliance Summary - ${summary.report_date}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
            .stat-card { background-color: white; padding: 15px; border-radius: 8px; border-left: 4px solid #1e40af; }
            .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
            .stat-value { font-size: 24px; font-weight: bold; color: #1e40af; }
            .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .compliant { background-color: #d1fae5; color: #065f46; }
            .warning { background-color: #fef3c7; color: #92400e; }
            .breach { background-color: #fee2e2; color: #991b1b; }
            .critical-items { margin: 20px 0; }
            .critical-item { background-color: white; padding: 12px; margin-bottom: 10px; border-radius: 6px; border-left: 4px solid ${statusColor}; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Daily Compliance Summary</h1>
              <p style="margin: 0; font-size: 16px;">${summary.report_date}</p>
            </div>
            <div class="content">
              <h2 style="color: #1e40af; margin-top: 0;">Position Limit Summary</h2>

              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-label">Total Positions</div>
                  <div class="stat-value">${summary.total_positions}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Compliance Rate</div>
                  <div class="stat-value" style="color: ${statusColor};">${complianceRate}%</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Average Utilization</div>
                  <div class="stat-value">${summary.avg_utilization.toFixed(1)}%</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Max Utilization</div>
                  <div class="stat-value">${summary.max_utilization.toFixed(1)}%</div>
                </div>
              </div>

              <h3>Position Status Breakdown</h3>
              <p>
                <span class="status-badge compliant">${summary.compliant_positions} Compliant</span>
                <span class="status-badge warning">${summary.warning_positions} Warning</span>
                <span class="status-badge breach">${summary.breach_positions} Breach</span>
              </p>

              <h3>Daily Activity</h3>
              <ul>
                <li><strong>New Breaches:</strong> ${summary.new_breaches_today}</li>
                <li><strong>Resolved Breaches:</strong> ${summary.resolved_breaches_today}</li>
              </ul>

              ${summary.critical_items && summary.critical_items.length > 0 ? `
                <h3 style="color: #dc2626;">⚠️ Critical Attention Required</h3>
                <div class="critical-items">
                  ${summary.critical_items.map((item: any) => `
                    <div class="critical-item">
                      <strong>${item.commodity_code}</strong> at ${item.market_location}<br>
                      <small>Utilization: ${item.utilization_pct.toFixed(1)}% - Status: ${item.status}</small>
                    </div>
                  `).join('')}
                </div>
              ` : '<p>✅ No critical items requiring immediate attention.</p>'}

              <p style="margin-top: 30px; padding: 15px; background-color: #e0e7ff; border-radius: 6px;">
                <strong>Action Required:</strong> Please log in to Trade Nexus to review detailed position reports and take necessary compliance actions.
              </p>
            </div>
            <div class="footer">
              <p>Trade Nexus Position Limit Monitoring<br>
              © ${new Date().getFullYear()} All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }

  private getWeeklyDigestTemplate(digest: any): EmailTemplate {
    const complianceRate = digest.total_positions > 0
      ? (((digest.total_positions - digest.total_breaches_week) / digest.total_positions) * 100).toFixed(1)
      : '100.0';

    const statusColor = digest.total_breaches_week > 0 ? '#dc2626' : digest.total_warnings_week > 0 ? '#f59e0b' : '#10b981';

    return {
      subject: `📈 Weekly Compliance Digest - ${digest.week_start} to ${digest.week_end}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6366f1; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
            .stat-card { background-color: white; padding: 15px; border-radius: 8px; border-left: 4px solid #6366f1; }
            .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
            .stat-value { font-size: 24px; font-weight: bold; color: #6366f1; }
            .trend-section { background-color: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
            .trend-item { padding: 10px; margin: 8px 0; border-radius: 4px; }
            .trend-up { background-color: #fee2e2; border-left: 3px solid #dc2626; }
            .trend-down { background-color: #d1fae5; border-left: 3px solid #10b981; }
            .breach-item { background-color: #fee2e2; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 4px solid #dc2626; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
            .arrow-up { color: #dc2626; font-weight: bold; }
            .arrow-down { color: #10b981; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📈 Weekly Compliance Digest</h1>
              <p style="margin: 0; font-size: 16px;">${digest.week_start} to ${digest.week_end}</p>
            </div>
            <div class="content">
              <h2 style="color: #6366f1; margin-top: 0;">Week in Review</h2>

              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-label">Monitored Positions</div>
                  <div class="stat-value">${digest.total_positions}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Weekly Compliance</div>
                  <div class="stat-value" style="color: ${statusColor};">${complianceRate}%</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Avg Utilization</div>
                  <div class="stat-value">${digest.avg_utilization_week.toFixed(1)}%</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Peak Utilization</div>
                  <div class="stat-value">${digest.peak_utilization_week.toFixed(1)}%</div>
                </div>
              </div>

              <h3>Weekly Activity Summary</h3>
              <ul>
                <li><strong>Total Breaches This Week:</strong> <span style="color: #dc2626;">${digest.total_breaches_week}</span></li>
                <li><strong>Total Warnings This Week:</strong> <span style="color: #f59e0b;">${digest.total_warnings_week}</span></li>
                <li><strong>New Breaches:</strong> ${digest.new_breaches}</li>
                <li><strong>Resolved Breaches:</strong> <span style="color: #10b981;">${digest.resolved_breaches}</span></li>
              </ul>

              ${digest.trending_up && digest.trending_up.length > 0 ? `
                <div class="trend-section">
                  <h3 style="color: #dc2626; margin-top: 0;">📈 Positions Trending Up (Risk Increasing)</h3>
                  ${digest.trending_up.map((item: any) => `
                    <div class="trend-item trend-up">
                      <strong>${item.commodity_code}</strong> at ${item.market_location}<br>
                      <small>
                        ${item.previous_utilization.toFixed(1)}% → ${item.current_utilization.toFixed(1)}%
                        <span class="arrow-up">↑ ${Math.abs(item.change_pct).toFixed(1)}%</span>
                      </small>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${digest.trending_down && digest.trending_down.length > 0 ? `
                <div class="trend-section">
                  <h3 style="color: #10b981; margin-top: 0;">📉 Positions Trending Down (Risk Decreasing)</h3>
                  ${digest.trending_down.map((item: any) => `
                    <div class="trend-item trend-down">
                      <strong>${item.commodity_code}</strong> at ${item.market_location}<br>
                      <small>
                        ${item.previous_utilization.toFixed(1)}% → ${item.current_utilization.toFixed(1)}%
                        <span class="arrow-down">↓ ${Math.abs(item.change_pct).toFixed(1)}%</span>
                      </small>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${digest.top_breaches && digest.top_breaches.length > 0 ? `
                <div class="trend-section">
                  <h3 style="color: #dc2626; margin-top: 0;">🚨 Persistent Breaches</h3>
                  ${digest.top_breaches.map((item: any) => `
                    <div class="breach-item">
                      <strong>${item.commodity_code}</strong> at ${item.market_location}<br>
                      <small>
                        Utilization: <strong>${item.utilization_pct.toFixed(1)}%</strong> |
                        Days Breached: <strong>${item.days_breached}</strong>
                      </small>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${digest.total_breaches_week === 0 && digest.total_warnings_week === 0 ? `
                <p style="padding: 20px; background-color: #d1fae5; border-radius: 6px; text-align: center;">
                  <strong style="color: #065f46;">✅ Excellent Week!</strong><br>
                  No breaches or warnings this week. All positions are compliant.
                </p>
              ` : ''}

              <p style="margin-top: 30px; padding: 15px; background-color: #e0e7ff; border-radius: 6px;">
                <strong>Weekly Review:</strong> Log in to Trade Nexus to view detailed weekly trends and generate custom compliance reports.
              </p>
            </div>
            <div class="footer">
              <p>Trade Nexus Position Limit Monitoring<br>
              This is your weekly automated digest<br>
              © ${new Date().getFullYear()} All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }
}

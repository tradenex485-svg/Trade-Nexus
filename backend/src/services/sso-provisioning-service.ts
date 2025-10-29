/**
 * SSO Provisioning Service
 * Handles Just-In-Time (JIT) user provisioning and account linking
 * Cloudflare Workers compatible
 */

import type { SAMLUserProfile } from './saml-service';
import type { OAuthUserProfile } from './oauth-service';

export interface AuthConfig {
  company_id: number;
  company_name: string;
  auth_method: 'saml' | 'oauth' | 'ldap';
  provider_name: string;
  jit_provisioning_enabled: number;
  default_role_id: number;
  require_admin_approval: number;
}

export interface ProvisionedUser {
  id: number;
  name: string;
  email: string;
  role_id: number;
  company_id: number;
  auth_method: string;
  sso_provider: string;
  external_id: string;
  is_new_user: boolean;
}

/**
 * SSO Provisioning Service
 * Handles user creation and linking for SSO authentication
 */
export class SSOProvisioningService {
  constructor(private db: D1Database) {}

  /**
   * Provision user from SAML authentication
   */
  async provisionFromSAML(
    profile: SAMLUserProfile,
    authConfig: AuthConfig
  ): Promise<ProvisionedUser> {
    return await this.provisionUser({
      email: profile.email,
      externalId: profile.nameId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayName,
      metadata: profile.attributes,
      authConfig,
    });
  }

  /**
   * Provision user from OAuth authentication
   */
  async provisionFromOAuth(
    profile: OAuthUserProfile,
    authConfig: AuthConfig
  ): Promise<ProvisionedUser> {
    return await this.provisionUser({
      email: profile.email,
      externalId: profile.sub,
      firstName: profile.given_name,
      lastName: profile.family_name,
      displayName: profile.name,
      metadata: profile,
      authConfig,
    });
  }

  /**
   * Core provisioning logic
   */
  private async provisionUser(params: {
    email: string;
    externalId: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    metadata: any;
    authConfig: AuthConfig;
  }): Promise<ProvisionedUser> {
    const { email, externalId, firstName, lastName, displayName, metadata, authConfig } = params;

    // Check if user already exists
    const existingUser = await this.findExistingUser(email, authConfig.company_id);

    if (existingUser) {
      // User exists - update SSO metadata and return
      return await this.linkSSOToExistingUser(existingUser, {
        externalId,
        metadata,
        authConfig,
      });
    }

    // User doesn't exist
    if (!authConfig.jit_provisioning_enabled) {
      throw new Error(
        `User ${email} does not exist and Just-In-Time provisioning is disabled for ${authConfig.company_name}`
      );
    }

    // Create new user via JIT provisioning
    return await this.createNewUser({
      email,
      externalId,
      firstName,
      lastName,
      displayName,
      metadata,
      authConfig,
    });
  }

  /**
   * Find existing user by email and company
   */
  private async findExistingUser(email: string, companyId: number): Promise<any> {
    const user = await this.db
      .prepare(
        `
      SELECT * FROM users
      WHERE email = ? AND company_id = ?
    `
      )
      .bind(email, companyId)
      .first();

    return user;
  }

  /**
   * Link SSO to existing user account
   */
  private async linkSSOToExistingUser(
    user: any,
    params: {
      externalId: string;
      metadata: any;
      authConfig: AuthConfig;
    }
  ): Promise<ProvisionedUser> {
    const { externalId, metadata, authConfig } = params;

    // Update user with SSO information
    await this.db
      .prepare(
        `
      UPDATE users
      SET auth_method = ?,
          sso_provider = ?,
          external_id = ?,
          external_email = ?,
          last_sso_login = datetime('now'),
          sso_metadata = ?,
          sso_linked_at = CASE WHEN sso_linked_at IS NULL THEN datetime('now') ELSE sso_linked_at END,
          updated_at = datetime('now')
      WHERE id = ?
    `
      )
      .bind(
        authConfig.auth_method,
        authConfig.provider_name,
        externalId,
        user.email,
        JSON.stringify(metadata),
        user.id
      )
      .run();

    // Log SSO linking event
    await this.logAuditEvent('SSO_ACCOUNT_LINKED', user.id, {
      email: user.email,
      provider: authConfig.provider_name,
      auth_method: authConfig.auth_method,
      company_id: authConfig.company_id,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      company_id: user.company_id,
      auth_method: authConfig.auth_method,
      sso_provider: authConfig.provider_name,
      external_id: externalId,
      is_new_user: false,
    };
  }

  /**
   * Create new user via JIT provisioning
   */
  private async createNewUser(params: {
    email: string;
    externalId: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    metadata: any;
    authConfig: AuthConfig;
  }): Promise<ProvisionedUser> {
    const { email, externalId, firstName, lastName, displayName, metadata, authConfig } = params;

    // Generate user name
    const name = this.generateUserName(firstName, lastName, displayName, email);

    // Determine if user needs admin approval
    const isActive = authConfig.require_admin_approval ? 0 : 1;

    // Create user
    const result = await this.db
      .prepare(
        `
      INSERT INTO users (
        name, email, company_id, role_id,
        auth_method, sso_provider, external_id, external_email,
        is_active, sso_metadata, last_sso_login, sso_linked_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))
    `
      )
      .bind(
        name,
        email,
        authConfig.company_id,
        authConfig.default_role_id || 3, // Default to trader role
        authConfig.auth_method,
        authConfig.provider_name,
        externalId,
        email,
        isActive,
        JSON.stringify(metadata)
      )
      .run();

    const userId = result.meta.last_row_id as number;

    // Log JIT user creation
    await this.logAuditEvent('JIT_USER_CREATED', userId, {
      email,
      provider: authConfig.provider_name,
      auth_method: authConfig.auth_method,
      company_id: authConfig.company_id,
      requires_approval: authConfig.require_admin_approval === 1,
    });

    // Send welcome email (if email service is configured)
    await this.sendWelcomeEmail(email, name, authConfig.company_name, isActive === 1);

    return {
      id: userId,
      name,
      email,
      role_id: authConfig.default_role_id || 3,
      company_id: authConfig.company_id,
      auth_method: authConfig.auth_method,
      sso_provider: authConfig.provider_name,
      external_id: externalId,
      is_new_user: true,
    };
  }

  /**
   * Generate user display name
   */
  private generateUserName(
    firstName?: string,
    lastName?: string,
    displayName?: string,
    email?: string
  ): string {
    if (displayName) {
      return displayName;
    }

    if (firstName && lastName) {
      return `${firstName} ${lastName}`.trim();
    }

    if (firstName) {
      return firstName;
    }

    if (email) {
      return email.split('@')[0];
    }

    return 'SSO User';
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(action: string, userId: number, details: any): Promise<void> {
    try {
      await this.db
        .prepare(
          `
        INSERT INTO audit_logs (action, resource, resource_id, details, created_at)
        VALUES (?, 'users', ?, ?, datetime('now'))
      `
        )
        .bind(action, userId, JSON.stringify(details))
        .run();
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - logging failure shouldn't break authentication
    }
  }

  /**
   * Send welcome email to new user
   * TODO: Implement email service integration
   */
  private async sendWelcomeEmail(
    email: string,
    name: string,
    companyName: string,
    isActive: boolean
  ): Promise<void> {
    try {
      // Email service integration would go here
      console.log(`Welcome email would be sent to ${email}`);

      if (!isActive) {
        console.log(`User ${email} requires admin approval before accessing the system`);
      }
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw - email failure shouldn't break authentication
    }
  }

  /**
   * Check if email domain is authorized for company
   */
  static isEmailDomainAuthorized(email: string, authorizedDomains: string): boolean {
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (!emailDomain) {
      return false;
    }

    const domains = authorizedDomains.split(',').map((d) => d.trim().toLowerCase());
    return domains.includes(emailDomain);
  }

  /**
   * Validate user provisioning eligibility
   */
  static validateProvisioningEligibility(
    email: string,
    authConfig: AuthConfig
  ): { eligible: boolean; reason?: string } {
    // Check if email domain matches
    if (authConfig.company_id && authConfig.email_domains) {
      const isAuthorized = this.isEmailDomainAuthorized(email, authConfig.email_domains);
      if (!isAuthorized) {
        return {
          eligible: false,
          reason: `Email domain not authorized for ${authConfig.company_name}`,
        };
      }
    }

    // Check if JIT provisioning is enabled
    if (!authConfig.jit_provisioning_enabled) {
      return {
        eligible: false,
        reason: 'Just-In-Time provisioning is disabled',
      };
    }

    return { eligible: true };
  }
}

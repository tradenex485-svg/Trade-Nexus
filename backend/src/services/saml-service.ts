/**
 * SAML Service
 * Handles SAML 2.0 authentication flow
 * Uses samlify library - compatible with Cloudflare Workers
 */

import * as saml from 'samlify';

export interface SAMLConfig {
  companyId: number;
  entityId: string;
  ssoUrl: string;
  sloUrl?: string;
  certificate: string;
  nameIdFormat?: string;
  callbackUrl: string;
}

export interface SAMLUserProfile {
  nameId: string;
  sessionIndex?: string;
  attributes: Record<string, any>;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

/**
 * SAML Service for handling SAML 2.0 authentication
 * Cloudflare Workers compatible
 */
export class SAMLService {
  private serviceProvider: any;
  private identityProvider: any;
  private config: SAMLConfig;

  constructor(config: SAMLConfig) {
    this.config = config;
    this.initializeProviders();
  }

  /**
   * Initialize SAML Service Provider and Identity Provider
   */
  private initializeProviders() {
    // Service Provider (Trade Nexus)
    this.serviceProvider = saml.ServiceProvider({
      entityID: `${this.config.callbackUrl.split('/api')[0]}/saml/metadata/${this.config.companyId}`,
      authnRequestsSigned: false,
      wantAssertionsSigned: true,
      wantMessageSigned: true,
      assertionConsumerService: [
        {
          Binding: saml.Constants.namespace.binding.post,
          Location: this.config.callbackUrl,
        },
      ],
      singleLogoutService: [
        {
          Binding: saml.Constants.namespace.binding.redirect,
          Location: `${this.config.callbackUrl.split('/api')[0]}/api/auth/saml/logout`,
        },
      ],
    });

    // Identity Provider (Company's SSO)
    this.identityProvider = saml.IdentityProvider({
      entityID: this.config.entityId,
      singleSignOnService: [
        {
          Binding: saml.Constants.namespace.binding.redirect,
          Location: this.config.ssoUrl,
        },
      ],
      singleLogoutService: this.config.sloUrl
        ? [
            {
              Binding: saml.Constants.namespace.binding.redirect,
              Location: this.config.sloUrl,
            },
          ]
        : undefined,
      signingCert: this.config.certificate,
      wantAuthnRequestsSigned: false,
    });
  }

  /**
   * Create SAML AuthnRequest (login initiation)
   * Returns redirect URL to IdP
   */
  async createLoginRequest(): Promise<{ redirectUrl: string; relayState: string }> {
    try {
      const { context } = this.serviceProvider.createLoginRequest(
        this.identityProvider,
        'redirect'
      );

      // Generate random relay state for CSRF protection
      const relayState = crypto.randomUUID();

      return {
        redirectUrl: context,
        relayState,
      };
    } catch (error) {
      console.error('SAML login request creation error:', error);
      throw new Error('Failed to create SAML login request');
    }
  }

  /**
   * Parse and validate SAML Response from IdP
   */
  async parseLoginResponse(samlResponse: string): Promise<SAMLUserProfile> {
    try {
      const { extract } = await this.serviceProvider.parseLoginResponse(
        this.identityProvider,
        'post',
        { body: { SAMLResponse: samlResponse } }
      );

      // Extract user attributes
      const attributes = extract.attributes || {};

      // Try multiple attribute name formats (different IdPs use different names)
      const email = this.extractEmail(attributes);
      const firstName = this.extractFirstName(attributes);
      const lastName = this.extractLastName(attributes);
      const displayName = this.extractDisplayName(attributes);

      if (!email) {
        throw new Error('Email attribute not found in SAML response');
      }

      return {
        nameId: extract.nameID,
        sessionIndex: extract.sessionIndex,
        attributes,
        email,
        firstName,
        lastName,
        displayName,
      };
    } catch (error: any) {
      console.error('SAML response parsing error:', error);
      throw new Error(`Failed to parse SAML response: ${error.message}`);
    }
  }

  /**
   * Create SAML Logout Request (Single Logout)
   */
  async createLogoutRequest(nameId: string, sessionIndex?: string): Promise<string> {
    try {
      const { context } = this.serviceProvider.createLogoutRequest(
        this.identityProvider,
        'redirect',
        {
          nameID: nameId,
          sessionIndex: sessionIndex,
        }
      );

      return context;
    } catch (error) {
      console.error('SAML logout request creation error:', error);
      throw new Error('Failed to create SAML logout request');
    }
  }

  /**
   * Parse SAML Logout Response
   */
  async parseLogoutResponse(samlResponse: string): Promise<boolean> {
    try {
      await this.serviceProvider.parseLogoutResponse(this.identityProvider, 'redirect', {
        query: { SAMLResponse: samlResponse },
      });
      return true;
    } catch (error) {
      console.error('SAML logout response parsing error:', error);
      return false;
    }
  }

  /**
   * Get SAML Service Provider metadata XML
   * Provides to IdP for configuration
   */
  getMetadata(): string {
    return this.serviceProvider.getMetadata();
  }

  /**
   * Extract email from SAML attributes
   * Tries multiple attribute name formats
   */
  private extractEmail(attributes: Record<string, any>): string {
    const possibleEmailAttributes = [
      'email',
      'Email',
      'emailAddress',
      'mail',
      'Mail',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/email',
      'urn:oid:0.9.2342.19200300.100.1.3',
    ];

    for (const attr of possibleEmailAttributes) {
      const value = attributes[attr];
      if (value) {
        return Array.isArray(value) ? value[0] : value;
      }
    }

    return '';
  }

  /**
   * Extract first name from SAML attributes
   */
  private extractFirstName(attributes: Record<string, any>): string | undefined {
    const possibleAttributes = [
      'firstName',
      'FirstName',
      'givenName',
      'GivenName',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      'urn:oid:2.5.4.42',
    ];

    for (const attr of possibleAttributes) {
      const value = attributes[attr];
      if (value) {
        return Array.isArray(value) ? value[0] : value;
      }
    }

    return undefined;
  }

  /**
   * Extract last name from SAML attributes
   */
  private extractLastName(attributes: Record<string, any>): string | undefined {
    const possibleAttributes = [
      'lastName',
      'LastName',
      'surname',
      'Surname',
      'sn',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      'urn:oid:2.5.4.4',
    ];

    for (const attr of possibleAttributes) {
      const value = attributes[attr];
      if (value) {
        return Array.isArray(value) ? value[0] : value;
      }
    }

    return undefined;
  }

  /**
   * Extract display name from SAML attributes
   */
  private extractDisplayName(attributes: Record<string, any>): string | undefined {
    const possibleAttributes = [
      'displayName',
      'DisplayName',
      'name',
      'Name',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
      'urn:oid:2.16.840.1.113730.3.1.241',
    ];

    for (const attr of possibleAttributes) {
      const value = attributes[attr];
      if (value) {
        return Array.isArray(value) ? value[0] : value;
      }
    }

    return undefined;
  }
}

/**
 * Validate SAML configuration
 */
export function validateSAMLConfig(config: Partial<SAMLConfig>): boolean {
  const requiredFields = ['entityId', 'ssoUrl', 'certificate', 'callbackUrl'];

  for (const field of requiredFields) {
    if (!config[field as keyof SAMLConfig]) {
      throw new Error(`Missing required SAML configuration field: ${field}`);
    }
  }

  // Validate certificate format
  if (config.certificate && !config.certificate.includes('BEGIN CERTIFICATE')) {
    throw new Error('Invalid certificate format - must be PEM format');
  }

  // Validate URLs
  if (config.ssoUrl && !config.ssoUrl.startsWith('https://')) {
    throw new Error('SSO URL must use HTTPS');
  }

  return true;
}

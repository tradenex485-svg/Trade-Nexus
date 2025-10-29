/**
 * OAuth 2.0 / OpenID Connect Service
 * Handles OAuth authorization flow
 * Cloudflare Workers compatible
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  scope: string;
  redirectUri: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope: string;
}

export interface OAuthUserProfile {
  sub: string; // User ID
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  [key: string]: any; // Additional claims
}

/**
 * OAuth 2.0 Service for handling OAuth/OIDC authentication
 * Works with Google, Microsoft, and any OAuth 2.0 provider
 */
export class OAuthService {
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Validate OAuth configuration
   */
  private validateConfig() {
    const requiredFields = [
      'clientId',
      'clientSecret',
      'authorizationUrl',
      'tokenUrl',
      'userinfoUrl',
      'redirectUri',
    ];

    for (const field of requiredFields) {
      if (!this.config[field as keyof OAuthConfig]) {
        throw new Error(`Missing required OAuth configuration field: ${field}`);
      }
    }

    // Validate URLs
    if (!this.config.authorizationUrl.startsWith('https://')) {
      throw new Error('Authorization URL must use HTTPS');
    }
    if (!this.config.tokenUrl.startsWith('https://')) {
      throw new Error('Token URL must use HTTPS');
    }
  }

  /**
   * Generate OAuth authorization URL
   * @param state - CSRF protection state parameter
   * @returns Authorization URL to redirect user to
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scope || 'openid profile email',
      state,
      // PKCE support (optional, but recommended)
      // code_challenge_method: 'S256',
      // code_challenge: codeChallenge,
    });

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * @param code - Authorization code from OAuth callback
   * @returns Token response with access_token, refresh_token, etc.
   */
  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    try {
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token exchange failed:', errorText);
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
      }

      const tokenData = await response.json<OAuthTokenResponse>();

      if (!tokenData.access_token) {
        throw new Error('No access token in response');
      }

      return tokenData;
    } catch (error: any) {
      console.error('OAuth token exchange error:', error);
      throw new Error(`Failed to exchange code for token: ${error.message}`);
    }
  }

  /**
   * Get user profile from access token
   * @param accessToken - OAuth access token
   * @returns User profile with email, name, etc.
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserProfile> {
    try {
      const response = await fetch(this.config.userinfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Userinfo fetch failed:', errorText);
        throw new Error(`Userinfo fetch failed: ${response.status} - ${errorText}`);
      }

      const userInfo = await response.json<OAuthUserProfile>();

      if (!userInfo.email) {
        throw new Error('Email not found in user profile');
      }

      return userInfo;
    } catch (error: any) {
      console.error('OAuth userinfo error:', error);
      throw new Error(`Failed to fetch user info: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - OAuth refresh token
   * @returns New token response
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    try {
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
      }

      const tokenData = await response.json<OAuthTokenResponse>();
      return tokenData;
    } catch (error: any) {
      console.error('OAuth token refresh error:', error);
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }
  }

  /**
   * Revoke access token (logout)
   * Note: Not all providers support token revocation
   */
  async revokeToken(token: string, tokenTypeHint: 'access_token' | 'refresh_token' = 'access_token'): Promise<boolean> {
    try {
      // Try to revoke token if provider supports it
      // Microsoft: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/logout
      // Google: https://oauth2.googleapis.com/revoke

      // For now, just return true (revocation happens on IdP side)
      return true;
    } catch (error) {
      console.error('Token revocation error:', error);
      return false;
    }
  }

  /**
   * Validate ID token (if using OpenID Connect)
   * Uses jose library for JWT validation
   */
  async validateIdToken(idToken: string): Promise<any> {
    try {
      // Import jose dynamically
      const { jwtVerify, createRemoteJWKSet } = await import('jose');

      // Get JWKS URL (usually at /.well-known/openid-configuration)
      const jwksUrl = this.getJwksUrl();

      if (!jwksUrl) {
        console.warn('JWKS URL not available, skipping ID token validation');
        return null;
      }

      const JWKS = createRemoteJWKSet(new URL(jwksUrl));

      const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: this.getIssuer(),
        audience: this.config.clientId,
      });

      return payload;
    } catch (error) {
      console.error('ID token validation error:', error);
      throw new Error('Invalid ID token');
    }
  }

  /**
   * Get JWKS URL for ID token validation
   * Provider-specific
   */
  private getJwksUrl(): string | null {
    const authUrl = this.config.authorizationUrl.toLowerCase();

    // Microsoft
    if (authUrl.includes('login.microsoftonline.com')) {
      const match = authUrl.match(/login\.microsoftonline\.com\/([^\/]+)/);
      const tenantId = match ? match[1] : 'common';
      return `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
    }

    // Google
    if (authUrl.includes('accounts.google.com')) {
      return 'https://www.googleapis.com/oauth2/v3/certs';
    }

    // Generic OIDC - try /.well-known/openid-configuration
    const baseUrl = new URL(this.config.authorizationUrl).origin;
    return `${baseUrl}/.well-known/openid-configuration`;
  }

  /**
   * Get issuer for ID token validation
   */
  private getIssuer(): string {
    const authUrl = this.config.authorizationUrl.toLowerCase();

    // Microsoft
    if (authUrl.includes('login.microsoftonline.com')) {
      const match = authUrl.match(/login\.microsoftonline\.com\/([^\/]+)/);
      const tenantId = match ? match[1] : 'common';
      return `https://login.microsoftonline.com/${tenantId}/v2.0`;
    }

    // Google
    if (authUrl.includes('accounts.google.com')) {
      return 'https://accounts.google.com';
    }

    // Generic
    return new URL(this.config.authorizationUrl).origin;
  }
}

/**
 * Generate random state for CSRF protection
 */
export function generateOAuthState(): string {
  return crypto.randomUUID();
}

/**
 * Generate PKCE code verifier and challenge
 * For enhanced security (optional)
 */
export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  // Generate random code verifier
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = base64UrlEncode(array);

  // Create SHA-256 hash of verifier
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = base64UrlEncode(new Uint8Array(hash));

  return { codeVerifier, codeChallenge };
}

/**
 * Base64 URL encode helper
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

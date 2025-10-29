/**
 * OAuth 2.0 / OIDC Authentication Routes
 * Handles OAuth login, callback, and token management
 */

import { Hono } from 'hono';
import { OAuthService, generateOAuthState } from '../services/oauth-service';
import { SSOProvisioningService } from '../services/sso-provisioning-service';
import { generateAuthTokens } from '../services/auth-service';
import { decryptSSOConfig, encryptSSOConfig } from '../services/config-encryption-service';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  DATABASE_ENCRYPTION_KEY: string;
  FRONTEND_URL: string;
};

export const oauthRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/auth/oauth/login
 * Initiate OAuth login
 */
oauthRoutes.get('/login', async (c) => {
  try {
    const email = c.req.query('email');

    if (!email) {
      return c.json({ error: 'Email required' }, 400);
    }

    // Get company auth config
    const domain = email.split('@')[1];
    const authConfig = await c.env.DB.prepare(`
      SELECT cac.*, c.company_name
      FROM company_auth_configs cac
      JOIN companies c ON c.id = cac.company_id
      WHERE cac.email_domains LIKE ?
        AND cac.auth_method = 'oauth'
        AND cac.is_active = 1
    `).bind(`%${domain}%`).first<any>();

    if (!authConfig) {
      return c.json({ error: 'OAuth not configured for this domain' }, 404);
    }

    // Decrypt sensitive fields
    const decryptedConfig = await decryptSSOConfig(
      authConfig,
      c.env.DATABASE_ENCRYPTION_KEY || ''
    );

    // Initialize OAuth service
    const redirectUri = `${c.req.url.split('/api/')[0]}/api/auth/oauth/callback`;
    const oauthService = new OAuthService({
      clientId: decryptedConfig.oauth_client_id,
      clientSecret: decryptedConfig.oauth_client_secret,
      authorizationUrl: decryptedConfig.oauth_authorization_url,
      tokenUrl: decryptedConfig.oauth_token_url,
      userinfoUrl: decryptedConfig.oauth_userinfo_url,
      scope: decryptedConfig.oauth_scope || 'openid profile email',
      redirectUri,
    });

    // Generate state token for CSRF protection
    const state = generateOAuthState();

    // Store state in KV
    await c.env.SESSIONS.put(
      `oauth_state:${state}`,
      JSON.stringify({ email, companyId: authConfig.company_id }),
      { expirationTtl: 600 } // 10 minutes
    );

    // Get authorization URL and redirect
    const authUrl = oauthService.getAuthorizationUrl(state);
    return c.redirect(authUrl);
  } catch (error: any) {
    console.error('OAuth login error:', error);
    return c.json({ error: 'OAuth login failed', details: error.message }, 500);
  }
});

/**
 * GET /api/auth/oauth/callback
 * Handle OAuth callback from provider
 */
oauthRoutes.get('/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');
    const errorDescription = c.req.query('error_description');

    // Check for OAuth errors
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      const frontendUrl = c.env.FRONTEND_URL || 'https://trade-nexus-frontend.pages.dev';
      return c.redirect(
        `${frontendUrl}/login?error=oauth_failed&message=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !state) {
      return c.json({ error: 'Invalid OAuth callback - missing code or state' }, 400);
    }

    // Retrieve and validate state
    const stateData = await c.env.SESSIONS.get(`oauth_state:${state}`);
    if (!stateData) {
      return c.json({ error: 'Invalid or expired state parameter' }, 400);
    }

    const { email, companyId } = JSON.parse(stateData);

    // Get auth config
    const authConfig = await c.env.DB.prepare(`
      SELECT cac.*, c.company_name
      FROM company_auth_configs cac
      JOIN companies c ON c.id = cac.company_id
      WHERE cac.company_id = ? AND cac.auth_method = 'oauth'
    `).bind(companyId).first<any>();

    if (!authConfig) {
      return c.json({ error: 'OAuth configuration not found' }, 404);
    }

    // Decrypt sensitive fields
    const decryptedConfig = await decryptSSOConfig(
      authConfig,
      c.env.DATABASE_ENCRYPTION_KEY || ''
    );

    // Initialize OAuth service
    const redirectUri = `${c.req.url.split('/api/')[0]}/api/auth/oauth/callback`;
    const oauthService = new OAuthService({
      clientId: decryptedConfig.oauth_client_id,
      clientSecret: decryptedConfig.oauth_client_secret,
      authorizationUrl: decryptedConfig.oauth_authorization_url,
      tokenUrl: decryptedConfig.oauth_token_url,
      userinfoUrl: decryptedConfig.oauth_userinfo_url,
      scope: decryptedConfig.oauth_scope || 'openid profile email',
      redirectUri,
    });

    // Exchange code for tokens
    const tokenResponse = await oauthService.exchangeCodeForToken(code);

    // Get user profile
    const userProfile = await oauthService.getUserInfo(tokenResponse.access_token);

    // Verify email matches
    if (userProfile.email.toLowerCase() !== email.toLowerCase()) {
      return c.json({ error: 'Email mismatch in OAuth response' }, 400);
    }

    // Just-In-Time (JIT) user provisioning
    const provisioningService = new SSOProvisioningService(c.env.DB);
    const user = await provisioningService.provisionFromOAuth(userProfile, authConfig);

    // Generate Trade Nexus JWT tokens
    const tokens = await generateAuthTokens(user, c.env.JWT_SECRET);

    // Encrypt OAuth tokens before storing
    const encryptedTokens = await encryptSSOConfig(
      {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || null,
      },
      c.env.DATABASE_ENCRYPTION_KEY || ''
    );

    // Store OAuth session
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

    await c.env.DB.prepare(`
      INSERT INTO sso_sessions (
        user_id, company_id, provider_name, auth_method,
        access_token, refresh_token, token_expires_at, expires_at
      ) VALUES (?, ?, ?, 'oauth', ?, ?, ?, datetime('now', '+8 hours'))
    `).bind(
      user.id,
      companyId,
      authConfig.provider_name,
      encryptedTokens.access_token,
      encryptedTokens.refresh_token,
      expiresAt.toISOString()
    ).run();

    // Cleanup state
    await c.env.SESSIONS.delete(`oauth_state:${state}`);

    // Redirect to frontend with tokens
    const frontendUrl = c.env.FRONTEND_URL || 'https://trade-nexus-frontend.pages.dev';
    return c.redirect(
      `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`
    );
  } catch (error: any) {
    console.error('OAuth callback error:', error);

    // Redirect to frontend with error
    const frontendUrl = c.env.FRONTEND_URL || 'https://trade-nexus-frontend.pages.dev';
    return c.redirect(
      `${frontendUrl}/login?error=oauth_failed&message=${encodeURIComponent(error.message)}`
    );
  }
});

/**
 * POST /api/auth/oauth/refresh
 * Refresh OAuth access token using refresh token
 */
oauthRoutes.post('/refresh', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.substring(7);

    // Get user's OAuth session
    const session = await c.env.DB.prepare(`
      SELECT s.user_id, ss.*, cac.*
      FROM sessions s
      JOIN sso_sessions ss ON ss.user_id = s.user_id
      JOIN company_auth_configs cac ON cac.company_id = ss.company_id AND cac.auth_method = 'oauth'
      WHERE s.token = ?
      ORDER BY ss.created_at DESC
      LIMIT 1
    `).bind(token).first<any>();

    if (!session || !session.refresh_token) {
      return c.json({ error: 'No refresh token available' }, 400);
    }

    // Check if token is expired
    const tokenExpiresAt = new Date(session.token_expires_at);
    if (tokenExpiresAt > new Date()) {
      return c.json({ message: 'Token still valid', expires_at: tokenExpiresAt });
    }

    // Decrypt config and tokens
    const decryptedConfig = await decryptSSOConfig(
      session,
      c.env.DATABASE_ENCRYPTION_KEY || ''
    );

    // Initialize OAuth service
    const redirectUri = `${c.req.url.split('/api/')[0]}/api/auth/oauth/callback`;
    const oauthService = new OAuthService({
      clientId: decryptedConfig.oauth_client_id,
      clientSecret: decryptedConfig.oauth_client_secret,
      authorizationUrl: decryptedConfig.oauth_authorization_url,
      tokenUrl: decryptedConfig.oauth_token_url,
      userinfoUrl: decryptedConfig.oauth_userinfo_url,
      scope: decryptedConfig.oauth_scope || 'openid profile email',
      redirectUri,
    });

    // Refresh the token
    const newTokens = await oauthService.refreshAccessToken(decryptedConfig.refresh_token);

    // Encrypt new tokens
    const encryptedTokens = await encryptSSOConfig(
      {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || decryptedConfig.refresh_token,
      },
      c.env.DATABASE_ENCRYPTION_KEY || ''
    );

    // Update session with new tokens
    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + newTokens.expires_in);

    await c.env.DB.prepare(`
      UPDATE sso_sessions
      SET access_token = ?,
          refresh_token = ?,
          token_expires_at = ?,
          last_activity_at = datetime('now')
      WHERE id = ?
    `).bind(
      encryptedTokens.access_token,
      encryptedTokens.refresh_token,
      newExpiresAt.toISOString(),
      session.id
    ).run();

    return c.json({
      success: true,
      message: 'Token refreshed',
      expires_at: newExpiresAt,
    });
  } catch (error: any) {
    console.error('OAuth refresh error:', error);
    return c.json({ error: 'Token refresh failed', details: error.message }, 500);
  }
});

/**
 * POST /api/auth/oauth/logout
 * Logout and revoke OAuth tokens
 */
oauthRoutes.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: true, message: 'Logged out' });
    }

    const token = authHeader.substring(7);

    // Get user's OAuth session
    const session = await c.env.DB.prepare(`
      SELECT s.user_id, ss.*
      FROM sessions s
      LEFT JOIN sso_sessions ss ON ss.user_id = s.user_id AND ss.auth_method = 'oauth'
      WHERE s.token = ?
      ORDER BY ss.created_at DESC
      LIMIT 1
    `).bind(token).first<any>();

    if (session && session.access_token) {
      // Decrypt access token
      const decryptedTokens = await decryptSSOConfig(
        { access_token: session.access_token },
        c.env.DATABASE_ENCRYPTION_KEY || ''
      );

      // Note: Token revocation is provider-specific and not always supported
      // For now, we just delete local sessions
    }

    // Delete all user sessions
    if (session?.user_id) {
      await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?')
        .bind(session.user_id).run();
      await c.env.DB.prepare('DELETE FROM sso_sessions WHERE user_id = ?')
        .bind(session.user_id).run();
    }

    return c.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('OAuth logout error:', error);
    return c.json({ error: 'Logout failed', details: error.message }, 500);
  }
});

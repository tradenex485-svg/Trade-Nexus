/**
 * SAML Authentication Routes
 * Handles SAML 2.0 login, callback, logout, and metadata
 */

import { Hono } from 'hono';
import { SAMLService } from '../services/saml-service';
import { SSOProvisioningService } from '../services/sso-provisioning-service';
import { generateAuthTokens } from '../services/auth-service';
import { decryptSSOConfig } from '../services/config-encryption-service';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  DATABASE_ENCRYPTION_KEY: string;
  FRONTEND_URL: string;
};

export const samlRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/auth/saml/login
 * Initiate SAML login for a company
 */
samlRoutes.get('/login', async (c) => {
  try {
    const email = c.req.query('email');

    if (!email) {
      return c.json({ error: 'Email required' }, 400);
    }

    // Get company auth config based on email domain
    const domain = email.split('@')[1];
    const authConfig = await c.env.DB.prepare(`
      SELECT cac.*, c.company_name
      FROM company_auth_configs cac
      JOIN companies c ON c.id = cac.company_id
      WHERE cac.email_domains LIKE ?
        AND cac.auth_method = 'saml'
        AND cac.is_active = 1
    `).bind(`%${domain}%`).first<any>();

    if (!authConfig) {
      return c.json({ error: 'SSO not configured for this email domain' }, 404);
    }

    // Decrypt sensitive fields if needed
    const decryptedConfig = await decryptSSOConfig(
      authConfig,
      c.env.DATABASE_ENCRYPTION_KEY || ''
    );

    // Initialize SAML service
    const callbackUrl = `${c.req.url.split('/api/')[0]}/api/auth/saml/callback`;
    const samlService = new SAMLService({
      companyId: authConfig.company_id,
      entityId: decryptedConfig.saml_entity_id,
      ssoUrl: decryptedConfig.saml_sso_url,
      sloUrl: decryptedConfig.saml_slo_url,
      certificate: decryptedConfig.saml_certificate,
      nameIdFormat: decryptedConfig.saml_name_id_format,
      callbackUrl,
    });

    // Generate SAML AuthnRequest
    const { redirectUrl, relayState } = await samlService.createLoginRequest();

    // Store relay state in KV for validation
    await c.env.SESSIONS.put(
      `saml_relay:${relayState}`,
      JSON.stringify({ email, companyId: authConfig.company_id }),
      { expirationTtl: 600 } // 10 minutes
    );

    // Redirect to IdP
    return c.redirect(redirectUrl);
  } catch (error: any) {
    console.error('SAML login error:', error);
    return c.json({ error: 'SAML login failed', details: error.message }, 500);
  }
});

/**
 * POST /api/auth/saml/callback
 * Handle SAML Response from IdP
 */
samlRoutes.post('/callback', async (c) => {
  try {
    const body = await c.req.parseBody();
    const samlResponse = body['SAMLResponse'] as string;
    const relayState = body['RelayState'] as string;

    if (!samlResponse || !relayState) {
      return c.json({ error: 'Invalid SAML response' }, 400);
    }

    // Retrieve relay state data
    const relayData = await c.env.SESSIONS.get(`saml_relay:${relayState}`);
    if (!relayData) {
      return c.json({ error: 'Invalid or expired relay state' }, 400);
    }

    const { email, companyId } = JSON.parse(relayData);

    // Get auth config
    const authConfig = await c.env.DB.prepare(`
      SELECT cac.*, c.company_name
      FROM company_auth_configs cac
      JOIN companies c ON c.id = cac.company_id
      WHERE cac.company_id = ? AND cac.auth_method = 'saml'
    `).bind(companyId).first<any>();

    if (!authConfig) {
      return c.json({ error: 'SSO configuration not found' }, 404);
    }

    // Decrypt sensitive fields
    const decryptedConfig = await decryptSSOConfig(
      authConfig,
      c.env.DATABASE_ENCRYPTION_KEY || ''
    );

    // Parse SAML response
    const callbackUrl = `${c.req.url.split('/api/')[0]}/api/auth/saml/callback`;
    const samlService = new SAMLService({
      companyId,
      entityId: decryptedConfig.saml_entity_id,
      ssoUrl: decryptedConfig.saml_sso_url,
      sloUrl: decryptedConfig.saml_slo_url,
      certificate: decryptedConfig.saml_certificate,
      nameIdFormat: decryptedConfig.saml_name_id_format,
      callbackUrl,
    });

    const profile = await samlService.parseLoginResponse(samlResponse);

    // Verify email matches
    if (profile.email.toLowerCase() !== email.toLowerCase()) {
      return c.json({ error: 'Email mismatch in SAML response' }, 400);
    }

    // Just-In-Time (JIT) user provisioning
    const provisioningService = new SSOProvisioningService(c.env.DB);
    const user = await provisioningService.provisionFromSAML(profile, authConfig);

    // Generate Trade Nexus JWT tokens
    const tokens = await generateAuthTokens(user, c.env.JWT_SECRET);

    // Store SSO session
    await c.env.DB.prepare(`
      INSERT INTO sso_sessions (
        user_id, company_id, session_index, name_id, provider_name, auth_method, expires_at
      ) VALUES (?, ?, ?, ?, ?, 'saml', datetime('now', '+8 hours'))
    `).bind(
      user.id,
      companyId,
      profile.sessionIndex || null,
      profile.nameId,
      authConfig.provider_name
    ).run();

    // Cleanup relay state
    await c.env.SESSIONS.delete(`saml_relay:${relayState}`);

    // Redirect to frontend with token
    const frontendUrl = c.env.FRONTEND_URL || 'https://trade-nexus-frontend.pages.dev';
    return c.redirect(
      `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`
    );
  } catch (error: any) {
    console.error('SAML callback error:', error);

    // Redirect to frontend with error
    const frontendUrl = c.env.FRONTEND_URL || 'https://trade-nexus-frontend.pages.dev';
    return c.redirect(`${frontendUrl}/login?error=sso_failed&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /api/auth/saml/logout
 * Handle SAML Single Logout
 */
samlRoutes.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: true, message: 'Logged out' });
    }

    const token = authHeader.substring(7);

    // Get user from token (simplified - should verify token)
    const session = await c.env.DB.prepare(`
      SELECT s.user_id, ss.session_index, ss.name_id, ss.company_id, cac.*
      FROM sessions s
      LEFT JOIN sso_sessions ss ON ss.user_id = s.user_id
      LEFT JOIN company_auth_configs cac ON cac.company_id = ss.company_id AND cac.auth_method = 'saml'
      WHERE s.token = ?
      ORDER BY ss.created_at DESC
      LIMIT 1
    `).bind(token).first<any>();

    if (!session || !session.session_index) {
      // No SSO session - just logout locally
      await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
      return c.json({ success: true, message: 'Logged out' });
    }

    // Decrypt config
    const decryptedConfig = await decryptSSOConfig(
      session,
      c.env.DATABASE_ENCRYPTION_KEY || ''
    );

    // Initialize SAML service
    const callbackUrl = `${c.req.url.split('/api/')[0]}/api/auth/saml/callback`;
    const samlService = new SAMLService({
      companyId: session.company_id,
      entityId: decryptedConfig.saml_entity_id,
      ssoUrl: decryptedConfig.saml_sso_url,
      sloUrl: decryptedConfig.saml_slo_url,
      certificate: decryptedConfig.saml_certificate,
      callbackUrl,
    });

    // Generate logout request
    const logoutUrl = await samlService.createLogoutRequest(
      session.name_id,
      session.session_index
    );

    // Delete local sessions
    await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?')
      .bind(session.user_id).run();
    await c.env.DB.prepare('DELETE FROM sso_sessions WHERE user_id = ?')
      .bind(session.user_id).run();

    // Redirect to IdP logout
    return c.redirect(logoutUrl);
  } catch (error: any) {
    console.error('SAML logout error:', error);
    return c.json({ error: 'Logout failed', details: error.message }, 500);
  }
});

/**
 * GET /api/auth/saml/metadata/:companyId
 * Provides SP metadata to IdP for configuration
 */
samlRoutes.get('/metadata/:companyId', async (c) => {
  try {
    const companyId = parseInt(c.req.param('companyId'));

    const authConfig = await c.env.DB.prepare(`
      SELECT * FROM company_auth_configs
      WHERE company_id = ? AND auth_method = 'saml'
    `).bind(companyId).first<any>();

    if (!authConfig) {
      return c.json({ error: 'SAML not configured for this company' }, 404);
    }

    // Decrypt config
    const decryptedConfig = await decryptSSOConfig(
      authConfig,
      c.env.DATABASE_ENCRYPTION_KEY || ''
    );

    // Initialize SAML service
    const callbackUrl = `${c.req.url.split('/api/')[0]}/api/auth/saml/callback`;
    const samlService = new SAMLService({
      companyId,
      entityId: decryptedConfig.saml_entity_id,
      ssoUrl: decryptedConfig.saml_sso_url,
      sloUrl: decryptedConfig.saml_slo_url,
      certificate: decryptedConfig.saml_certificate,
      callbackUrl,
    });

    const metadata = samlService.getMetadata();

    c.header('Content-Type', 'application/xml');
    return c.body(metadata);
  } catch (error: any) {
    console.error('SAML metadata error:', error);
    return c.json({ error: 'Failed to generate metadata', details: error.message }, 500);
  }
});

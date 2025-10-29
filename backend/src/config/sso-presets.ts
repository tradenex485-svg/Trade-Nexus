/**
 * SSO Provider Presets
 * Pre-configured templates for common SSO providers
 * Reduces configuration to just 2-3 fields per provider
 */

export interface SSOProviderPreset {
  id: string;
  name: string;
  display_name: string;
  auth_method: 'saml' | 'oauth' | 'ldap';
  description: string;
  logo_url?: string;
  documentation_url?: string;

  // Required fields from admin
  required_fields: {
    field: string;
    label: string;
    type: 'text' | 'textarea' | 'password';
    placeholder?: string;
    help_text?: string;
  }[];

  // Pre-configured fields (auto-filled)
  config_template: Record<string, any>;

  // Field transformations (replace placeholders with user input)
  field_mappings?: Record<string, string>;
}

/**
 * Microsoft Entra ID (Azure AD) - SAML 2.0
 */
export const MICROSOFT_ENTRA_SAML: SSOProviderPreset = {
  id: 'microsoft_entra_saml',
  name: 'microsoft',
  display_name: 'Microsoft Entra ID (SAML 2.0)',
  auth_method: 'saml',
  description: 'Enterprise SSO using Microsoft Entra ID (formerly Azure AD) with SAML 2.0',
  logo_url: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
  documentation_url: 'https://learn.microsoft.com/en-us/entra/identity/saml-toolkit/',

  required_fields: [
    {
      field: 'tenant_id',
      label: 'Tenant ID',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      help_text: 'Find in Azure Portal → Azure Active Directory → Overview',
    },
    {
      field: 'certificate',
      label: 'X.509 Certificate',
      type: 'textarea',
      placeholder: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
      help_text: 'Download from App Registration → Certificates & secrets',
    },
    {
      field: 'email_domains',
      label: 'Email Domains',
      type: 'text',
      placeholder: 'company.com,company.net',
      help_text: 'Comma-separated list of email domains for this company',
    },
  ],

  config_template: {
    saml_name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  },

  field_mappings: {
    'saml_entity_id': 'https://sts.windows.net/{tenant_id}/',
    'saml_sso_url': 'https://login.microsoftonline.com/{tenant_id}/saml2',
    'saml_slo_url': 'https://login.microsoftonline.com/{tenant_id}/saml2',
    'saml_certificate': '{certificate}',
    'email_domains': '{email_domains}',
  },
};

/**
 * Microsoft Entra ID (Azure AD) - OAuth 2.0 / OpenID Connect
 */
export const MICROSOFT_ENTRA_OAUTH: SSOProviderPreset = {
  id: 'microsoft_entra_oauth',
  name: 'microsoft',
  display_name: 'Microsoft Entra ID (OAuth 2.0)',
  auth_method: 'oauth',
  description: 'Modern authentication using Microsoft Entra ID with OAuth 2.0 / OpenID Connect',
  logo_url: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
  documentation_url: 'https://learn.microsoft.com/en-us/entra/identity-platform/',

  required_fields: [
    {
      field: 'tenant_id',
      label: 'Tenant ID',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      help_text: 'Find in Azure Portal → Azure Active Directory → Overview',
    },
    {
      field: 'client_id',
      label: 'Application (Client) ID',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      help_text: 'Find in App Registration → Overview',
    },
    {
      field: 'client_secret',
      label: 'Client Secret',
      type: 'password',
      placeholder: '••••••••••••••••',
      help_text: 'Create in App Registration → Certificates & secrets',
    },
    {
      field: 'email_domains',
      label: 'Email Domains',
      type: 'text',
      placeholder: 'company.com,company.net',
      help_text: 'Comma-separated list of email domains',
    },
  ],

  config_template: {
    oauth_scope: 'openid profile email',
    oauth_userinfo_url: 'https://graph.microsoft.com/v1.0/me',
  },

  field_mappings: {
    'oauth_client_id': '{client_id}',
    'oauth_client_secret': '{client_secret}',
    'oauth_authorization_url': 'https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize',
    'oauth_token_url': 'https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token',
    'email_domains': '{email_domains}',
  },
};

/**
 * Okta - SAML 2.0
 */
export const OKTA_SAML: SSOProviderPreset = {
  id: 'okta_saml',
  name: 'okta',
  display_name: 'Okta (SAML 2.0)',
  auth_method: 'saml',
  description: 'Enterprise identity management with Okta using SAML 2.0',
  logo_url: 'https://www.okta.com/sites/default/files/Okta_Logo_BrightBlue_Medium.png',
  documentation_url: 'https://developer.okta.com/docs/guides/saml-application-setup/',

  required_fields: [
    {
      field: 'okta_domain',
      label: 'Okta Domain',
      type: 'text',
      placeholder: 'company.okta.com or company.oktapreview.com',
      help_text: 'Your Okta organization domain',
    },
    {
      field: 'app_id',
      label: 'Application ID',
      type: 'text',
      placeholder: 'xxxxxxxxxxxxxxxxx',
      help_text: 'Find in Okta Admin → Applications → Your App → General',
    },
    {
      field: 'certificate',
      label: 'X.509 Certificate',
      type: 'textarea',
      placeholder: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
      help_text: 'Download from Sign On tab → View Setup Instructions',
    },
    {
      field: 'email_domains',
      label: 'Email Domains',
      type: 'text',
      placeholder: 'company.com',
      help_text: 'Comma-separated list of email domains',
    },
  ],

  config_template: {
    saml_name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  },

  field_mappings: {
    'saml_entity_id': 'http://www.okta.com/{app_id}',
    'saml_sso_url': 'https://{okta_domain}/app/{app_id}/sso/saml',
    'saml_slo_url': 'https://{okta_domain}/app/{app_id}/slo/saml',
    'saml_certificate': '{certificate}',
    'email_domains': '{email_domains}',
  },
};

/**
 * Google Workspace - OAuth 2.0
 */
export const GOOGLE_WORKSPACE_OAUTH: SSOProviderPreset = {
  id: 'google_workspace_oauth',
  name: 'google',
  display_name: 'Google Workspace (OAuth 2.0)',
  auth_method: 'oauth',
  description: 'Sign in with Google Workspace accounts using OAuth 2.0',
  logo_url: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
  documentation_url: 'https://developers.google.com/identity/protocols/oauth2',

  required_fields: [
    {
      field: 'client_id',
      label: 'Client ID',
      type: 'text',
      placeholder: 'xxxxxxxxx.apps.googleusercontent.com',
      help_text: 'Find in Google Cloud Console → APIs & Services → Credentials',
    },
    {
      field: 'client_secret',
      label: 'Client Secret',
      type: 'password',
      placeholder: '••••••••••••••••',
      help_text: 'Created with the OAuth 2.0 Client ID',
    },
    {
      field: 'email_domains',
      label: 'Email Domains',
      type: 'text',
      placeholder: 'company.com',
      help_text: 'Comma-separated list of email domains',
    },
  ],

  config_template: {
    oauth_authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    oauth_token_url: 'https://oauth2.googleapis.com/token',
    oauth_userinfo_url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    oauth_scope: 'openid profile email',
  },

  field_mappings: {
    'oauth_client_id': '{client_id}',
    'oauth_client_secret': '{client_secret}',
    'email_domains': '{email_domains}',
  },
};

/**
 * OneLogin - SAML 2.0
 */
export const ONELOGIN_SAML: SSOProviderPreset = {
  id: 'onelogin_saml',
  name: 'onelogin',
  display_name: 'OneLogin (SAML 2.0)',
  auth_method: 'saml',
  description: 'Secure access with OneLogin using SAML 2.0',
  logo_url: 'https://www.onelogin.com/assets/img/logo-onelogin.svg',
  documentation_url: 'https://developers.onelogin.com/saml',

  required_fields: [
    {
      field: 'subdomain',
      label: 'OneLogin Subdomain',
      type: 'text',
      placeholder: 'company',
      help_text: 'Your OneLogin subdomain (e.g., company.onelogin.com)',
    },
    {
      field: 'app_id',
      label: 'Application ID',
      type: 'text',
      placeholder: 'xxxxxx',
      help_text: 'Find in OneLogin Admin → Applications → Your App',
    },
    {
      field: 'certificate',
      label: 'X.509 Certificate',
      type: 'textarea',
      placeholder: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
      help_text: 'Download from SSO tab → X.509 Certificate',
    },
    {
      field: 'email_domains',
      label: 'Email Domains',
      type: 'text',
      placeholder: 'company.com',
      help_text: 'Comma-separated list of email domains',
    },
  ],

  config_template: {
    saml_name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  },

  field_mappings: {
    'saml_entity_id': 'https://app.onelogin.com/saml/metadata/{app_id}',
    'saml_sso_url': 'https://{subdomain}.onelogin.com/trust/saml2/http-post/sso/{app_id}',
    'saml_slo_url': 'https://{subdomain}.onelogin.com/trust/saml2/http-redirect/slo/{app_id}',
    'saml_certificate': '{certificate}',
    'email_domains': '{email_domains}',
  },
};

/**
 * Generic SAML 2.0
 * For any SAML 2.0 compliant identity provider
 */
export const GENERIC_SAML: SSOProviderPreset = {
  id: 'generic_saml',
  name: 'generic_saml',
  display_name: 'Generic SAML 2.0',
  auth_method: 'saml',
  description: 'Configure any SAML 2.0 compliant identity provider',
  documentation_url: 'https://docs.oasis-open.org/security/saml/',

  required_fields: [
    {
      field: 'entity_id',
      label: 'Entity ID (Issuer)',
      type: 'text',
      placeholder: 'https://idp.company.com/saml/metadata',
      help_text: 'SAML Entity ID from your identity provider',
    },
    {
      field: 'sso_url',
      label: 'SSO URL',
      type: 'text',
      placeholder: 'https://idp.company.com/saml/sso',
      help_text: 'SAML Single Sign-On URL',
    },
    {
      field: 'certificate',
      label: 'X.509 Certificate',
      type: 'textarea',
      placeholder: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
      help_text: 'Public certificate from identity provider',
    },
    {
      field: 'email_domains',
      label: 'Email Domains',
      type: 'text',
      placeholder: 'company.com',
      help_text: 'Comma-separated list of email domains',
    },
  ],

  config_template: {
    saml_name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  },

  field_mappings: {
    'saml_entity_id': '{entity_id}',
    'saml_sso_url': '{sso_url}',
    'saml_certificate': '{certificate}',
    'email_domains': '{email_domains}',
  },
};

/**
 * Generic OAuth 2.0 / OpenID Connect
 * For any OAuth 2.0 or OIDC compliant provider
 */
export const GENERIC_OAUTH: SSOProviderPreset = {
  id: 'generic_oauth',
  name: 'generic_oauth',
  display_name: 'Generic OAuth 2.0 / OIDC',
  auth_method: 'oauth',
  description: 'Configure any OAuth 2.0 or OpenID Connect provider',
  documentation_url: 'https://oauth.net/2/',

  required_fields: [
    {
      field: 'client_id',
      label: 'Client ID',
      type: 'text',
      placeholder: 'your-client-id',
      help_text: 'OAuth 2.0 Client ID',
    },
    {
      field: 'client_secret',
      label: 'Client Secret',
      type: 'password',
      placeholder: '••••••••••••••••',
      help_text: 'OAuth 2.0 Client Secret',
    },
    {
      field: 'authorization_url',
      label: 'Authorization URL',
      type: 'text',
      placeholder: 'https://idp.company.com/oauth2/authorize',
      help_text: 'OAuth authorization endpoint',
    },
    {
      field: 'token_url',
      label: 'Token URL',
      type: 'text',
      placeholder: 'https://idp.company.com/oauth2/token',
      help_text: 'OAuth token endpoint',
    },
    {
      field: 'userinfo_url',
      label: 'Userinfo URL',
      type: 'text',
      placeholder: 'https://idp.company.com/oauth2/userinfo',
      help_text: 'OAuth userinfo endpoint',
    },
    {
      field: 'email_domains',
      label: 'Email Domains',
      type: 'text',
      placeholder: 'company.com',
      help_text: 'Comma-separated list of email domains',
    },
  ],

  config_template: {
    oauth_scope: 'openid profile email',
  },

  field_mappings: {
    'oauth_client_id': '{client_id}',
    'oauth_client_secret': '{client_secret}',
    'oauth_authorization_url': '{authorization_url}',
    'oauth_token_url': '{token_url}',
    'oauth_userinfo_url': '{userinfo_url}',
    'email_domains': '{email_domains}',
  },
};

/**
 * All available SSO provider presets
 */
export const SSO_PROVIDER_PRESETS: Record<string, SSOProviderPreset> = {
  microsoft_entra_saml: MICROSOFT_ENTRA_SAML,
  microsoft_entra_oauth: MICROSOFT_ENTRA_OAUTH,
  okta_saml: OKTA_SAML,
  google_workspace_oauth: GOOGLE_WORKSPACE_OAUTH,
  onelogin_saml: ONELOGIN_SAML,
  generic_saml: GENERIC_SAML,
  generic_oauth: GENERIC_OAUTH,
};

/**
 * Get SSO provider preset by ID
 */
export function getSSOPreset(presetId: string): SSOProviderPreset | undefined {
  return SSO_PROVIDER_PRESETS[presetId];
}

/**
 * Get all SSO provider presets
 */
export function getAllSSOPresets(): SSOProviderPreset[] {
  return Object.values(SSO_PROVIDER_PRESETS);
}

/**
 * Apply preset configuration with user-provided values
 * Replaces placeholders like {tenant_id} with actual values
 */
export function applySSOPreset(
  preset: SSOProviderPreset,
  userValues: Record<string, string>
): Record<string, any> {
  const config = { ...preset.config_template };

  if (preset.field_mappings) {
    for (const [configKey, template] of Object.entries(preset.field_mappings)) {
      let value = template;

      // Replace all placeholders {field_name} with user values
      for (const [field, userValue] of Object.entries(userValues)) {
        value = value.replace(new RegExp(`\\{${field}\\}`, 'g'), userValue);
      }

      config[configKey] = value;
    }
  }

  return config;
}

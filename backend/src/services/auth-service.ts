/**
 * Authentication Service
 * Handles password hashing, JWT generation, and session management
 */

// Note: Cloudflare Workers has limited crypto support
// We'll use Web Crypto API which is available in Workers

export interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  is_active: number;
  password?: string;
}

export interface TokenPayload {
  userId: number;
  email: string;
  roleId: number;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Hash a password using PBKDF2
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  );

  const hashArray = new Uint8Array(derivedBits);
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

  return `${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const [saltHex, hashHex] = hashedPassword.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));

  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  const key = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  );

  const hashArray = new Uint8Array(derivedBits);
  const computedHashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

  return computedHashHex === hashHex;
}

/**
 * Generate JWT token
 */
export async function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, secret: string, expiresIn: number = 3600): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(tokenPayload));
  const message = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );

  const signatureB64 = base64UrlEncode(signature);
  return `${message}.${signatureB64}`;
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = base64UrlDecode(signatureB64);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(message)
    );

    if (!isValid) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Generate access and refresh tokens
 */
export async function generateAuthTokens(user: User, secret: string): Promise<AuthTokens> {
  const accessToken = await generateToken(
    { userId: user.id, email: user.email, roleId: user.role_id },
    secret,
    3600 // 1 hour
  );

  const refreshToken = await generateToken(
    { userId: user.id, email: user.email, roleId: user.role_id },
    secret,
    604800 // 7 days
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600
  };
}

/**
 * Generate random token for password reset
 */
export function generateResetToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(data: string | ArrayBuffer): string {
  let base64: string;

  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    const bytes = new Uint8Array(data);
    const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    base64 = btoa(binary);
  }

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(data: string): ArrayBuffer {
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if user account is locked
 */
export function isAccountLocked(user: User & { locked_until?: string | null }): boolean {
  if (!user.locked_until) {
    return false;
  }
  const lockedUntil = new Date(user.locked_until);
  return lockedUntil > new Date();
}

/**
 * Increment failed login attempts
 */
export async function incrementFailedAttempts(db: any, userId: number): Promise<void> {
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION_MINUTES = 30;

  const user = await db.prepare(`
    SELECT failed_login_attempts FROM users WHERE id = ?
  `).bind(userId).first();

  const attempts = (user?.failed_login_attempts || 0) + 1;

  if (attempts >= MAX_ATTEMPTS) {
    // Lock the account
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCK_DURATION_MINUTES);

    await db.prepare(`
      UPDATE users
      SET failed_login_attempts = ?,
          locked_until = ?
      WHERE id = ?
    `).bind(attempts, lockedUntil.toISOString(), userId).run();
  } else {
    await db.prepare(`
      UPDATE users
      SET failed_login_attempts = ?
      WHERE id = ?
    `).bind(attempts, userId).run();
  }
}

/**
 * Reset failed login attempts
 */
export async function resetFailedAttempts(db: any, userId: number): Promise<void> {
  await db.prepare(`
    UPDATE users
    SET failed_login_attempts = 0,
        locked_until = NULL,
        last_login_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(userId).run();
}

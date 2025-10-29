/**
 * Configuration Encryption Service
 * Uses Web Crypto API (Cloudflare Workers compatible)
 * Encrypts/decrypts sensitive SSO configuration fields
 */

/**
 * Encrypt sensitive configuration data using AES-256-GCM
 * Uses Web Crypto API - fully compatible with Cloudflare Workers
 */
export class ConfigEncryptionService {
  private encryptionKey: string;

  constructor(encryptionKey: string) {
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters');
    }
    this.encryptionKey = encryptionKey;
  }

  /**
   * Encrypt plaintext string
   * @param plaintext - String to encrypt
   * @returns Base64-encoded encrypted string with IV prepended
   */
  async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) {
      return '';
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Import encryption key
    const key = await this.importKey();

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt data
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      data
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return base64-encoded string
    return this.arrayBufferToBase64(combined);
  }

  /**
   * Decrypt encrypted string
   * @param ciphertext - Base64-encoded encrypted string with IV
   * @returns Decrypted plaintext string
   */
  async decrypt(ciphertext: string): Promise<string> {
    if (!ciphertext) {
      return '';
    }

    try {
      // Decode base64
      const combined = this.base64ToArrayBuffer(ciphertext);

      // Extract IV (first 12 bytes) and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      // Import decryption key
      const key = await this.importKey();

      // Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        key,
        encrypted
      );

      // Convert to string
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data - invalid key or corrupted data');
    }
  }

  /**
   * Import encryption key from string
   * Uses SHA-256 to derive 256-bit key from passphrase
   */
  private async importKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(this.encryptionKey);

    // Hash the key material to get 256 bits
    const keyHash = await crypto.subtle.digest('SHA-256', keyMaterial);

    // Import as AES-GCM key
    return await crypto.subtle.importKey(
      'raw',
      keyHash,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    const binary = String.fromCharCode(...buffer);
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

/**
 * Helper function to encrypt SSO configuration fields
 * Encrypts: oauth_client_secret, ldap_bind_password, access_token, refresh_token
 */
export async function encryptSSOConfig(
  config: Record<string, any>,
  encryptionKey: string
): Promise<Record<string, any>> {
  const service = new ConfigEncryptionService(encryptionKey);
  const encrypted = { ...config };

  // Fields that need encryption
  const sensitiveFields = [
    'oauth_client_secret',
    'ldap_bind_password',
    'access_token',
    'refresh_token',
  ];

  for (const field of sensitiveFields) {
    if (encrypted[field]) {
      encrypted[field] = await service.encrypt(encrypted[field]);
    }
  }

  return encrypted;
}

/**
 * Helper function to decrypt SSO configuration fields
 */
export async function decryptSSOConfig(
  config: Record<string, any>,
  encryptionKey: string
): Promise<Record<string, any>> {
  const service = new ConfigEncryptionService(encryptionKey);
  const decrypted = { ...config };

  // Fields that need decryption
  const sensitiveFields = [
    'oauth_client_secret',
    'ldap_bind_password',
    'access_token',
    'refresh_token',
  ];

  for (const field of sensitiveFields) {
    if (decrypted[field]) {
      try {
        decrypted[field] = await service.decrypt(decrypted[field]);
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
        // Keep encrypted value if decryption fails
      }
    }
  }

  return decrypted;
}

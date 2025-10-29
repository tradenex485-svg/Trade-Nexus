/**
 * Password Validation Utility
 * Implements OWASP password security best practices
 */

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Common passwords to reject
 * In production, this should be a larger list or use an API like Have I Been Pwned
 */
const COMMON_PASSWORDS = new Set([
  'password123',
  'password',
  '12345678',
  '123456789',
  'qwerty123',
  'admin123',
  'welcome123',
  'password1',
  'letmein',
  'monkey123',
  'dragon123',
  'master123',
  'password123!',
  'welcome123!',
  'admin123!',
  'Password123',
  'Password123!',
  'Welcome123!',
  'Admin123!',
  'Qwerty123!',
]);

/**
 * Validates password against OWASP security requirements
 *
 * Requirements:
 * - Minimum 12 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 * - Not in common passwords list
 */
export function validatePassword(password: string): PasswordValidationResult {
  // Minimum length check (12 characters)
  if (password.length < 12) {
    return {
      valid: false,
      error: 'Password must be at least 12 characters long',
    };
  }

  // Maximum length check (prevent DoS)
  if (password.length > 128) {
    return {
      valid: false,
      error: 'Password must not exceed 128 characters',
    };
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter',
    };
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter',
    };
  }

  // Number check
  if (!/\d/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number',
    };
  }

  // Special character check
  if (!/[@$!%*?&#^()_+=\-[\]{}|\\:;"'<>,.\/]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one special character (@$!%*?&#^()_+=-[]{}|\\:;"\'<>,./)',
    };
  }

  // Common password check (case-insensitive)
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      valid: false,
      error: 'This password is too common. Please choose a different one.',
    };
  }

  // Check for sequential characters (123, abc, etc.)
  if (hasSequentialCharacters(password)) {
    return {
      valid: false,
      error: 'Password should not contain sequential characters (e.g., 123, abc)',
    };
  }

  // Check for repeated characters (aaa, 111, etc.)
  if (hasRepeatedCharacters(password)) {
    return {
      valid: false,
      error: 'Password should not contain repeated characters (e.g., aaa, 111)',
    };
  }

  return { valid: true };
}

/**
 * Check for sequential characters (3 or more)
 */
function hasSequentialCharacters(password: string): boolean {
  const sequences = [
    '0123456789',
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiopasdfghjklzxcvbnm',
  ];

  for (const sequence of sequences) {
    for (let i = 0; i < sequence.length - 2; i++) {
      const seq = sequence.slice(i, i + 3);
      const seqReverse = seq.split('').reverse().join('');

      if (
        password.toLowerCase().includes(seq) ||
        password.toLowerCase().includes(seqReverse)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check for repeated characters (3 or more)
 */
function hasRepeatedCharacters(password: string): boolean {
  for (let i = 0; i < password.length - 2; i++) {
    if (
      password[i] === password[i + 1] &&
      password[i] === password[i + 2]
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Generate password strength score (0-100)
 */
export function calculatePasswordStrength(password: string): number {
  let score = 0;

  // Length scoring
  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[@$!%*?&#^()_+=\-[\]{}|\\:;"'<>,.\/]/.test(password)) score += 10;

  // Additional complexity
  const uniqueChars = new Set(password).size;
  score += Math.min(20, Math.floor(uniqueChars / 2));

  return Math.min(100, score);
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(score: number): string {
  if (score < 40) return 'Weak';
  if (score < 60) return 'Fair';
  if (score < 80) return 'Good';
  return 'Strong';
}

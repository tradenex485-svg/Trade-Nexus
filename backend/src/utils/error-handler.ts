/**
 * Error Handling and Sanitization Utility
 * Prevents information disclosure through error messages
 */

export interface Bindings {
  NODE_ENV?: string;
  [key: string]: any;
}

/**
 * Sanitize error messages for client responses
 * In production, returns generic messages while logging detailed errors server-side
 */
export function sanitizeError(error: any, env?: Bindings): string {
  const isProduction = env?.NODE_ENV === 'production';

  // Log detailed error server-side
  console.error('[ERROR]', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    name: error.name,
  });

  // In production, return generic message
  if (isProduction) {
    // Map specific error types to user-friendly messages
    if (error.name === 'ValidationError') {
      return 'Invalid input provided. Please check your data and try again.';
    }

    if (error.name === 'UnauthorizedError') {
      return 'Authentication required. Please log in and try again.';
    }

    if (error.name === 'ForbiddenError') {
      return 'You do not have permission to perform this action.';
    }

    if (error.name === 'NotFoundError') {
      return 'The requested resource was not found.';
    }

    if (error.name === 'RateLimitError') {
      return 'Too many requests. Please try again later.';
    }

    // Default generic message for all other errors
    return 'An error occurred. Please try again or contact support if the problem persists.';
  }

  // In development, return detailed error message
  return error.message || 'An unknown error occurred';
}

/**
 * Sanitize data to remove sensitive fields before logging
 */
export function sanitizeLogData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apikey',
    'api_key',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'ssn',
    'social_security',
    'credit_card',
    'creditcard',
    'cvv',
    'pin',
    'private_key',
    'privatekey',
    'oauth_client_secret',
    'database_encryption_key',
    'jwt_secret',
  ];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Custom error classes for better error handling
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Secure logger that automatically sanitizes sensitive data
 */
export class SecureLogger {
  /**
   * Log informational message
   */
  static log(message: string, data?: any) {
    console.log(message, data ? sanitizeLogData(data) : '');
  }

  /**
   * Log error with sanitization
   */
  static error(message: string, error?: any) {
    console.error(message, error ? sanitizeLogData(error) : '');
  }

  /**
   * Log warning
   */
  static warn(message: string, data?: any) {
    console.warn(message, data ? sanitizeLogData(data) : '');
  }

  /**
   * Log debug information (only in development)
   */
  static debug(message: string, data?: any, env?: Bindings) {
    if (env?.NODE_ENV !== 'production') {
      console.debug(message, data ? sanitizeLogData(data) : '');
    }
  }
}

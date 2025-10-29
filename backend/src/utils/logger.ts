/**
 * Structured Logging Utility
 * Provides consistent, structured logging across the application
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogMetadata {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  requestId?: string;
  userId?: number;
  companyId?: number;
  metadata?: LogMetadata;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export class Logger {
  private context: string;
  private requestId?: string;
  private userId?: number;
  private companyId?: number;

  constructor(context: string, requestId?: string, userId?: number, companyId?: number) {
    this.context = context;
    this.requestId = requestId;
    this.userId = userId;
    this.companyId = companyId;
  }

  /**
   * Create a logger from a Hono context
   */
  static fromContext(context: string, c: any): Logger {
    const requestId = c.get('requestId');
    const user = c.get('user');
    const userId = user?.userId;
    const companyId = user?.companyId || c.get('companyId');

    return new Logger(context, requestId, userId, companyId);
  }

  /**
   * Low-level log method
   */
  private log(level: LogLevel, message: string, metadata?: LogMetadata, error?: Error): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
    };

    if (this.requestId) {
      logEntry.requestId = this.requestId;
    }

    if (this.userId) {
      logEntry.userId = this.userId;
    }

    if (this.companyId) {
      logEntry.companyId = this.companyId;
    }

    if (metadata && Object.keys(metadata).length > 0) {
      logEntry.metadata = metadata;
    }

    if (error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    // Output as JSON for structured logging
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Info level logging
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Warning level logging
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, metadata?: LogMetadata): void {
    this.log(LogLevel.ERROR, message, metadata, error);
  }

  /**
   * Log database query (for debugging performance)
   */
  query(query: string, duration?: number, metadata?: LogMetadata): void {
    this.debug('Database query executed', {
      query: query.substring(0, 200), // Truncate long queries
      duration,
      ...metadata,
    });
  }

  /**
   * Log API request
   */
  request(method: string, path: string, statusCode: number, duration: number, metadata?: LogMetadata): void {
    this.info('API request processed', {
      method,
      path,
      statusCode,
      duration,
      ...metadata,
    });
  }

  /**
   * Log security event
   */
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: LogMetadata): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    this.log(level, `Security event: ${event}`, {
      severity,
      ...metadata,
    });
  }

  /**
   * Log business metric/event
   */
  metric(metric: string, value: number, unit?: string, metadata?: LogMetadata): void {
    this.info(`Metric: ${metric}`, {
      metric,
      value,
      unit,
      ...metadata,
    });
  }

  /**
   * Log authentication event
   */
  auth(event: string, success: boolean, email?: string, metadata?: LogMetadata): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    this.log(level, `Auth event: ${event}`, {
      success,
      email,
      ...metadata,
    });
  }

  /**
   * Log data operation (create, update, delete)
   */
  dataOp(operation: 'create' | 'update' | 'delete', entity: string, entityId?: number, metadata?: LogMetadata): void {
    this.info(`Data operation: ${operation} ${entity}`, {
      operation,
      entity,
      entityId,
      ...metadata,
    });
  }
}

/**
 * Helper function to sanitize sensitive data before logging
 */
export function sanitizeForLog(data: any): any {
  if (!data) return data;

  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization'];
  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Format duration in milliseconds to human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Create a simple logger for quick use
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Centralized logging utility for Trade Nexus
 *
 * Usage:
 * - Development: All logs are output to console
 * - Production: Only errors are logged, info/debug are suppressed
 *
 * Future: Can be extended to send logs to monitoring service (e.g., Sentry)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;
  private serviceName: string;

  constructor(serviceName: string = 'TradeNexus') {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.serviceName = serviceName;
  }

  /**
   * Debug-level logging - only shown in development
   * Use for detailed diagnostic information
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[${this.serviceName}] ${message}`, context ? context : '');
    }
  }

  /**
   * Info-level logging - only shown in development
   * Use for general informational messages
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[${this.serviceName}] ${message}`, context ? context : '');
    }
  }

  /**
   * Warning-level logging - shown in both dev and production
   * Use for potentially harmful situations
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[${this.serviceName}] ⚠️ ${message}`, context ? context : '');
  }

  /**
   * Error-level logging - always shown
   * Use for error events
   *
   * In production, this could be extended to send to error tracking service
   */
  error(message: string, error?: Error | any, context?: LogContext): void {
    console.error(`[${this.serviceName}] ❌ ${message}`, {
      error: error?.message || error,
      stack: error?.stack,
      ...context,
    });

    // TODO: In production, send to error tracking service (e.g., Sentry)
    // if (!this.isDevelopment && typeof window !== 'undefined') {
    //   window.Sentry?.captureException(error, { extra: context });
    // }
  }

  /**
   * Create a child logger with a specific context (e.g., component name)
   */
  child(contextName: string): Logger {
    return new Logger(`${this.serviceName}:${contextName}`);
  }
}

// Export singleton instances for common use cases
export const logger = new Logger('TradeNexus');
export const authLogger = logger.child('Auth');
export const apiLogger = logger.child('API');
export const storeLogger = logger.child('Store');

// Export class for custom instances
export { Logger };

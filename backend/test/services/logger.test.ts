import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LogLevel, sanitizeForLog, formatDuration } from '../../src/utils/logger';

describe('Logger', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('basic logging', () => {
    it('should log info messages with correct format', () => {
      const logger = new Logger('TestContext');
      logger.info('Test message', { key: 'value' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.level).toBe(LogLevel.INFO);
      expect(logEntry.context).toBe('TestContext');
      expect(logEntry.message).toBe('Test message');
      expect(logEntry.metadata).toEqual({ key: 'value' });
      expect(logEntry.timestamp).toBeDefined();
    });

    it('should log error messages with error details', () => {
      const logger = new Logger('TestContext');
      const error = new Error('Test error');
      logger.error('Error occurred', error, { additional: 'data' });

      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.level).toBe(LogLevel.ERROR);
      expect(logEntry.message).toBe('Error occurred');
      expect(logEntry.error.message).toBe('Test error');
      expect(logEntry.error.stack).toBeDefined();
      expect(logEntry.metadata).toEqual({ additional: 'data' });
    });

    it('should log debug messages', () => {
      const logger = new Logger('TestContext');
      logger.debug('Debug info', { debugKey: 'debugValue' });

      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.level).toBe(LogLevel.DEBUG);
      expect(logEntry.message).toBe('Debug info');
    });

    it('should log warning messages', () => {
      const logger = new Logger('TestContext');
      logger.warn('Warning message');

      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.level).toBe(LogLevel.WARN);
      expect(logEntry.message).toBe('Warning message');
    });
  });

  describe('context enrichment', () => {
    it('should include request ID when provided', () => {
      const logger = new Logger('TestContext', 'req-123');
      logger.info('Test message');

      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.requestId).toBe('req-123');
    });

    it('should include user ID when provided', () => {
      const logger = new Logger('TestContext', undefined, 456);
      logger.info('Test message');

      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.userId).toBe(456);
    });

    it('should include company ID when provided', () => {
      const logger = new Logger('TestContext', undefined, undefined, 789);
      logger.info('Test message');

      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.companyId).toBe(789);
    });
  });

  describe('specialized logging methods', () => {
    it('should log query with truncation', () => {
      const logger = new Logger('TestContext');
      const longQuery = 'SELECT * FROM table WHERE ' + 'a'.repeat(300);
      logger.query(longQuery, 150, { rows: 100 });

      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.metadata.query.length).toBeLessThanOrEqual(200);
      expect(logEntry.metadata.duration).toBe(150);
      expect(logEntry.metadata.rows).toBe(100);
    });

    it('should log API request', () => {
      const logger = new Logger('TestContext');
      logger.request('POST', '/api/users', 201, 250);

      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.metadata.method).toBe('POST');
      expect(logEntry.metadata.path).toBe('/api/users');
      expect(logEntry.metadata.statusCode).toBe(201);
      expect(logEntry.metadata.duration).toBe(250);
    });

    it('should log security events with severity', () => {
      const logger = new Logger('TestContext');
      logger.security('Failed login attempt', 'high', { email: 'user@example.com' });

      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.level).toBe(LogLevel.ERROR); // high severity = error
      expect(logEntry.message).toContain('Failed login attempt');
      expect(logEntry.metadata.severity).toBe('high');
    });

    it('should log metrics', () => {
      const logger = new Logger('TestContext');
      logger.metric('api_response_time', 125.5, 'ms', { endpoint: '/api/users' });

      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.metadata.metric).toBe('api_response_time');
      expect(logEntry.metadata.value).toBe(125.5);
      expect(logEntry.metadata.unit).toBe('ms');
    });

    it('should log authentication events', () => {
      const logger = new Logger('TestContext');
      logger.auth('login', true, 'user@example.com');

      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.level).toBe(LogLevel.INFO);
      expect(logEntry.message).toContain('login');
      expect(logEntry.metadata.success).toBe(true);
      expect(logEntry.metadata.email).toBe('user@example.com');
    });

    it('should log failed auth as warning', () => {
      const logger = new Logger('TestContext');
      logger.auth('login', false, 'user@example.com');

      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.level).toBe(LogLevel.WARN);
      expect(logEntry.metadata.success).toBe(false);
    });

    it('should log data operations', () => {
      const logger = new Logger('TestContext');
      logger.dataOp('update', 'users', 123, { fields: ['email', 'name'] });

      const logCall = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.message).toContain('update users');
      expect(logEntry.metadata.operation).toBe('update');
      expect(logEntry.metadata.entity).toBe('users');
      expect(logEntry.metadata.entityId).toBe(123);
    });
  });
});

describe('sanitizeForLog', () => {
  it('should redact password fields', () => {
    const data = {
      email: 'user@example.com',
      password: 'secret123',
      name: 'John Doe',
    };

    const sanitized = sanitizeForLog(data);

    expect(sanitized.email).toBe('user@example.com');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.name).toBe('John Doe');
  });

  it('should redact token fields', () => {
    const data = {
      userId: 123,
      token: 'jwt-token-here',
      apiKey: 'api-key-here',
    };

    const sanitized = sanitizeForLog(data);

    expect(sanitized.userId).toBe(123);
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.apiKey).toBe('[REDACTED]');
  });

  it('should handle nested objects', () => {
    const data = {
      user: {
        email: 'user@example.com',
        password: 'secret',
      },
      auth: {
        token: 'jwt-token',
      },
    };

    const sanitized = sanitizeForLog(data);

    expect(sanitized.user.email).toBe('user@example.com');
    expect(sanitized.user.password).toBe('[REDACTED]');
    expect(sanitized.auth.token).toBe('[REDACTED]');
  });

  it('should handle null and undefined', () => {
    expect(sanitizeForLog(null)).toBeNull();
    expect(sanitizeForLog(undefined)).toBeUndefined();
  });
});

describe('formatDuration', () => {
  it('should format microseconds', () => {
    expect(formatDuration(0.5)).toContain('μs');
  });

  it('should format milliseconds', () => {
    expect(formatDuration(150)).toContain('ms');
  });

  it('should format seconds', () => {
    expect(formatDuration(5000)).toContain('s');
  });

  it('should format minutes', () => {
    expect(formatDuration(120000)).toContain('m');
  });
});

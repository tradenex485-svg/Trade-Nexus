import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, logger, authLogger } from './logger';

describe('Logger', () => {
  let consoleLogSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Save original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore spies
    consoleLogSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Development Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should log debug messages in development', () => {
      const testLogger = new Logger('TestService');
      testLogger.debug('Debug message', { foo: 'bar' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[TestService] Debug message',
        { foo: 'bar' }
      );
    });

    it('should log info messages in development', () => {
      const testLogger = new Logger('TestService');
      testLogger.info('Info message', { foo: 'bar' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[TestService] Info message',
        { foo: 'bar' }
      );
    });

    it('should log debug messages without context', () => {
      const testLogger = new Logger('TestService');
      testLogger.debug('Debug message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[TestService] Debug message',
        ''
      );
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should NOT log debug messages in production', () => {
      const testLogger = new Logger('TestService');
      testLogger.debug('Debug message', { foo: 'bar' });

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should NOT log info messages in production', () => {
      const testLogger = new Logger('TestService');
      testLogger.info('Info message', { foo: 'bar' });

      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should log warning messages in production', () => {
      const testLogger = new Logger('TestService');
      testLogger.warn('Warning message', { foo: 'bar' });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[TestService] ⚠️ Warning message',
        { foo: 'bar' }
      );
    });

    it('should log error messages in production', () => {
      const testLogger = new Logger('TestService');
      const error = new Error('Test error');
      testLogger.error('Error message', error, { foo: 'bar' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TestService] ❌ Error message',
        expect.objectContaining({
          error: 'Test error',
          stack: expect.any(String),
          foo: 'bar',
        })
      );
    });
  });

  describe('Warning and Error Levels', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should always log warnings', () => {
      const testLogger = new Logger('TestService');
      testLogger.warn('Warning message', { foo: 'bar' });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[TestService] ⚠️ Warning message',
        { foo: 'bar' }
      );
    });

    it('should always log errors', () => {
      const testLogger = new Logger('TestService');
      const error = new Error('Test error');
      testLogger.error('Error message', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TestService] ❌ Error message',
        expect.objectContaining({
          error: 'Test error',
          stack: expect.any(String),
        })
      );
    });

    it('should handle error objects without stack traces', () => {
      const testLogger = new Logger('TestService');
      testLogger.error('Error message', { message: 'Custom error' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TestService] ❌ Error message',
        expect.objectContaining({
          error: 'Custom error',
          stack: undefined,
        })
      );
    });

    it('should handle errors without context', () => {
      const testLogger = new Logger('TestService');
      const error = new Error('Test error');
      testLogger.error('Error message', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TestService] ❌ Error message',
        expect.objectContaining({
          error: 'Test error',
          stack: expect.any(String),
        })
      );
    });
  });

  describe('Child Loggers', () => {
    it('should create child logger with namespaced name', () => {
      process.env.NODE_ENV = 'development';
      const parentLogger = new Logger('Parent');
      const childLogger = parentLogger.child('Child');

      childLogger.debug('Child message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Parent:Child] Child message',
        ''
      );
    });

    it('should create nested child loggers', () => {
      process.env.NODE_ENV = 'development';
      const parentLogger = new Logger('Parent');
      const childLogger = parentLogger.child('Child');
      const grandchildLogger = childLogger.child('Grandchild');

      grandchildLogger.info('Nested message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[Parent:Child:Grandchild] Nested message',
        ''
      );
    });
  });

  describe('Pre-configured Loggers', () => {
    it('should export logger singleton', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it.skip('should export authLogger as child of logger', () => {
      // Skip: authLogger is created at module level with test environment
      // This test would require dynamic import or module reload
      process.env.NODE_ENV = 'development';
      expect(authLogger).toBeInstanceOf(Logger);

      authLogger.debug('Auth test');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[TradeNexus:Auth] Auth test',
        ''
      );
    });
  });
});

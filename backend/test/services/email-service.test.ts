import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService } from '../../src/services/email-service';

// Mock fetch globally
global.fetch = vi.fn();

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
    vi.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mailchannels.net/tx/v1/send',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle email send failure', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as Response);

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(result).toBe(false);
    });

    it('should handle network errors', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(result).toBe(false);
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email with correct format', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const result = await emailService.sendPasswordReset('user@example.com', '123456', 15);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalled();

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.personalizations[0].to[0].email).toBe('user@example.com');
      expect(body.subject).toContain('Password Reset');
      expect(body.content[0].value).toContain('123456');
      expect(body.content[0].value).toContain('15 minutes');
    });
  });

  describe('sendPositionBreachAlert', () => {
    it('should send breach alert with critical severity formatting', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const breach = {
        commodity_code: 'HH',
        market_location: 'NYMEX',
        pos_lots: 11000,
        limit_lots: 10000,
        utilization_pct: 110,
        severity: 'critical',
      };

      const result = await emailService.sendPositionBreachAlert('trader@example.com', breach);

      expect(result).toBe(true);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.subject).toContain('URGENT');
      expect(body.subject).toContain('HH');
      expect(body.content[0].value).toContain('11000');
      expect(body.content[0].value).toContain('10000');
      expect(body.content[0].value).toContain('110');
      expect(body.content[0].value).toContain('IMMEDIATE ACTION REQUIRED');
    });
  });

  describe('sendThresholdWarning', () => {
    it('should send threshold warning with proper data', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const warning = {
        commodity_code: 'CL',
        market_location: 'ICE',
        pos_lots: 8500,
        limit_lots: 10000,
        utilization_pct: 85,
        threshold_pct: 80,
      };

      const result = await emailService.sendThresholdWarning('trader@example.com', warning);

      expect(result).toBe(true);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.subject).toContain('Warning');
      expect(body.subject).toContain('CL');
      expect(body.content[0].value).toContain('85');
      expect(body.content[0].value).toContain('80');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email without temporary password', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const result = await emailService.sendWelcomeEmail('newuser@example.com', 'John Doe');

      expect(result).toBe(true);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.subject).toContain('Welcome');
      expect(body.content[0].value).toContain('John Doe');
      expect(body.content[0].value).not.toContain('temporary password');
    });

    it('should send welcome email with temporary password', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const result = await emailService.sendWelcomeEmail('newuser@example.com', 'John Doe', 'TempPass123');

      expect(result).toBe(true);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.content[0].value).toContain('TempPass123');
      expect(body.content[0].value).toContain('change your password');
    });
  });
});

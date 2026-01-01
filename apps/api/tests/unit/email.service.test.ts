import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService } from '../../src/services/mail/email.service';

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    })),
  },
}));

describe('EmailService', () => {
  describe('sendPasswordResetEmail', () => {
    it('should send email with reset link', async () => {
      const result = await EmailService.sendPasswordResetEmail(
        'test@example.com',
        'reset-token-123'
      );

      expect(result.success).toBe(true);
    });

    it('should include token in reset URL', async () => {
      // Test that email contains correct reset URL
      const spy = vi.spyOn(
        EmailService as typeof EmailService & {
          sendEmail: (to: string, subject: string, html: string) => Promise<unknown>;
        },
        'sendEmail'
      );

      await EmailService.sendPasswordResetEmail(
        'test@example.com',
        'reset-token-123'
      );

      expect(spy).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        expect.stringContaining('reset-token-123')
      );
    });
  });
});

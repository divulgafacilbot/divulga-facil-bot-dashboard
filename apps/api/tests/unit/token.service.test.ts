import { describe, it, expect, beforeEach } from 'vitest';
import { TokenService } from '../../src/services/auth/token.service';
import crypto from 'crypto';

describe('TokenService', () => {
  describe('generateJWT', () => {
    it('should generate valid JWT token', () => {
      const payload = { userId: '123', email: 'test@example.com', role: 'USER' };
      const token = TokenService.generateJWT(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyJWT', () => {
    it('should verify valid token', () => {
      const payload = { userId: '123', email: 'test@example.com', role: 'USER' };
      const token = TokenService.generateJWT(payload);
      const decoded = TokenService.verifyJWT(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe('123');
      expect(decoded?.email).toBe('test@example.com');
    });

    it('should reject invalid token', () => {
      const decoded = TokenService.verifyJWT('invalid-token');
      expect(decoded).toBeNull();
    });
  });

  describe('generateResetToken', () => {
    it('should generate random token', () => {
      const token = TokenService.generateResetToken();
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = TokenService.generateResetToken();
      const token2 = TokenService.generateResetToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should hash token consistently', () => {
      const token = 'test-token';
      const hash1 = TokenService.hashToken(token);
      const hash2 = TokenService.hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(token);
    });
  });
});

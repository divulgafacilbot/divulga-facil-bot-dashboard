import { describe, it, expect } from 'vitest';
import { PasswordService } from '../../src/services/auth/password.service';

describe('PasswordService', () => {
  describe('hash', () => {
    it('should hash password successfully', async () => {
      const password = 'Test123456!';
      const hash = await PasswordService.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'Test123456!';
      const hash1 = await PasswordService.hash(password);
      const hash2 = await PasswordService.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should verify correct password', async () => {
      const password = 'Test123456!';
      const hash = await PasswordService.hash(password);
      const isValid = await PasswordService.verify(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'Test123456!';
      const hash = await PasswordService.hash(password);
      const isValid = await PasswordService.verify('WrongPassword!', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('validate', () => {
    it('should accept valid password', () => {
      expect(PasswordService.validate('Test123456!')).toBe(true);
    });

    it('should reject password shorter than 8 characters', () => {
      expect(PasswordService.validate('Test12!')).toBe(false);
    });

    it('should reject password without uppercase', () => {
      expect(PasswordService.validate('test123456!')).toBe(false);
    });

    it('should reject password without lowercase', () => {
      expect(PasswordService.validate('TEST123456!')).toBe(false);
    });

    it('should reject password without number', () => {
      expect(PasswordService.validate('TestPassword!')).toBe(false);
    });
  });
});

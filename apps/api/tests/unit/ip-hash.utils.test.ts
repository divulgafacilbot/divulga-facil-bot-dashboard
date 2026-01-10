/**
 * IP Hash Utilities - Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Request } from 'express';
import {
  truncateIP,
  hashIP,
  getIPFromRequest,
  getHashedIPFromRequest,
  validateIPHashConfig,
  generateSecureIPSalt,
} from '../../src/utils/ip-hash.utils.js';

// Mock Request
function createMockRequest(options: {
  ip?: string;
  headers?: Record<string, string | string[]>;
  socket?: { remoteAddress?: string };
}): Request {
  return {
    ip: options.ip,
    headers: options.headers || {},
    socket: options.socket || {},
  } as Request;
}

describe('IP Hash Utils', () => {
  describe('truncateIP', () => {
    it('should truncate IPv4 to /24 (3 octets)', () => {
      expect(truncateIP('192.168.1.100')).toBe('192.168.1.0');
      expect(truncateIP('10.0.0.1')).toBe('10.0.0.0');
      expect(truncateIP('172.16.254.255')).toBe('172.16.254.0');
    });

    it('should truncate IPv6 to /64 (4 groups)', () => {
      expect(truncateIP('2001:0db8:85a3:08d3:1319:8a2e:0370:7344')).toBe(
        '2001:0db8:85a3:08d3::'
      );
      expect(truncateIP('fe80:0000:0000:0000:0204:61ff:fe9d:f156')).toBe(
        'fe80:0000:0000:0000::'
      );
    });

    it('should handle IPv4-mapped IPv6 addresses', () => {
      expect(truncateIP('::ffff:192.168.1.100')).toBe('192.168.1.0');
      expect(truncateIP('::ffff:10.0.0.1')).toBe('10.0.0.0');
    });

    it('should handle short IPv6 addresses', () => {
      expect(truncateIP('2001:db8::1')).toBe('2001:db8::');
      expect(truncateIP('fe80::1')).toBe('fe80::');
    });

    it('should handle invalid IPs gracefully', () => {
      expect(truncateIP('invalid')).toBe('invalid');
      expect(truncateIP('192.168')).toBe('192.168');
    });
  });

  describe('hashIP', () => {
    const testSalt = 'test-salt-123';

    it('should generate consistent hash for same IP', () => {
      const hash1 = hashIP('192.168.1.100', testSalt);
      const hash2 = hashIP('192.168.1.100', testSalt);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different IPs', () => {
      const hash1 = hashIP('192.168.1.100', testSalt);
      const hash2 = hashIP('192.168.1.101', testSalt);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes with different salts', () => {
      const hash1 = hashIP('192.168.1.100', 'salt1');
      const hash2 = hashIP('192.168.1.100', 'salt2');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex hash (SHA-256)', () => {
      const hash = hashIP('192.168.1.100', testSalt);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should hash truncated IP, not raw IP', () => {
      const hash1 = hashIP('192.168.1.100', testSalt);
      const hash2 = hashIP('192.168.1.200', testSalt);

      // Both should hash to same value because they truncate to 192.168.1.0
      expect(hash1).toBe(hash2);
    });

    it('should use default salt if none provided', () => {
      const hash = hashIP('192.168.1.100');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should handle IPv6 addresses', () => {
      const hash = hashIP('2001:0db8:85a3:08d3:1319:8a2e:0370:7344', testSalt);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('getIPFromRequest', () => {
    it('should extract IP from X-Forwarded-For header (single)', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '203.0.113.1',
        },
      });

      expect(getIPFromRequest(req)).toBe('203.0.113.1');
    });

    it('should extract first IP from X-Forwarded-For chain', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1',
        },
      });

      expect(getIPFromRequest(req)).toBe('203.0.113.1');
    });

    it('should handle X-Forwarded-For as array', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': ['203.0.113.1, 198.51.100.1', '192.0.2.1'],
        },
      });

      expect(getIPFromRequest(req)).toBe('203.0.113.1');
    });

    it('should extract IP from X-Real-IP header', () => {
      const req = createMockRequest({
        headers: {
          'x-real-ip': '203.0.113.1',
        },
      });

      expect(getIPFromRequest(req)).toBe('203.0.113.1');
    });

    it('should prioritize X-Forwarded-For over X-Real-IP', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'x-real-ip': '198.51.100.1',
        },
      });

      expect(getIPFromRequest(req)).toBe('203.0.113.1');
    });

    it('should extract IP from req.ip', () => {
      const req = createMockRequest({
        ip: '192.168.1.100',
      });

      expect(getIPFromRequest(req)).toBe('192.168.1.100');
    });

    it('should extract IP from socket.remoteAddress', () => {
      const req = createMockRequest({
        socket: { remoteAddress: '192.168.1.100' },
      });

      expect(getIPFromRequest(req)).toBe('192.168.1.100');
    });

    it('should return fallback IP if none found', () => {
      const req = createMockRequest({});

      expect(getIPFromRequest(req)).toBe('0.0.0.0');
    });

    it('should trim whitespace from IPs', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '  203.0.113.1  ',
        },
      });

      expect(getIPFromRequest(req)).toBe('203.0.113.1');
    });
  });

  describe('getHashedIPFromRequest', () => {
    it('should extract and hash IP from request', () => {
      const req = createMockRequest({
        ip: '192.168.1.100',
      });

      const hash = getHashedIPFromRequest(req, 'test-salt');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be consistent for same IP', () => {
      const req1 = createMockRequest({ ip: '192.168.1.100' });
      const req2 = createMockRequest({ ip: '192.168.1.100' });

      const hash1 = getHashedIPFromRequest(req1, 'test-salt');
      const hash2 = getHashedIPFromRequest(req2, 'test-salt');

      expect(hash1).toBe(hash2);
    });

    it('should handle X-Forwarded-For header', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '203.0.113.1',
        },
      });

      const hash = getHashedIPFromRequest(req, 'test-salt');

      expect(hash).toHaveLength(64);
    });
  });

  describe('validateIPHashConfig', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSalt = process.env.IP_HASH_SALT;

    beforeEach(() => {
      // Reset env for each test
      process.env.NODE_ENV = originalEnv;
      process.env.IP_HASH_SALT = originalSalt;
    });

    it('should not throw in development mode', () => {
      process.env.NODE_ENV = 'development';
      process.env.IP_HASH_SALT = '';

      expect(() => validateIPHashConfig()).not.toThrow();
    });

    it('should throw in production if salt not set', () => {
      process.env.NODE_ENV = 'production';
      process.env.IP_HASH_SALT = '';

      expect(() => validateIPHashConfig()).toThrow(
        'IP_HASH_SALT environment variable is required'
      );
    });

    it('should throw in production if default salt used', () => {
      process.env.NODE_ENV = 'production';
      process.env.IP_HASH_SALT = 'default-salt-change-me';

      expect(() => validateIPHashConfig()).toThrow(
        'IP_HASH_SALT must be changed from default value'
      );
    });

    it('should throw in production if salt too short', () => {
      process.env.NODE_ENV = 'production';
      process.env.IP_HASH_SALT = 'short';

      expect(() => validateIPHashConfig()).toThrow(
        'IP_HASH_SALT must be at least 32 characters'
      );
    });

    it('should not throw in production with valid salt', () => {
      process.env.NODE_ENV = 'production';
      process.env.IP_HASH_SALT = 'a'.repeat(32);

      expect(() => validateIPHashConfig()).not.toThrow();
    });
  });

  describe('generateSecureIPSalt', () => {
    it('should generate 64-character hex string', () => {
      const salt = generateSecureIPSalt();

      expect(salt).toHaveLength(64);
      expect(salt).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique salts', () => {
      const salt1 = generateSecureIPSalt();
      const salt2 = generateSecureIPSalt();

      expect(salt1).not.toBe(salt2);
    });

    it('should generate cryptographically secure salts', () => {
      const salt = generateSecureIPSalt();

      // At least some entropy (not all same character)
      const uniqueChars = new Set(salt.split('')).size;
      expect(uniqueChars).toBeGreaterThan(10);
    });
  });
});

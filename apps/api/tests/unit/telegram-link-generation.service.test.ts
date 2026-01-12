import { BotType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../src/db/prisma.js';
import { TelegramLinkGenerationService } from '../../src/services/telegram/link-generation.service.js';

vi.mock('../../src/db/prisma.js', () => ({
  prisma: {
    telegram_link_tokens: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('TelegramLinkGenerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateLinkToken', () => {
    it('should generate a valid token for ARTS bot', async () => {
      const mockToken = {
        id: 'test-id',
        token: 'ABCD123456',
        user_id: 'user-123',
        bot_type: 'ARTS' as BotType,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
        created_at: new Date(),
      };

      vi.mocked(prisma.telegram_link_tokens.create).mockResolvedValue(mockToken);

      const result = await TelegramLinkGenerationService.generateLinkToken('user-123', 'ARTS' as BotType);

      expect(result).toHaveProperty('token');
      expect(result.token).toHaveLength(10);
      expect(result.botType).toBe('ARTS');
      expect(result.botName).toBe('Bot de Artes');
      expect(result.telegramHandle).toBe('@DivulgaFacilArtesBot');
      expect(result.instructions).toContain(result.token);
      expect(result.expiresAt).toBeDefined();
    });

    it('should generate a valid token for DOWNLOAD bot', async () => {
      const mockToken = {
        id: 'test-id',
        token: 'EFGH789012',
        user_id: 'user-456',
        bot_type: 'DOWNLOAD' as BotType,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
        created_at: new Date(),
      };

      vi.mocked(prisma.telegram_link_tokens.create).mockResolvedValue(mockToken);

      const result = await TelegramLinkGenerationService.generateLinkToken('user-456', 'DOWNLOAD' as BotType);

      expect(result.botType).toBe('DOWNLOAD');
      expect(result.botName).toBe('Bot de Download');
      expect(result.telegramHandle).toBe('@DivulgaFacilDownloadBot');
    });

    it('should generate a valid token for PINTEREST bot', async () => {
      const mockToken = {
        id: 'test-id',
        token: 'IJKL345678',
        user_id: 'user-789',
        bot_type: 'PINTEREST' as BotType,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
        created_at: new Date(),
      };

      vi.mocked(prisma.telegram_link_tokens.create).mockResolvedValue(mockToken);

      const result = await TelegramLinkGenerationService.generateLinkToken('user-789', 'PINTEREST' as BotType);

      expect(result.botType).toBe('PINTEREST');
      expect(result.botName).toBe('Bot de Pins');
      expect(result.telegramHandle).toBe('@DivulgaFacilPinterestBot');
      expect(result.instructions).toContain('criar cards automáticos');
    });

    it('should generate a valid token for SUGGESTION bot', async () => {
      const mockToken = {
        id: 'test-id',
        token: 'MNOP901234',
        user_id: 'user-012',
        bot_type: 'SUGGESTION' as BotType,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
        created_at: new Date(),
      };

      vi.mocked(prisma.telegram_link_tokens.create).mockResolvedValue(mockToken);

      const result = await TelegramLinkGenerationService.generateLinkToken('user-012', 'SUGGESTION' as BotType);

      expect(result.botType).toBe('SUGGESTION');
      expect(result.botName).toBe('Bot de Sugestões');
      expect(result.telegramHandle).toBe('@DivulgaFacilSugestaoBot');
      expect(result.instructions).toContain('sugestões personalizadas');
    });

    it('should create token with 10 minute expiry', async () => {
      const beforeGeneration = Date.now();

      const mockToken = {
        id: 'test-id',
        token: 'TOKEN12345',
        user_id: 'user-123',
        bot_type: 'ARTS' as BotType,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
        created_at: new Date(),
      };

      vi.mocked(prisma.telegram_link_tokens.create).mockResolvedValue(mockToken);

      const result = await TelegramLinkGenerationService.generateLinkToken('user-123', 'ARTS' as BotType);

      const expiresAt = new Date(result.expiresAt).getTime();
      const expectedExpiry = beforeGeneration + 10 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid non-expired token', async () => {
      const mockToken = {
        id: 'test-id',
        token: 'VALID12345',
        user_id: 'user-123',
        bot_type: 'ARTS' as BotType,
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
        created_at: new Date(),
      };

      vi.mocked(prisma.telegram_link_tokens.findUnique).mockResolvedValue(mockToken);

      const result = await TelegramLinkGenerationService.verifyToken('VALID12345');

      expect(result).toEqual({
        valid: true,
        userId: 'user-123',
        botType: 'ARTS',
      });
    });

    it('should reject an expired token', async () => {
      const mockToken = {
        id: 'test-id',
        token: 'EXPIRED123',
        user_id: 'user-123',
        bot_type: 'ARTS' as BotType,
        expires_at: new Date(Date.now() - 1000),
        created_at: new Date(),
      };

      vi.mocked(prisma.telegram_link_tokens.findUnique).mockResolvedValue(mockToken);

      const result = await TelegramLinkGenerationService.verifyToken('EXPIRED123');

      expect(result).toEqual({
        valid: false,
        error: 'Token expirado',
      });
    });

    it('should reject a non-existent token', async () => {
      vi.mocked(prisma.telegram_link_tokens.findUnique).mockResolvedValue(null);

      const result = await TelegramLinkGenerationService.verifyToken('NOTFOUND12');

      expect(result).toEqual({
        valid: false,
        error: 'Token inválido',
      });
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete all expired tokens', async () => {
      vi.mocked(prisma.telegram_link_tokens.deleteMany).mockResolvedValue({ count: 5 });

      const result = await TelegramLinkGenerationService.cleanupExpiredTokens();

      expect(result).toEqual({ deletedCount: 5 });
      expect(prisma.telegram_link_tokens.deleteMany).toHaveBeenCalledWith({
        where: {
          expires_at: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should return zero when no expired tokens exist', async () => {
      vi.mocked(prisma.telegram_link_tokens.deleteMany).mockResolvedValue({ count: 0 });

      const result = await TelegramLinkGenerationService.cleanupExpiredTokens();

      expect(result).toEqual({ deletedCount: 0 });
    });
  });

  describe('getUserTokens', () => {
    it('should return all active tokens for a user', async () => {
      const mockTokens = [
        {
          id: 'token-1',
          token: 'TOKEN11111',
          user_id: 'user-123',
          bot_type: 'ARTS' as BotType,
          expires_at: new Date(Date.now() + 5 * 60 * 1000),
          created_at: new Date(),
        },
        {
          id: 'token-2',
          token: 'TOKEN22222',
          user_id: 'user-123',
          bot_type: 'DOWNLOAD' as BotType,
          expires_at: new Date(Date.now() + 8 * 60 * 1000),
          created_at: new Date(),
        },
      ];

      vi.mocked(prisma.telegram_link_tokens.findMany).mockResolvedValue(mockTokens);

      const result = await TelegramLinkGenerationService.getUserTokens('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].token).toBe('TOKEN11111');
      expect(result[1].token).toBe('TOKEN22222');
    });

    it('should return empty array when user has no tokens', async () => {
      vi.mocked(prisma.telegram_link_tokens.findMany).mockResolvedValue([]);

      const result = await TelegramLinkGenerationService.getUserTokens('user-123');

      expect(result).toHaveLength(0);
    });
  });
});

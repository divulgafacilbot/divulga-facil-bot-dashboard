import { z } from 'zod';

// Bot type validation
export const botTypeSchema = z.enum(['ARTS', 'DOWNLOAD'], {
  errorMap: () => ({ message: 'Bot type must be either ARTS or DOWNLOAD' }),
});

// Link token generation schema
export const linkTokenRequestSchema = z.object({
  botType: botTypeSchema,
});

// Confirm link schema
export const confirmLinkSchema = z.object({
  token: z.string().min(32, 'Token must be at least 32 characters'),
  telegramUserId: z.string().regex(/^\d+$/, 'Telegram User ID must be numeric'),
  chatId: z.string().regex(/^-?\d+$/, 'Chat ID must be numeric'),
});

export type BotType = z.infer<typeof botTypeSchema>;
export type LinkTokenRequest = z.infer<typeof linkTokenRequestSchema>;
export type ConfirmLink = z.infer<typeof confirmLinkSchema>;

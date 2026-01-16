import { z } from 'zod';
import { BOT_TYPES } from '../constants/bot-types.js';

// Bot type validation - all bot types supported
export const botTypeSchema = z.enum([
  BOT_TYPES.PROMOCOES,
  BOT_TYPES.DOWNLOAD,
  BOT_TYPES.PINTEREST,
  BOT_TYPES.SUGGESTION,
], {
  errorMap: () => ({ message: 'Tipo de bot inválido. Valores permitidos: PROMOCOES, DOWNLOAD, PINTEREST, SUGGESTION' }),
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

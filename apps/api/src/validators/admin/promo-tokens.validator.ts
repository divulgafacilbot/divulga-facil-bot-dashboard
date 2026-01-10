import { z } from 'zod';
import { BOT_TYPES } from '../../constants/bot-types.js';

/**
 * Schema for creating a promotional token
 */
export const createPromoTokenSchema = z.object({
  botType: z.enum([BOT_TYPES.ARTS, BOT_TYPES.DOWNLOAD, BOT_TYPES.PINTEREST, BOT_TYPES.SUGGESTION], {
    required_error: 'Bot type is required',
    invalid_type_error: 'Invalid bot type',
  }),
  userId: z.string().uuid('Invalid user ID format'),
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name must be at least 1 character')
    .max(100, 'Name must be at most 100 characters'),
  description: z
    .string()
    .max(5000, 'Description must be at most 5000 characters')
    .optional(),
  expiresAt: z
    .string()
    .datetime({ message: 'Invalid date format. Use ISO 8601 format' })
    .refine(
      (dateStr) => new Date(dateStr) > new Date(),
      'Expiration date must be in the future'
    )
    .optional(),
});

/**
 * Schema for updating a promotional token
 */
export const updatePromoTokenSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name must be at least 1 character')
      .max(100, 'Name must be at most 100 characters')
      .optional(),
    description: z
      .string()
      .max(5000, 'Description must be at most 5000 characters')
      .optional(),
    expiresAt: z
      .string()
      .datetime({ message: 'Invalid date format. Use ISO 8601 format' })
      .refine(
        (dateStr) => new Date(dateStr) > new Date(),
        'Expiration date must be in the future'
      )
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * Schema for query parameters when listing promotional tokens
 */
export const getPromoTokensQuerySchema = z.object({
  botType: z
    .enum([BOT_TYPES.ARTS, BOT_TYPES.DOWNLOAD, BOT_TYPES.PINTEREST, BOT_TYPES.SUGGESTION])
    .optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .default('1')
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100))
    .default('50')
    .optional(),
});

/**
 * Schema for token ID parameter
 */
export const tokenIdParamSchema = z.object({
  id: z.string().uuid('Invalid token ID format'),
});

export type CreatePromoTokenInput = z.infer<typeof createPromoTokenSchema>;
export type UpdatePromoTokenInput = z.infer<typeof updatePromoTokenSchema>;
export type GetPromoTokensQuery = z.infer<typeof getPromoTokensQuerySchema>;
export type TokenIdParam = z.infer<typeof tokenIdParamSchema>;

import { z } from 'zod';

/**
 * Marketplace enum schema
 */
export const marketplaceSchema = z.enum(['MERCADO_LIVRE', 'SHOPEE', 'AMAZON', 'MAGALU']);

/**
 * Marketplace type
 */
export type Marketplace = z.infer<typeof marketplaceSchema>;

/**
 * Card schema with Zod validation
 */
export const cardSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  image_url: z.string().url(),
  affiliate_url: z.string().url(),
  marketplace: marketplaceSchema,
  category: z.string(),
  price: z.number().optional(),
  original_price: z.number().optional(),
  discount_percent: z.number().optional(),
  coupon_code: z.string().optional(),
  is_featured: z.boolean(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT', 'HIDDEN']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Card type inferred from schema
 */
export type Card = z.infer<typeof cardSchema>;

/**
 * Card list response schema
 */
export const cardListResponseSchema = z.object({
  items: z.array(cardSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
});

/**
 * Card list response type
 */
export type CardListResponse = z.infer<typeof cardListResponseSchema>;

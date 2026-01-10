import { z } from 'zod';

/**
 * Marketplace Product Types and Validators
 */

export const MarketplaceProductSourceSchema = z.enum(['BOT', 'MANUAL']);
export type MarketplaceProductSource = z.infer<typeof MarketplaceProductSourceSchema>;

export const CreateMarketplaceProductSchema = z.object({
  source: MarketplaceProductSourceSchema,
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  price: z.number().positive().optional(),
  originalPrice: z.number().positive().optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  category: z.string().max(100).optional(),
  affiliateUrl: z.string().url(),
  imageUrl: z.string().url(),
  marketplace: z.string().max(50),
  couponCode: z.string().max(100).optional(),
  customNote: z.string().max(5000).optional(),
  isFeatured: z.boolean().optional(),
});

export const UpdateMarketplaceProductSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  price: z.number().positive().optional(),
  originalPrice: z.number().positive().optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  category: z.string().max(100).optional(),
  affiliateUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  marketplace: z.string().max(50).optional(),
  couponCode: z.string().max(100).optional(),
  customNote: z.string().max(5000).optional(),
  isHidden: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const ListMarketplaceProductsQuerySchema = z.object({
  category: z.string().optional(),
  marketplace: z.string().optional(),
  isHidden: z.string().transform((val) => val === 'true').optional(),
  isFeatured: z.string().transform((val) => val === 'true').optional(),
  search: z.string().optional(),
  page: z.string().transform((val) => parseInt(val, 10)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).optional(),
});

export type CreateMarketplaceProductInput = z.infer<typeof CreateMarketplaceProductSchema>;
export type UpdateMarketplaceProductInput = z.infer<typeof UpdateMarketplaceProductSchema>;
export type ListMarketplaceProductsQuery = z.infer<typeof ListMarketplaceProductsQuerySchema>;

/**
 * Validator helper functions
 */
export function validateCreateMarketplaceProduct(data: unknown) {
  return CreateMarketplaceProductSchema.parse(data);
}

export function validateUpdateMarketplaceProduct(data: unknown) {
  return UpdateMarketplaceProductSchema.parse(data);
}

export function validateListMarketplaceProductsQuery(data: unknown) {
  return ListMarketplaceProductsQuerySchema.parse(data);
}

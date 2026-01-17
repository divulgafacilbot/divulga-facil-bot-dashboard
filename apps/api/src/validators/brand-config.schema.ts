import { z } from 'zod';

// Regex for hex color validation (#RRGGBB or #RGB)
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const brandConfigSchema = z.object({
  templateId: z.string().min(1).max(100).optional(),
  bgColor: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
  textColor: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
  priceColor: z.string().regex(hexColorRegex, 'Invalid hex color format').optional().nullable(),
  fontFamily: z.string().min(1).max(100).optional(),
  showCoupon: z.boolean().optional(),
  couponText: z.string().max(50).optional().nullable(), // Allow empty string
  ctaText: z.string().max(100).optional().nullable(), // Allow empty string
  customImageUrl: z.string().url('Invalid URL format').max(500).optional().nullable().or(z.literal('')), // Allow empty string
}).passthrough(); // Accept extra fields without rejecting

export const brandConfigUpdateSchema = brandConfigSchema.partial();

export type BrandConfig = z.infer<typeof brandConfigSchema>;
export type BrandConfigUpdate = z.infer<typeof brandConfigUpdateSchema>;

// Default brand config values
export const DEFAULT_BRAND_CONFIG = {
  templateId: 'default',
  bgColor: '#FFFFFF',
  textColor: '#000000',
  priceColor: null,
  fontFamily: 'Inter',
  showCoupon: true,
  couponText: null,
  ctaText: null,
  customImageUrl: null,
} as const;

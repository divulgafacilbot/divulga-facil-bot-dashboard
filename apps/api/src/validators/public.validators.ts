import { z } from 'zod';

export const ListCardsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(48).optional().default(24),
  marketplace: z.enum(['MERCADO_LIVRE', 'SHOPEE', 'AMAZON', 'MAGALU']).optional(),
  category: z.string().max(100).optional()
});

export const TrackEventBodySchema = z.object({
  eventType: z.enum([
    'PUBLIC_PROFILE_VIEW',
    'PUBLIC_CARD_VIEW',
    'PUBLIC_CTA_CLICK',
    'PUBLIC_CARD_CLICK'
  ]),
  slug: z.string().min(3).max(30),
  cardSlug: z.string().max(50).optional(),
  referrer: z.string().max(200).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  visitorId: z.string().max(50).optional()
});

export const SlugParamSchema = z.object({
  slug: z.string().min(3).max(30)
});

export const CardSlugParamSchema = z.object({
  slug: z.string().min(3).max(30),
  cardSlug: z.string().max(50)
});

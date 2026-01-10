import { z } from 'zod';

/**
 * Bot metrics schema
 */
export const botMetricsSchema = z.object({
  arts: z.number().int().min(0),
  download: z.number().int().min(0),
  pinterest: z.number().int().min(0),
  suggestion: z.number().int().min(0),
});

/**
 * Usage metrics schema
 */
export const usageMetricsSchema = z.object({
  renders: z.number().int().min(0),
  downloads: z.number().int().min(0),
});

/**
 * Public page metrics schema
 */
export const publicPageMetricsSchema = z.object({
  profileViews: z.number().int().min(0),
  cardViews: z.number().int().min(0),
  cardClicks: z.number().int().min(0),
  ctr: z.number().min(0).max(100),
});

/**
 * Bot metrics type
 */
export type BotMetrics = z.infer<typeof botMetricsSchema>;

/**
 * Usage metrics type
 */
export type UsageMetrics = z.infer<typeof usageMetricsSchema>;

/**
 * Public page metrics type
 */
export type PublicPageMetrics = z.infer<typeof publicPageMetricsSchema>;

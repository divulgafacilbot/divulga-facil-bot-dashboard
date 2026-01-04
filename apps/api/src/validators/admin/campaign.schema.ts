import { z } from 'zod';

/**
 * Schema for creating a new campaign
 * Validates campaign data and ensures required fields are present
 */
export const createCampaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(255, 'Campaign name must be less than 255 characters')
    .trim(),

  price: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
    .pipe(
      z
        .number()
        .positive('Price must be a positive number')
        .multipleOf(0.01, 'Price must have at most 2 decimal places')
        .max(99999999.99, 'Price is too large')
    ),

  product_url: z
    .string()
    .url('Product URL must be a valid URL')
    .max(500, 'Product URL must be less than 500 characters')
    .trim(),
});

/**
 * Schema for file type validation
 * Used to validate uploaded files for main video and assets
 */
export const fileTypeSchema = z.object({
  main_video: z.object({
    mimetype: z
      .string()
      .refine(
        (type) => type.startsWith('video/'),
        'Main video must be a video file (video/*)'
      ),
  }),

  assets: z
    .array(
      z.object({
        mimetype: z
          .string()
          .refine(
            (type) => type.startsWith('image/') || type.startsWith('video/'),
            'Assets must be image or video files (image/* or video/*)'
          ),
      })
    )
    .optional(),
});

/**
 * Type inference for campaign creation
 */
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

import { z } from 'zod';

/**
 * API error schema
 */
export const apiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  statusCode: z.number().optional(),
});

/**
 * API error type
 */
export type ApiError = z.infer<typeof apiErrorSchema>;

/**
 * Generic API response schema factory
 * @param dataSchema - Zod schema for the data payload
 * @returns Zod schema for API response
 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: apiErrorSchema.optional(),
  });

/**
 * Generic API response type
 */
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
};

/**
 * Environment variable validation using Zod
 * All env vars are validated at build/runtime for type-safety
 */

import { z } from 'zod';

/**
 * Environment variable schema
 * Defines all required and optional environment variables with validation
 */
const envSchema = z.object({
  /**
   * Base URL for the API
   * Must be a valid URL
   * @default 'http://localhost:4000'
   */
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:4000'),

  /**
   * Alternative API URL (if different from base)
   * Optional, but must be a valid URL if provided
   */
  NEXT_PUBLIC_API_URL: z.string().url().optional(),

  /**
   * Web application URL
   * Must be a valid URL
   * @default 'http://localhost:3000'
   */
  NEXT_PUBLIC_WEB_URL: z.string().url().default('http://localhost:3000'),

  /**
   * Node environment
   * @default 'development'
   */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Validates environment variables using the schema
 * Throws an error if validation fails
 * @returns Validated environment variables
 */
function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

/**
 * Validated environment variables
 * Use this instead of process.env for type-safety
 *
 * @example
 * import { env } from '@/lib/config/env';
 *
 * const apiUrl = env.NEXT_PUBLIC_API_BASE_URL;
 */
export const env = validateEnv();

/**
 * Type inference from the schema
 */
export type Env = z.infer<typeof envSchema>;

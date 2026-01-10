import { z } from 'zod';

/**
 * User schema with Zod validation
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['USER', 'ADMIN']),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * User type inferred from schema
 */
export type User = z.infer<typeof userSchema>;

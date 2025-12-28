/**
 * User Service
 *
 * Handles user data retrieval and transformation to DTOs.
 * This service ensures proper data isolation and prepares placeholder
 * data for future milestones (subscription, telegram).
 */

import { prisma } from '../../db/prisma.js';

/**
 * User Data Transfer Object
 *
 * This DTO represents the user data exposed to clients.
 * - Excludes sensitive data (passwordHash)
 * - Includes placeholders for future features
 */
export interface UserDTO {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  subscription: null; // Placeholder for Milestone 4
  telegram: {
    linked: boolean; // Placeholder for Milestone 5 (always false for now)
  };
}

/**
 * Get user by ID and transform to DTO
 *
 * @param userId - UUID of the user
 * @returns UserDTO or null if user not found
 *
 * Security:
 * - Does NOT include passwordHash in response
 * - Always returns subscription as null (not implemented yet)
 * - Always returns telegram.linked as false (not implemented yet)
 */
export async function getUserById(userId: string): Promise<UserDTO | null> {
  // Query database for user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  // Return null if user not found
  if (!user) {
    return null;
  }

  // Transform to DTO
  // CRITICAL: Do NOT include passwordHash
  const userDTO: UserDTO = {
    id: user.id,
    email: user.email,
    role: user.role as 'USER' | 'ADMIN',
    isActive: user.isActive ?? true,
    createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),

    // Placeholder for Milestone 4 (Subscription system)
    subscription: null,

    // Placeholder for Milestone 5 (Telegram connection)
    telegram: {
      linked: false,
    },
  };

  return userDTO;
}

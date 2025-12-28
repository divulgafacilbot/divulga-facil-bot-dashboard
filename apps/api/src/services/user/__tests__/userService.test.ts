import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserById } from '../userService';
import { prisma } from '../../../db/prisma.js';

// Mock Prisma
vi.mock('../../../db/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('User Service - getUserById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user DTO with correct data when user exists', async () => {
    // Arrange
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      role: 'USER',
      isActive: true,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      passwordHash: 'hashed_password', // Should be excluded from DTO
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    // Act
    const result = await getUserById(mockUser.id);

    // Assert
    expect(result).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      isActive: mockUser.isActive,
      createdAt: mockUser.createdAt.toISOString(),
      subscription: null,
      telegram: {
        linked: false,
      },
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: mockUser.id },
    });
  });

  it('should return null when user does not exist', async () => {
    // Arrange
    (prisma.user.findUnique as any).mockResolvedValue(null);

    // Act
    const result = await getUserById('nonexistent-id');

    // Assert
    expect(result).toBeNull();
  });

  it('should always return subscription as null (placeholder for Milestone 4)', async () => {
    // Arrange
    const mockUser = {
      id: 'user-id',
      email: 'user@example.com',
      role: 'USER',
      isActive: true,
      createdAt: new Date(),
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    // Act
    const result = await getUserById(mockUser.id);

    // Assert
    expect(result?.subscription).toBeNull();
  });

  it('should always return telegram.linked as false (placeholder for Milestone 5)', async () => {
    // Arrange
    const mockUser = {
      id: 'user-id',
      email: 'user@example.com',
      role: 'USER',
      isActive: true,
      createdAt: new Date(),
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    // Act
    const result = await getUserById(mockUser.id);

    // Assert
    expect(result?.telegram).toEqual({ linked: false });
  });

  it('should not include passwordHash in returned DTO', async () => {
    // Arrange
    const mockUser = {
      id: 'user-id',
      email: 'user@example.com',
      role: 'USER',
      isActive: true,
      createdAt: new Date(),
      passwordHash: 'should_not_be_returned',
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    // Act
    const result = await getUserById(mockUser.id);

    // Assert
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('should handle database errors gracefully', async () => {
    // Arrange
    (prisma.user.findUnique as any).mockRejectedValue(new Error('Database error'));

    // Act & Assert
    await expect(getUserById('user-id')).rejects.toThrow('Database error');
  });
});

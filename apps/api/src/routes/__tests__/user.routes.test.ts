import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { router as userRouter } from '../user.routes';
import * as userService from '../../services/user/userService';
import { requireAuth } from '../../middleware/auth.middleware';

// Mock dependencies
vi.mock('../../services/user/userService');
vi.mock('../../middleware/auth.middleware');

describe('User Routes - GET /me', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', userRouter);
    vi.clearAllMocks();

    // Default: requireAuth passes and sets req.user
    (requireAuth as any).mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: 'default-user-id' };
      next();
    });
  });

  it('should return 200 and user data when user exists', async () => {
    // Arrange
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'USER',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      subscription: null,
      telegram: { linked: false },
    };

    (requireAuth as any).mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: 'user-123' };
      next();
    });

    (userService.getUserById as any).mockResolvedValue(mockUser);

    // Act
    const response = await request(app).get('/api/me');

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockUser);
    expect(userService.getUserById).toHaveBeenCalledWith('user-123');
  });

  it('should return 401 when no authentication token provided', async () => {
    // Arrange
    (requireAuth as any).mockImplementation((req: any, res: any, next: any) => {
      res.status(401).json({ error: 'Authentication required' });
    });

    // Act
    const response = await request(app).get('/api/me');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Authentication required' });
    expect(userService.getUserById).not.toHaveBeenCalled();
  });

  it('should return 404 when user does not exist', async () => {
    // Arrange
    (requireAuth as any).mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: 'nonexistent-user' };
      next();
    });

    (userService.getUserById as any).mockResolvedValue(null);

    // Act
    const response = await request(app).get('/api/me');

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  it('should use userId from session, not from client', async () => {
    // Arrange
    const sessionUserId = 'session-user-123';
    const mockUser = {
      id: sessionUserId,
      email: 'session@example.com',
      role: 'USER',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      subscription: null,
      telegram: { linked: false },
    };

    (requireAuth as any).mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: sessionUserId };
      next();
    });

    (userService.getUserById as any).mockResolvedValue(mockUser);

    // Act - Try to pass different userId in query (should be ignored)
    const response = await request(app)
      .get('/api/me?userId=different-user')
      .send({ userId: 'another-user' }); // Try in body too

    // Assert - Should use session userId, not client-provided
    expect(userService.getUserById).toHaveBeenCalledWith(sessionUserId);
    expect(userService.getUserById).not.toHaveBeenCalledWith('different-user');
    expect(userService.getUserById).not.toHaveBeenCalledWith('another-user');
    expect(response.body.id).toBe(sessionUserId);
  });

  it('should return subscription as null (placeholder for Milestone 4)', async () => {
    // Arrange
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'USER',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      subscription: null,
      telegram: { linked: false },
    };

    (userService.getUserById as any).mockResolvedValue(mockUser);

    // Act
    const response = await request(app).get('/api/me');

    // Assert
    expect(response.body.subscription).toBeNull();
  });

  it('should return telegram.linked as false (placeholder for Milestone 5)', async () => {
    // Arrange
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'USER',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      subscription: null,
      telegram: { linked: false },
    };

    (userService.getUserById as any).mockResolvedValue(mockUser);

    // Act
    const response = await request(app).get('/api/me');

    // Assert
    expect(response.body.telegram).toEqual({ linked: false });
  });

  it('should return 500 on server error', async () => {
    // Arrange
    (userService.getUserById as any).mockRejectedValue(new Error('Database connection failed'));

    // Act
    const response = await request(app).get('/api/me');

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });

  it('should include all required user fields in response', async () => {
    // Arrange
    const mockUser = {
      id: 'user-123',
      email: 'complete@example.com',
      role: 'USER',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      subscription: null,
      telegram: { linked: false },
    };

    (userService.getUserById as any).mockResolvedValue(mockUser);

    // Act
    const response = await request(app).get('/api/me');

    // Assert
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email');
    expect(response.body).toHaveProperty('role');
    expect(response.body).toHaveProperty('isActive');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('subscription');
    expect(response.body).toHaveProperty('telegram');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../auth.middleware';
import { jwtConfig } from '../../config/jwt';
import jwt from 'jsonwebtoken';

// Mock jwt
vi.mock('jsonwebtoken');

describe('Auth Middleware - requireAuth', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      cookies: {},
      headers: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn() as any;
    vi.clearAllMocks();
  });

  it('should call next() when valid token is provided in cookie', () => {
    // Arrange
    const mockPayload = { userId: 'user-123' };
    mockRequest.cookies = { token: 'valid-token' };
    (jwt.verify as any).mockReturnValue(mockPayload);

    // Act
    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', jwtConfig.secret);
    expect(mockRequest.user).toEqual({ id: 'user-123' });
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should call next() when valid token is provided in Authorization header', () => {
    // Arrange
    const mockPayload = { userId: 'user-456' };
    mockRequest.headers = { authorization: 'Bearer valid-token' };
    (jwt.verify as any).mockReturnValue(mockPayload);

    // Act
    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', jwtConfig.secret);
    expect(mockRequest.user).toEqual({ id: 'user-456' });
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should return 401 when no token is provided', () => {
    // Arrange - no cookies, no headers

    // Act
    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Authentication required',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', () => {
    // Arrange
    mockRequest.cookies = { token: 'invalid-token' };
    (jwt.verify as any).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    // Act
    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 when token is expired', () => {
    // Arrange
    mockRequest.cookies = { token: 'expired-token' };
    (jwt.verify as any).mockImplementation(() => {
      const error: any = new Error('Token expired');
      error.name = 'TokenExpiredError';
      throw error;
    });

    // Act
    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should attach userId to req.user from token payload', () => {
    // Arrange
    const userId = 'test-user-id-789';
    const mockPayload = { userId };
    mockRequest.cookies = { token: 'valid-token' };
    (jwt.verify as any).mockReturnValue(mockPayload);

    // Act
    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(mockRequest.user).toBeDefined();
    expect(mockRequest.user?.id).toBe(userId);
  });

  it('should prioritize cookie token over Authorization header', () => {
    // Arrange
    const cookiePayload = { userId: 'cookie-user' };
    mockRequest.cookies = { token: 'cookie-token' };
    mockRequest.headers = { authorization: 'Bearer header-token' };
    (jwt.verify as any).mockReturnValue(cookiePayload);

    // Act
    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(jwt.verify).toHaveBeenCalledWith('cookie-token', jwtConfig.secret);
    expect(mockRequest.user?.id).toBe('cookie-user');
  });
});

import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/auth/token.service.js';
import { jwtConfig } from '../config/jwt.js';

/**
 * requireAuth - Authentication middleware
 *
 * Validates JWT token from cookie or Authorization header.
 * Attaches userId to req.user if valid.
 *
 * Priority:
 * 1. Cookie token (preferred)
 * 2. Authorization header (Bearer token)
 *
 * Security:
 * - Returns 401 if no token provided
 * - Returns 401 if token invalid or expired
 * - Attaches only userId to req.user (from token payload)
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from cookie (priority 1)
    let token = req.cookies[jwtConfig.cookieName] || req.cookies.token;

    // If not in cookie, try Authorization header (priority 2)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    // No token found
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    const payload = TokenService.verifyJWT(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach userId to request
    // CRITICAL: Only attach id, not entire payload
    req.user = {
      id: payload.userId,
      role: payload.role,
    };

    next();
  } catch (error: unknown) {
    console.error('Auth middleware error:', error);

    // Check if it's a token expiration error
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Legacy alias for backward compatibility
export const authMiddleware = requireAuth;

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado - requer permissão de admin' });
  }
  next();
};

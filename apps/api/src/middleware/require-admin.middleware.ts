import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { AdminRole } from '../constants/admin-enums.js';

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: AdminRole;
    permissions: string[];
  };
}

interface AdminJWTPayload {
  adminUserId: string;
  email: string;
  role: AdminRole;
  permissions: string[];
}

const decodeAdminToken = (token: string): AdminJWTPayload => {
  const rawPayload = jwt.verify(token, env.JWT_SECRET);
  if (typeof rawPayload !== 'object' || rawPayload === null) {
    throw new Error('Invalid token payload');
  }
  return rawPayload as AdminJWTPayload;
};

export const requireAdmin = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = decodeAdminToken(token);

    if (decoded.role !== AdminRole.COLABORADOR && decoded.role !== AdminRole.ADMIN_MASTER) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.admin = {
      id: decoded.adminUserId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdminMaster = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAdmin(req, res, () => {
    if (req.admin?.role !== AdminRole.ADMIN_MASTER) {
      return res.status(403).json({
        error: 'ADMIN_MASTER role required for this operation'
      });
    }
    next();
  });
};

export const requirePermission = (permissionKey: string) => {
  return async (req: AdminRequest, res: Response, next: NextFunction) => {
    await requireAdmin(req, res, () => {
      if (req.admin?.role === AdminRole.ADMIN_MASTER) {
        // ADMIN_MASTER has all permissions
        return next();
      }

      if (!req.admin?.permissions.includes(permissionKey)) {
        return res.status(403).json({
          error: `Permission '${permissionKey}' required for this operation`
        });
      }

      next();
    });
  };
};

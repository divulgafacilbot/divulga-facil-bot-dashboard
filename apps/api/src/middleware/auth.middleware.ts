import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/auth/token.service.js';
import { jwtConfig } from '../config/jwt.js';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies[jwtConfig.cookieName];

    if (!token) {
      return res.status(401).json({ error: 'Não autorizado - token não informado' });
    }

    const payload = TokenService.verifyJWT(token);

    if (!payload) {
      return res.status(401).json({ error: 'Não autorizado - token inválido' });
    }

    req.user = payload;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Não autorizado' });
  }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado - requer permissão de admin' });
  }
  next();
};

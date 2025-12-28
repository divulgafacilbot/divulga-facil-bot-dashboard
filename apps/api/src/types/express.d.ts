import { JWTPayload } from '../services/auth/token.service.js';

export interface AuthUser {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

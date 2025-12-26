import { JWTPayload } from '../services/auth/token.service.js';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

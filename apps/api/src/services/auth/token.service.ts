import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { jwtConfig } from '../../config/jwt.js';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export class TokenService {
  static generateJWT(payload: JWTPayload): string {
    return jwt.sign(payload, jwtConfig.secret as Secret, {
      expiresIn: jwtConfig.expiresIn as any,
    });
  }

  static verifyJWT(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, jwtConfig.secret as string) as JWTPayload;
    } catch {
      return null;
    }
  }

  static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  static generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

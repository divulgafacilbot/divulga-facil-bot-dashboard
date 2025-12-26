import { prisma } from '../../db/prisma.js';
import { TokenService } from './token.service.js';
import { EmailService } from '../mail/email.service.js';

export class EmailVerificationService {
  /**
   * Creates a new email verification token for a user
   * Invalidates any previous unused tokens
   * @param userId - User ID
   * @returns The generated verification token (plain, not hashed)
   */
  static async createVerificationToken(userId: string): Promise<string> {
    const token = TokenService.generateEmailVerificationToken();
    const tokenHash = TokenService.hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Invalidate old unused tokens for this user
    await prisma.emailVerificationToken.deleteMany({
      where: { userId, usedAt: null },
    });

    // Create new token
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Verifies an email verification token and marks the user's email as verified
   * @param token - The verification token to verify
   * @returns User ID if valid, null otherwise
   */
  static async verifyToken(token: string): Promise<string | null> {
    const tokenHash = TokenService.hashToken(token);

    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!verificationToken) {
      return null;
    }

    // Mark token as used and verify user email in a transaction
    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true },
      }),
    ]);

    return verificationToken.userId;
  }

  /**
   * Sends a verification email to the user
   * @param email - User's email address
   * @param token - Verification token (plain)
   * @throws Error if email fails to send
   */
  static async sendVerificationEmail(
    email: string,
    token: string
  ): Promise<void> {
    const result = await EmailService.sendEmailVerificationEmail(email, token);

    if (!result.success) {
      console.error(`Failed to send verification email to ${email}:`, result.error);
      throw new Error(`Failed to send verification email: ${result.error}`);
    }
  }
}

import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { PasswordService } from '../services/auth/password.service.js';
import { TokenService } from '../services/auth/token.service.js';
import { EmailService } from '../services/mail/email.service.js';
import { RefreshTokenService } from '../services/auth/refresh-token.service.js';
import { EmailVerificationService } from '../services/auth/email-verification.service.js';
import { LoginHistoryService } from '../services/auth/login-history.service.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../utils/validation.js';
import { jwtConfig } from '../config/jwt.js';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password } = registerSchema.parse(req.body);

      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'E-mail já cadastrado' });
      }

      // Hash password
      const passwordHash = await PasswordService.hash(password);

      // Create user with emailVerified = false
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'USER',
          emailVerified: false,
        },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      // Generate verification token
      const verificationToken = await EmailVerificationService.createVerificationToken(user.id);

      // Send verification email
      try {
        await EmailVerificationService.sendVerificationEmail(email, verificationToken);
        res.status(201).json({
          message: 'Conta criada com sucesso! Verifique seu e-mail para ativar sua conta.',
        });
      } catch (emailError: unknown) {
        console.error('Failed to send verification email:', emailError);
        // User was created but email failed - inform them
        res.status(201).json({
          message: 'Conta criada com sucesso! Porém, houve um problema ao enviar o e-mail de verificação. Use a opção "Reenviar e-mail de verificação" para tentar novamente.',
          warning: 'Email não enviado',
        });
      }
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Falha na validação', details: error.errors });
      }
      console.error('Register error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password, rememberMe } = loginSchema.parse(req.body);

      // Find user
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Record failed login attempt
        await LoginHistoryService.recordLoginAttempt(
          email,
          false,
          req.ip,
          req.get('user-agent'),
          undefined,
          'Usuário não encontrado'
        );
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Verify password
      const isValid = await PasswordService.verify(password, user.passwordHash);
      if (!isValid) {
        // Record failed login attempt
        await LoginHistoryService.recordLoginAttempt(
          email,
          false,
          req.ip,
          req.get('user-agent'),
          user.id,
          'Senha incorreta'
        );
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Generate JWT (15 min)
      const token = TokenService.generateJWT({
        userId: user.id,
        email: user.email,
        role: user.role || 'USER',
      });

      // Generate refresh token (30 days or 60 days if rememberMe)
      const refreshToken = await RefreshTokenService.createRefreshToken(
        user.id,
        req.ip,
        req.get('user-agent'),
        rememberMe
      );

      // Set cookies with appropriate maxAge based on rememberMe
      res.cookie(jwtConfig.cookieName, token, jwtConfig.cookieOptions);

      const refreshCookieOptions = {
        ...jwtConfig.refreshCookieOptions,
        maxAge: rememberMe ? 60 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000, // 60 or 30 days
      };
      res.cookie(jwtConfig.refreshTokenCookieName, refreshToken, refreshCookieOptions);

      // Record successful login attempt
      await LoginHistoryService.recordLoginAttempt(
        email,
        true,
        req.ip,
        req.get('user-agent'),
        user.id
      );

      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Falha na validação', details: error.errors });
      }
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies[jwtConfig.refreshTokenCookieName];

      // Revoke refresh token if exists
      if (refreshToken) {
        await RefreshTokenService.revokeToken(refreshToken);
      }

      // Clear both cookies
      res.clearCookie(jwtConfig.cookieName);
      res.clearCookie(jwtConfig.refreshTokenCookieName);

      res.json({ message: 'Logout realizado com sucesso' });
    } catch (error: unknown) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);

      // Find user (but don't reveal if exists)
      const user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        // Generate reset token
        const resetToken = TokenService.generateResetToken();
        const tokenHash = TokenService.hashToken(resetToken);

        // Save to database
        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          },
        });

        // Send email
        await EmailService.sendPasswordResetEmail(email, resetToken);
      }

      // Always return success to prevent email enumeration
      res.json({
        message: 'Se o e-mail existir, um link de redefinição foi enviado',
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Falha na validação', details: error.errors });
      }
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);

      // Hash token to find in database
      const tokenHash = TokenService.hashToken(token);

      // Find valid token
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          tokenHash,
          expiresAt: { gt: new Date() },
          usedAt: null,
        },
      });

      if (!resetToken) {
        return res.status(400).json({ error: 'Token inválido ou expirado' });
      }

      // Hash new password
      const passwordHash = await PasswordService.hash(newPassword);

      // Update user password and mark token as used
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId! },
          data: { passwordHash },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        }),
      ]);

      res.json({ message: 'Senha redefinida com sucesso' });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Falha na validação', details: error.errors });
      }
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = verifyEmailSchema.parse(req.body);

      const userId = await EmailVerificationService.verifyToken(token);

      if (!userId) {
        return res.status(400).json({ error: 'Token inválido ou expirado' });
      }

      res.json({ message: 'E-mail verificado com sucesso!' });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Falha na validação', details: error.errors });
      }
      console.error('Verify email error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async resendVerification(req: Request, res: Response) {
    try {
      const { email } = resendVerificationSchema.parse(req.body);

      const user = await prisma.user.findUnique({ where: { email } });

      if (user && !user.emailVerified) {
        const token = await EmailVerificationService.createVerificationToken(user.id);
        try {
          await EmailVerificationService.sendVerificationEmail(email, token);
        } catch (emailError: unknown) {
          console.error('Failed to resend verification email:', emailError);
          return res.status(500).json({
            error: 'Falha ao enviar e-mail de verificação. Verifique as configurações de SMTP.',
          });
        }
      }

      // Always return success to prevent email enumeration
      res.json({
        message: 'Se o e-mail existir e não estiver verificado, um link foi enviado',
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Falha na validação', details: error.errors });
      }
      console.error('Resend verification error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies[jwtConfig.refreshTokenCookieName];

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token não informado' });
      }

      const userId = await RefreshTokenService.verifyRefreshToken(refreshToken);

      if (!userId) {
        return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      // Generate new JWT
      const newJwt = TokenService.generateJWT({
        userId: user.id,
        email: user.email,
        role: user.role || 'USER',
      });

      // Set new JWT cookie
      res.cookie(jwtConfig.cookieName, newJwt, jwtConfig.cookieOptions);

      res.json({ message: 'Token renovado com sucesso' });
    } catch (error: unknown) {
      console.error('Refresh token error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

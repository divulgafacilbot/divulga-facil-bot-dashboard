import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import {
  loginRateLimiter,
  registerRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  emailVerificationRateLimiter,
} from '../middleware/rate-limit.middleware.js';

const router = Router();

router.post('/register', registerRateLimiter, AuthController.register);
router.post('/login', loginRateLimiter, AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', forgotPasswordRateLimiter, AuthController.forgotPassword);
router.post('/reset-password', resetPasswordRateLimiter, AuthController.resetPassword);
router.post('/verify-email', emailVerificationRateLimiter, AuthController.verifyEmail);
router.post('/resend-verification', emailVerificationRateLimiter, AuthController.resendVerification);
router.post('/refresh', AuthController.refreshToken);

export default router;

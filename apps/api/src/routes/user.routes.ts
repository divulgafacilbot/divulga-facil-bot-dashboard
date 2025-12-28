import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authMiddleware, requireAuth } from '../middleware/auth.middleware.js';

export const router = Router();

// GET /me - Get current user data (with subscription and telegram placeholders)
router.get('/me', requireAuth, UserController.getMe);

// Other user routes
router.post('/me/change-password', authMiddleware, UserController.changePassword);
router.post('/me/revoke-sessions', authMiddleware, UserController.revokeAllSessions);
router.get('/me/login-history', authMiddleware, UserController.getLoginHistory);
router.get('/me/login-stats', authMiddleware, UserController.getLoginStats);
router.delete('/me', authMiddleware, UserController.deleteAccount);

export default router;

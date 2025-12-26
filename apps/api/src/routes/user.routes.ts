import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/me', authMiddleware, UserController.getMe);
router.post('/me/change-password', authMiddleware, UserController.changePassword);
router.post('/me/revoke-sessions', authMiddleware, UserController.revokeAllSessions);
router.get('/me/login-history', authMiddleware, UserController.getLoginHistory);
router.get('/me/login-stats', authMiddleware, UserController.getLoginStats);
router.delete('/me', authMiddleware, UserController.deleteAccount);

export default router;

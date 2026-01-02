import { Router } from 'express';
import { telegramController } from '../controllers/telegram.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// POST /telegram/link-token - Generate link token (requires auth)
router.post('/telegram/link-token', authMiddleware, telegramController.generateLinkToken.bind(telegramController));

// GET /telegram/link-tokens - List pending tokens (requires auth)
router.get('/telegram/link-tokens', authMiddleware, telegramController.listTokens.bind(telegramController));

// POST /telegram/link-tokens/:id/refresh - Refresh token (requires auth)
router.post('/telegram/link-tokens/:id/refresh', authMiddleware, telegramController.refreshToken.bind(telegramController));

// DELETE /telegram/link-tokens/:id - Delete token (requires auth)
router.delete('/telegram/link-tokens/:id', authMiddleware, telegramController.deleteToken.bind(telegramController));

// POST /telegram/confirm-link - Confirm link (called by bot, no auth)
router.post('/telegram/confirm-link', telegramController.confirmLink.bind(telegramController));

// GET /telegram/link-status - Check link status (requires auth)
router.get('/telegram/link-status', authMiddleware, telegramController.getLinkStatus.bind(telegramController));

// DELETE /telegram/unlink - Unlink account (requires auth)
router.delete('/telegram/unlink', authMiddleware, telegramController.unlinkAccount.bind(telegramController));

export default router;

import { Router } from 'express';
import { brandConfigController } from '../controllers/brand-config.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All brand-config routes require authentication
router.use(authMiddleware);

// GET /me/brand-config - Get user's brand config
router.get('/me/brand-config', brandConfigController.getConfig.bind(brandConfigController));

// PUT /me/brand-config - Update user's brand config
router.put('/me/brand-config', brandConfigController.updateConfig.bind(brandConfigController));

// DELETE /me/brand-config - Reset to defaults
router.delete('/me/brand-config', brandConfigController.deleteConfig.bind(brandConfigController));

export default router;

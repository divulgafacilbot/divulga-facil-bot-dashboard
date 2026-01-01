import { Router } from 'express';
import { layoutPreferencesController } from '../controllers/layout-preferences.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All layout-preferences routes require authentication
router.use(authMiddleware);

// GET /me/layout-preferences - Get user's layout preferences
router.get(
  '/me/layout-preferences',
  layoutPreferencesController.getPreferences.bind(layoutPreferencesController)
);

// PUT /me/layout-preferences - Update user's layout preferences
router.put(
  '/me/layout-preferences',
  layoutPreferencesController.updatePreferences.bind(layoutPreferencesController)
);

// DELETE /me/layout-preferences - Reset to defaults
router.delete(
  '/me/layout-preferences',
  layoutPreferencesController.resetPreferences.bind(layoutPreferencesController)
);

export default router;

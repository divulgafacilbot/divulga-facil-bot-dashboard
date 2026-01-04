import { Router } from 'express';
import { AdminAuthController } from '../../controllers/admin/admin-auth.controller.js';
import { requireAdmin } from '../../middleware/require-admin.middleware.js';

const router = Router();

router.post('/login', AdminAuthController.login);
router.post('/logout', requireAdmin, AdminAuthController.logout);
router.get('/me', requireAdmin, AdminAuthController.getMe);
router.post('/change-password', requireAdmin, AdminAuthController.changePassword);

export default router;

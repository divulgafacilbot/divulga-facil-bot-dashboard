import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requirePermission } from '../../middleware/require-admin.middleware.js';
import { AdminUsersService } from '../../services/admin/users.service.js';

const router = Router();

const listUsersQuerySchema = z.object({
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  role: z.string().optional(),
  emailSearch: z.string().optional(),
  hasSubscription: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  hasBotLinked: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

router.get('/', requireAdmin, requirePermission('users'), async (req, res) => {
  try {
    const filters = listUsersQuerySchema.parse(req.query);
    const users = await AdminUsersService.getUsers(filters, { page: 1, limit: 50 });
    res.json({ success: true, data: users });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', requireAdmin, requirePermission('users'), async (req, res) => {
  try {
    const user = await AdminUsersService.getUserDetail(req.params.id);
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/deactivate', requireAdmin, requirePermission('users'), async (req, res) => {
  try {
    await AdminUsersService.deactivateUser(req.params.id);
    res.json({ success: true, message: 'User deactivated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/activate', requireAdmin, requirePermission('users'), async (req, res) => {
  try {
    await AdminUsersService.activateUser(req.params.id);
    res.json({ success: true, message: 'User activated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/reset-usage', requireAdmin, requirePermission('users'), async (req, res) => {
  try {
    await AdminUsersService.resetUserUsage(req.params.id);
    res.json({ success: true, message: 'Usage reset' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/reset-password', requireAdmin, requirePermission('users'), async (req, res) => {
  try {
    const result = await AdminUsersService.resetUserPassword(req.params.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/unlink-bot', requireAdmin, requirePermission('users'), async (req, res) => {
  try {
    await AdminUsersService.unlinkUserBot(req.params.id, req.body.botType);
    res.json({ success: true, message: 'Bot unlinked' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

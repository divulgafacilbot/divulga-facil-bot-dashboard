import { Router } from 'express';
import { requireAdminMaster } from '../../middleware/require-admin.middleware.js';
import { AdminStaffService } from '../../services/admin/staff.service.js';

const router = Router();

router.get('/', requireAdminMaster, async (req, res) => {
  try {
    const staff = await AdminStaffService.getAdminStaff(true);
    res.json({ success: true, data: staff });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requireAdminMaster, async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    const admin = await AdminStaffService.createAdminUser(name, email, password, role, permissions);
    res.json({ success: true, data: admin });
  } catch (error: any) {
    if (error?.message?.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/permissions', requireAdminMaster, async (req, res) => {
  try {
    if ((req as any).admin?.id === req.params.id) {
      return res.status(403).json({ error: 'Nao e permitido editar o proprio usuario.' });
    }
    const { permissions } = req.body;
    const admin = await AdminStaffService.updateAdminPermissions(req.params.id, permissions || []);
    res.json({ success: true, data: admin });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/deactivate', requireAdminMaster, async (req, res) => {
  try {
    if ((req as any).admin?.id === req.params.id) {
      return res.status(403).json({ error: 'Nao e permitido desativar o proprio usuario.' });
    }
    const admin = await AdminStaffService.deactivateAdminUser(req.params.id);
    res.json({ success: true, data: admin });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/reactivate', requireAdminMaster, async (req, res) => {
  try {
    if ((req as any).admin?.id === req.params.id) {
      return res.status(403).json({ error: 'Nao e permitido reativar o proprio usuario.' });
    }
    const admin = await AdminStaffService.reactivateAdminUser(req.params.id);
    res.json({ success: true, data: admin });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireAdminMaster, async (req, res) => {
  try {
    if ((req as any).admin?.id === req.params.id) {
      return res.status(403).json({ error: 'Nao e permitido deletar o proprio usuario.' });
    }
    const admin = await AdminStaffService.deleteAdminUser(req.params.id);
    res.json({ success: true, data: admin });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

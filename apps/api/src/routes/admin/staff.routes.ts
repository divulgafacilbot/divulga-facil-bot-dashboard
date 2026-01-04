import { Router } from 'express';
import { requireAdminMaster } from '../../middleware/require-admin.middleware.js';
import { AdminStaffService } from '../../services/admin/staff.service.js';

const router = Router();

router.get('/', requireAdminMaster, async (req, res) => {
  try {
    const staff = await AdminStaffService.getAdminStaff(false);
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
    res.status(500).json({ error: error.message });
  }
});

export default router;

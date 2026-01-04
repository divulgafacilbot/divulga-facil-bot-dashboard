import { Router } from 'express';
import { UserSupportService } from '../../services/user/support.service.js';

const router = Router();

// Note: requireAuth middleware should be added when integrating with existing auth
router.post('/tickets', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'temp-user-id';
    const { subject, category, message, attachments } = req.body;
    const ticket = await UserSupportService.createTicket(userId, subject, category, message, attachments);
    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tickets', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'temp-user-id';
    const tickets = await UserSupportService.getUserTickets(userId, req.query);
    res.json({ success: true, data: tickets });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

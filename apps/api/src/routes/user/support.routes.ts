import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { UserSupportService } from '../../services/user/support.service.js';

const router = Router();

router.use(requireAuth);

router.post('/tickets', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'temp-user-id';
    if (!UserSupportService.isValidUuid(userId)) {
      res.status(401).json({ error: 'Usuario nao autenticado' });
      return;
    }
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
    if (!UserSupportService.isValidUuid(userId)) {
      res.status(401).json({ error: 'Usuario nao autenticado' });
      return;
    }
    const tickets = await UserSupportService.getUserTickets(userId, req.query);
    res.json({ success: true, data: tickets });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/tickets/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'temp-user-id';
    if (!UserSupportService.isValidUuid(userId)) {
      res.status(401).json({ error: 'Usuario nao autenticado' });
      return;
    }
    const { subject, category, message, attachments } = req.body;
    const reply = await UserSupportService.updateTicket(
      req.params.id,
      userId,
      subject,
      category,
      message,
      attachments
    );
    res.json({ success: true, data: reply });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/:id/close', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'temp-user-id';
    if (!UserSupportService.isValidUuid(userId)) {
      res.status(401).json({ error: 'Usuario nao autenticado' });
      return;
    }
    await UserSupportService.closeTicket(req.params.id, userId);
    res.json({ success: true, message: 'Ticket fechado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/:id/archive', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'temp-user-id';
    if (!UserSupportService.isValidUuid(userId)) {
      res.status(401).json({ error: 'Usuario nao autenticado' });
      return;
    }
    await UserSupportService.archiveTicket(req.params.id, userId);
    res.json({ success: true, message: 'Ticket arquivado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/closed/seen', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'temp-user-id';
    if (!UserSupportService.isValidUuid(userId)) {
      res.status(401).json({ error: 'Usuario nao autenticado' });
      return;
    }
    await UserSupportService.markClosedTicketsSeen(userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tickets/closed-count', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'temp-user-id';
    if (!UserSupportService.isValidUuid(userId)) {
      res.status(401).json({ error: 'Usuario nao autenticado' });
      return;
    }
    const count = await UserSupportService.countClosedUnseenTickets(userId);
    res.json({ success: true, data: { count } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

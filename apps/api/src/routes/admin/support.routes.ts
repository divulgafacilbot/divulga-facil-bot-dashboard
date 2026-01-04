import { Router } from 'express';
import { requireAdmin, requirePermission } from '../../middleware/require-admin.middleware.js';
import { AdminSupportService } from '../../services/admin/support.service.js';
import {
  SUPPORT_TICKET_PRIORITY_LABELS,
  SUPPORT_TICKET_STATUS_LABELS,
  normalizeSupportPriority,
  normalizeSupportStatus,
} from '../../constants/admin-enums.js';

const router = Router();

router.get('/tickets', requireAdmin, requirePermission('support'), async (req, res) => {
  try {
    const normalizedFilters = {
      ...req.query,
      priority: normalizeSupportPriority(req.query.priority as string),
      status: normalizeSupportStatus(req.query.status as string),
    };
    const tickets = await AdminSupportService.getTickets(normalizedFilters, { page: 1, limit: 50 });
    const mapped = {
      ...tickets,
      tickets: tickets.tickets.map((ticket) => ({
        ...ticket,
        status_label: SUPPORT_TICKET_STATUS_LABELS[ticket.status] || ticket.status,
        priority_label: SUPPORT_TICKET_PRIORITY_LABELS[ticket.priority] || ticket.priority,
      })),
    };
    res.json({ success: true, data: mapped });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tickets/:id', requireAdmin, requirePermission('support'), async (req, res) => {
  try {
    const ticket = await AdminSupportService.getTicketById(req.params.id);
    res.json({
      success: true,
      data: {
        ...ticket,
        status_label: SUPPORT_TICKET_STATUS_LABELS[ticket.status] || ticket.status,
        priority_label: SUPPORT_TICKET_PRIORITY_LABELS[ticket.priority] || ticket.priority,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/:id/reply', requireAdmin, requirePermission('support'), async (req, res) => {
  try {
    await AdminSupportService.createTicketReply(req.params.id, (req as any).admin.id, req.body.message);
    res.json({ success: true, message: 'Resposta enviada' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/:id/resolve', requireAdmin, requirePermission('support'), async (req, res) => {
  try {
    await AdminSupportService.resolveTicket(req.params.id, (req as any).admin.id, req.body.resolution);
    res.json({ success: true, message: 'Ticket resolvido' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/:id/reopen', requireAdmin, requirePermission('support'), async (req, res) => {
  try {
    await AdminSupportService.updateTicketStatus(req.params.id, 'open', (req as any).admin.id);
    res.json({ success: true, message: 'Ticket reaberto' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/:id/priority', requireAdmin, requirePermission('support'), async (req, res) => {
  try {
    const normalizedPriority = normalizeSupportPriority(req.body.priority);
    if (!normalizedPriority) {
      res.status(400).json({ error: 'Prioridade invalida' });
      return;
    }
    await AdminSupportService.updateTicketPriority(req.params.id, normalizedPriority, (req as any).admin.id);
    res.json({ success: true, message: 'Prioridade atualizada' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

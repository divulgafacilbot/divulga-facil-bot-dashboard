import { Router } from 'express';
import { requireAdmin, requirePermission } from '../../middleware/require-admin.middleware.js';
import { AdminSupportService } from '../../services/admin/support.service.js';
import {
  SUPPORT_TICKET_PRIORITY_LABELS,
  SUPPORT_TICKET_STATUS_LABELS,
  normalizeSupportPriority,
  normalizeSupportStatus,
  AdminRole,
} from '../../constants/admin-enums.js';
import { supportEvents, SUPPORT_EVENTS } from '../../services/admin/support-events.js';
import jwt from 'jsonwebtoken';
import { env } from '../../env.js';

const router = Router();

const verifySupportToken = (token: string) => {
  const rawPayload = jwt.verify(token, env.JWT_SECRET);
  if (typeof rawPayload !== 'object' || rawPayload === null) {
    throw new Error('Invalid token payload');
  }
  return rawPayload as {
    adminUserId: string;
    email: string;
    role: AdminRole;
    permissions: string[];
  };
};

const requireAdminForStream = (req: any, res: any, next: any) => {
  const bearerToken = req.headers.authorization?.replace('Bearer ', '');
  const token = bearerToken || req.query?.token;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = verifySupportToken(token);

    if (decoded.role !== AdminRole.COLABORADOR && decoded.role !== AdminRole.ADMIN_MASTER) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.admin = {
      id: decoded.adminUserId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
    };

    if (!req.admin.permissions.includes('support')) {
      return res.status(403).json({ error: 'Permission support required' });
    }

    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.get('/stream', requireAdminForStream, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendStats = async () => {
    const stats = await AdminSupportService.getTicketStats();
    const payload = {
      openTickets: stats.openTickets,
      inProgressTickets: stats.inProgressTickets,
    };
    res.write(`event: support-stats\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  await sendStats();

  const onUpdate = () => {
    sendStats().catch(() => null);
  };

  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  supportEvents.on(SUPPORT_EVENTS.UPDATED, onUpdate);

  req.on('close', () => {
    supportEvents.off(SUPPORT_EVENTS.UPDATED, onUpdate);
    clearInterval(keepAlive);
    res.end();
  });
});

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

router.post('/tickets/:id/in-progress', requireAdmin, requirePermission('support'), async (req, res) => {
  try {
    await AdminSupportService.updateTicketStatus(req.params.id, 'in_progress', (req as any).admin.id);
    res.json({ success: true, message: 'Ticket em andamento' });
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

router.get('/stats', requireAdmin, requirePermission('support'), async (_req, res) => {
  try {
    const stats = await AdminSupportService.getTicketStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

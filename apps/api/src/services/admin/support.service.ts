import { prisma } from '../../db/prisma.js';
import { supportEvents, SUPPORT_EVENTS } from './support-events.js';

interface GetTicketsFilters {
  status?: string;
  priority?: string;
  category?: string;
  userId?: string;
  botType?: string;
}

interface Pagination {
  page?: number;
  limit?: number;
}

export class AdminSupportService {
  /**
   * Get support tickets with filters and pagination
   */
  static async getTickets(filters: GetTicketsFilters = {}, pagination: Pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.userId) {
      where.user_id = filters.userId;
    }

    // Filter by bot type using category mapping
    if (filters.botType) {
      const botCategory = `BOT_${filters.botType.toUpperCase()}`;
      where.category = botCategory;
    }

    const [tickets, total] = await Promise.all([
      prisma.support_tickets.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          support_messages: {
            where: { sender_role: 'user' },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              support_messages: true,
            },
          },
        },
      }),
      prisma.support_tickets.count({ where }),
    ]);

    return {
      tickets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get ticket by ID with all messages and events
   */
  static async getTicketById(ticketId: string) {
    const ticket = await prisma.support_tickets.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        },
        support_messages: {
          orderBy: { created_at: 'asc' },
        },
        support_ticket_events: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return ticket;
  }

  /**
   * Create a reply to a ticket
   */
  static async createTicketReply(ticketId: string, adminUserId: string, message: string) {
    // Create the message
    const reply = await prisma.support_messages.create({
      data: {
        ticket_id: ticketId,
        sender_role: 'admin',
        message,
      },
    });

    // Create event
    await prisma.support_ticket_events.create({
      data: {
        ticket_id: ticketId,
        event_type: 'admin_reply',
        metadata: {
          adminUserId,
          messageId: reply.id,
        },
      },
    });

    // Update ticket timestamp
    await prisma.support_tickets.update({
      where: { id: ticketId },
      data: { updated_at: new Date() },
    });

    supportEvents.emit(SUPPORT_EVENTS.UPDATED);
    return reply;
  }

  /**
   * Update ticket status
   */
  static async updateTicketStatus(ticketId: string, status: string, adminUserId: string) {
    const existing = await prisma.support_tickets.findUnique({
      where: { id: ticketId },
      select: { status: true },
    });

    const ticket = await prisma.support_tickets.update({
      where: { id: ticketId },
      data: {
        status: status as any,
        closed_seen_at: status === 'CLOSED' ? null : undefined,
        updated_at: new Date(),
      },
    });

    // Create event
    await prisma.support_ticket_events.create({
      data: {
        ticket_id: ticketId,
        event_type: 'status_changed',
        metadata: {
          adminUserId,
          oldStatus: existing?.status,
          newStatus: status,
        },
      },
    });

    supportEvents.emit(SUPPORT_EVENTS.UPDATED);
    return ticket;
  }

  /**
   * Update ticket priority
   */
  static async updateTicketPriority(ticketId: string, priority: string, adminUserId: string) {
    const ticket = await prisma.support_tickets.update({
      where: { id: ticketId },
      data: { priority: priority as any },
    });

    // Create event
    await prisma.support_ticket_events.create({
      data: {
        ticket_id: ticketId,
        event_type: 'priority_changed',
        metadata: {
          adminUserId,
          newPriority: priority,
        },
      },
    });

    return ticket;
  }

  /**
   * Resolve a ticket
   */
  static async resolveTicket(ticketId: string, adminUserId: string, resolution: string) {
    const ticket = await prisma.support_tickets.update({
      where: { id: ticketId },
      data: { status: 'CLOSED' as any, closed_seen_at: null, updated_at: new Date() },
    });

    // Create resolution message
    await prisma.support_messages.create({
      data: {
        ticket_id: ticketId,
        sender_role: 'admin',
        message: resolution,
      },
    });

    // Create event
    await prisma.support_ticket_events.create({
      data: {
        ticket_id: ticketId,
        event_type: 'ticket_resolved',
        metadata: {
          adminUserId,
          resolution,
        },
      },
    });

    supportEvents.emit(SUPPORT_EVENTS.UPDATED);
    return ticket;
  }

  /**
   * Reopen a ticket
   */
  static async reopenTicket(ticketId: string, adminUserId: string, reason: string) {
    const ticket = await prisma.support_tickets.update({
      where: { id: ticketId },
      data: { status: 'OPEN' as any, closed_seen_at: null, updated_at: new Date() },
    });

    // Create event
    await prisma.support_ticket_events.create({
      data: {
        ticket_id: ticketId,
        event_type: 'ticket_reopened',
        metadata: {
          adminUserId,
          reason,
        },
      },
    });

    supportEvents.emit(SUPPORT_EVENTS.UPDATED);
    return ticket;
  }

  /**
   * Get ticket statistics
   */
  static async getTicketStats() {
    const [
      totalTickets,
      openTickets,
      closedTickets,
      inProgressTickets,
      ticketsByPriority,
      ticketsByCategory,
      ticketsByStatus,
    ] = await Promise.all([
      prisma.support_tickets.count(),
      prisma.support_tickets.count({ where: { status: 'OPEN' as any } }),
      prisma.support_tickets.count({ where: { status: 'CLOSED' as any } }),
      prisma.support_tickets.count({ where: { status: 'IN_PROGRESS' as any } }),
      prisma.support_tickets.groupBy({
        by: ['priority'],
        _count: { id: true },
      }),
      prisma.support_tickets.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      prisma.support_tickets.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    return {
      totalTickets,
      openTickets,
      closedTickets,
      inProgressTickets,
      byPriority: ticketsByPriority.map((p) => ({
        priority: p.priority,
        count: p._count.id,
      })),
      byCategory: ticketsByCategory.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      byStatus: ticketsByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    };
  }
}

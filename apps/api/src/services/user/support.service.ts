import { prisma } from '../../db/prisma.js';
import {
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
} from '../../constants/admin-enums.js';

export class UserSupportService {
  /**
   * Create a new support ticket
   */
  static async createTicket(
    userId: string,
    subject: string,
    category: string,
    message: string,
    attachments: any[] = []
  ) {
    const ticket = await prisma.support_tickets.create({
      data: {
        user_id: userId,
        subject,
        category,
        status: SUPPORT_TICKET_STATUSES.OPEN,
        priority: SUPPORT_TICKET_PRIORITIES.NORMAL,
        support_messages: {
          create: {
            sender_role: 'user',
            message,
            attachments,
          },
        },
        support_ticket_events: {
          create: {
            event_type: 'created',
            metadata: { category, priority: SUPPORT_TICKET_PRIORITIES.NORMAL },
          },
        },
      },
      include: {
        support_messages: true,
      },
    });

    return ticket;
  }

  /**
   * Get user's tickets
   */
  static async getUserTickets(userId: string, filters?: { status?: string }) {
    return prisma.support_tickets.findMany({
      where: {
        user_id: userId,
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { created_at: 'desc' },
      include: {
        support_messages: {
          orderBy: { created_at: 'asc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Get ticket thread (with ownership check)
   */
  static async getTicketThread(ticketId: string, userId: string) {
    const ticket = await prisma.support_tickets.findFirst({
      where: {
        id: ticketId,
        user_id: userId,
      },
      include: {
        support_messages: {
          orderBy: { created_at: 'asc' },
        },
        support_ticket_events: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new Error('Ticket not found or access denied');
    }

    return ticket;
  }

  /**
   * Add user reply to ticket
   */
  static async addUserReply(
    ticketId: string,
    userId: string,
    message: string,
    attachments: any[] = []
  ) {
    // Verify ownership
    const ticket = await prisma.support_tickets.findFirst({
      where: { id: ticketId, user_id: userId },
    });

    if (!ticket) {
      throw new Error('Ticket not found or access denied');
    }

    const reply = await prisma.support_messages.create({
      data: {
        ticket_id: ticketId,
        sender_role: 'user',
        message,
        attachments,
      },
    });

    await prisma.support_ticket_events.create({
      data: {
        ticket_id: ticketId,
        event_type: 'replied',
        metadata: { sender_role: 'user' },
      },
    });

    await prisma.support_tickets.update({
      where: { id: ticketId },
      data: { updated_at: new Date() },
    });

    return reply;
  }
}

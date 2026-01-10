import { prisma } from '../../db/prisma.js';
import {
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
} from '../../constants/admin-enums.js';
import { supportEvents, SUPPORT_EVENTS } from '../admin/support-events.js';

export class UserSupportService {
  static isValidUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    );
  }
  /**
   * Create a new support ticket
   */
  static async createTicket(
    userId: string,
    subject: string,
    category: 'GENERAL' | 'BILLING' | 'TECHNICAL' | 'BOT_ARTS' | 'BOT_DOWNLOAD' | 'BOT_PINTEREST' | 'BOT_SUGGESTION' | 'PUBLIC_PAGE',
    message: string,
    attachments: any[] = []
  ) {
    const ticket = await prisma.support_tickets.create({
      data: {
        user_id: userId,
        subject,
        category: category as any,
        status: SUPPORT_TICKET_STATUSES.OPEN as any,
        priority: SUPPORT_TICKET_PRIORITIES.NORMAL as any,
        closed_seen_at: null,
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

    supportEvents.emit(SUPPORT_EVENTS.UPDATED);
    return ticket;
  }

  /**
   * Get user's tickets
   */
  static async getUserTickets(userId: string, filters?: { status?: string }) {
    if (!UserSupportService.isValidUuid(userId)) {
      return [];
    }
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const normalizedStatus = filters?.status;
    const baseWhere: any = {
      user_id: userId,
    };

    if (normalizedStatus) {
      baseWhere.status = normalizedStatus;
      if (normalizedStatus === SUPPORT_TICKET_STATUSES.CLOSED) {
        baseWhere.updated_at = { gte: fifteenDaysAgo };
      }
    } else {
      baseWhere.OR = [
        { status: SUPPORT_TICKET_STATUSES.OPEN },
        { status: SUPPORT_TICKET_STATUSES.IN_PROGRESS },
        {
          status: SUPPORT_TICKET_STATUSES.CLOSED,
          updated_at: { gte: fifteenDaysAgo },
        },
      ];
    }

    return prisma.support_tickets.findMany({
      where: baseWhere,
      orderBy: { created_at: 'desc' },
      include: {
        support_messages: {
          orderBy: { created_at: 'desc' },
          take: 5,
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
    if (!UserSupportService.isValidUuid(userId)) {
      throw new Error('Invalid user');
    }
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
      data: { updated_at: new Date(), status: SUPPORT_TICKET_STATUSES.OPEN as any, closed_seen_at: null },
    });

    supportEvents.emit(SUPPORT_EVENTS.UPDATED);
    return reply;
  }

  /**
   * Update ticket (edit/reopen with new data)
   */
  static async updateTicket(
    ticketId: string,
    userId: string,
    subject: string,
    category: 'GENERAL' | 'BILLING' | 'TECHNICAL' | 'BOT_ARTS' | 'BOT_DOWNLOAD' | 'BOT_PINTEREST' | 'BOT_SUGGESTION' | 'PUBLIC_PAGE',
    message: string,
    attachments: any[] = []
  ) {
    if (!UserSupportService.isValidUuid(userId)) {
      throw new Error('Invalid user');
    }
    const ticket = await prisma.support_tickets.findFirst({
      where: { id: ticketId, user_id: userId },
    });

    if (!ticket) {
      throw new Error('Ticket not found or access denied');
    }

    await prisma.support_tickets.update({
      where: { id: ticketId },
      data: {
        subject,
        category: category as any,
        status: SUPPORT_TICKET_STATUSES.OPEN as any,
        updated_at: new Date(),
        closed_seen_at: null,
      },
    });

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
        event_type: 'updated',
        metadata: { sender_role: 'user' },
      },
    });

    supportEvents.emit(SUPPORT_EVENTS.UPDATED);
    return reply;
  }

  /**
   * Close ticket by user
   */
  static async closeTicket(ticketId: string, userId: string) {
    if (!UserSupportService.isValidUuid(userId)) {
      throw new Error('Invalid user');
    }
    const ticket = await prisma.support_tickets.findFirst({
      where: { id: ticketId, user_id: userId },
    });

    if (!ticket) {
      throw new Error('Ticket not found or access denied');
    }

    await prisma.support_tickets.update({
      where: { id: ticketId },
      data: {
        status: SUPPORT_TICKET_STATUSES.CLOSED as any,
        updated_at: new Date(),
        closed_seen_at: new Date(),
      },
    });

    await prisma.support_ticket_events.create({
      data: {
        ticket_id: ticketId,
        event_type: 'closed_by_user',
        metadata: { userId },
      },
    });

    supportEvents.emit(SUPPORT_EVENTS.UPDATED);
  }


  /**
   * Mark closed tickets as seen
   */
  static async markClosedTicketsSeen(userId: string) {
    if (!UserSupportService.isValidUuid(userId)) {
      return;
    }
    await prisma.support_tickets.updateMany({
      where: {
        user_id: userId,
        status: SUPPORT_TICKET_STATUSES.CLOSED as any,
        closed_seen_at: null,
      },
      data: { closed_seen_at: new Date() },
    });
  }

  /**
   * Count closed tickets not seen by user
   */
  static async countClosedUnseenTickets(userId: string) {
    if (!UserSupportService.isValidUuid(userId)) {
      return 0;
    }
    return prisma.support_tickets.count({
      where: {
        user_id: userId,
        status: SUPPORT_TICKET_STATUSES.CLOSED as any,
        closed_seen_at: null,
      },
    });
  }
}

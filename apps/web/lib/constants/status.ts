/**
 * Status enums and constants
 * Centralized status definitions for consistency across the app
 */

export const BOT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ERROR: 'ERROR',
} as const;

export type BotStatus = typeof BOT_STATUS[keyof typeof BOT_STATUS];

export const CARD_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DRAFT: 'DRAFT',
  HIDDEN: 'HIDDEN',
} as const;

export type CardStatus = typeof CARD_STATUS[keyof typeof CARD_STATUS];

export const USER_ROLE = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

export const SUPPORT_TICKET_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  CLOSED: 'CLOSED',
  WAITING_USER: 'WAITING_USER',
  RESOLVED: 'RESOLVED',
} as const;

export type SupportTicketStatus = typeof SUPPORT_TICKET_STATUS[keyof typeof SUPPORT_TICKET_STATUS];

export const SUPPORT_TICKET_PRIORITY = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type SupportTicketPriority = typeof SUPPORT_TICKET_PRIORITY[keyof typeof SUPPORT_TICKET_PRIORITY];

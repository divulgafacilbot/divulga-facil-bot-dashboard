import { BOT_TYPES, type BotType } from './bot-types.js';

export const BOT_TYPE_LABELS: Record<BotType, string> = {
  [BOT_TYPES.PROMOCOES]: 'Promoções',
  [BOT_TYPES.DOWNLOAD]: 'Download',
  [BOT_TYPES.PINTEREST]: 'Pinterest',
  [BOT_TYPES.SUGGESTION]: 'Sugestões',
};

export const SUBSCRIPTION_STATUSES = {
  PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
  ACTIVE: 'ACTIVE',
  GRACE: 'GRACE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
  CHARGEBACK: 'CHARGEBACK',
  NO_SUBSCRIPTION: 'NO_SUBSCRIPTION',
  UNKNOWN: 'UNKNOWN',
} as const;

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUSES)[keyof typeof SUBSCRIPTION_STATUSES];

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  PENDING_CONFIRMATION: 'Aguardando confirmação',
  ACTIVE: 'Ativa',
  GRACE: 'Em período de carência',
  PAST_DUE: 'Em atraso',
  CANCELED: 'Cancelada',
  EXPIRED: 'Expirada',
  REFUNDED: 'Reembolsada',
  CHARGEBACK: 'Estorno',
  NO_SUBSCRIPTION: 'Sem assinatura',
  UNKNOWN: 'Desconhecido',

};

// Statuses that allow access to the system
export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SUBSCRIPTION_STATUSES.ACTIVE,
  SUBSCRIPTION_STATUSES.GRACE,
];

export const KIWIFY_EVENT_TYPES = {
  PURCHASE: 'purchase',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
} as const;

export type KiwifyEventType =
  (typeof KIWIFY_EVENT_TYPES)[keyof typeof KIWIFY_EVENT_TYPES];

export const KIWIFY_EVENT_TYPE_LABELS: Record<string, string> = {
  purchase: 'Compra',
  subscription_renewed: 'Renovacao de assinatura',
};

export const SUPPORT_TICKET_STATUSES = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  CLOSED: 'CLOSED',
  WAITING_USER: 'WAITING_USER',
  RESOLVED: 'RESOLVED',
} as const;

export type SupportTicketStatus =
  (typeof SUPPORT_TICKET_STATUSES)[keyof typeof SUPPORT_TICKET_STATUSES];

export const SUPPORT_TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  WAITING_USER: 'Aguardando usuário',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

export const SUPPORT_TICKET_PRIORITIES = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type SupportTicketPriority =
  (typeof SUPPORT_TICKET_PRIORITIES)[keyof typeof SUPPORT_TICKET_PRIORITIES];

export const SUPPORT_TICKET_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

const SUPPORT_PRIORITY_ALIASES: Record<string, SupportTicketPriority> = {
  alta: SUPPORT_TICKET_PRIORITIES.HIGH,
  high: SUPPORT_TICKET_PRIORITIES.HIGH,
  hight: SUPPORT_TICKET_PRIORITIES.HIGH,
  media: SUPPORT_TICKET_PRIORITIES.HIGH,
  medium: SUPPORT_TICKET_PRIORITIES.HIGH,
  baixa: SUPPORT_TICKET_PRIORITIES.LOW,
  low: SUPPORT_TICKET_PRIORITIES.LOW,
  normal: SUPPORT_TICKET_PRIORITIES.NORMAL,
  urgente: SUPPORT_TICKET_PRIORITIES.URGENT,
  urgent: SUPPORT_TICKET_PRIORITIES.URGENT,
};

const SUPPORT_STATUS_ALIASES: Record<string, SupportTicketStatus> = {
  aberto: SUPPORT_TICKET_STATUSES.OPEN,
  open: SUPPORT_TICKET_STATUSES.OPEN,
  andamento: SUPPORT_TICKET_STATUSES.IN_PROGRESS,
  'em andamento': SUPPORT_TICKET_STATUSES.IN_PROGRESS,
  in_progress: SUPPORT_TICKET_STATUSES.IN_PROGRESS,
  fechado: SUPPORT_TICKET_STATUSES.CLOSED,
  closed: SUPPORT_TICKET_STATUSES.CLOSED,
  resolvido: SUPPORT_TICKET_STATUSES.RESOLVED,
  resolved: SUPPORT_TICKET_STATUSES.RESOLVED,
  aguardando: SUPPORT_TICKET_STATUSES.WAITING_USER,
  waiting: SUPPORT_TICKET_STATUSES.WAITING_USER,
  waiting_user: SUPPORT_TICKET_STATUSES.WAITING_USER,
};

export const normalizeSupportPriority = (value?: string) => {
  if (!value) return undefined;
  return SUPPORT_PRIORITY_ALIASES[value.toLowerCase()];
};

export const normalizeSupportStatus = (value?: string) => {
  if (!value) return undefined;
  return SUPPORT_STATUS_ALIASES[value.toLowerCase()];
};

// Campaign Asset Types
export const CAMPAIGN_ASSET_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
} as const;

export type CampaignAssetType =
  (typeof CAMPAIGN_ASSET_TYPES)[keyof typeof CAMPAIGN_ASSET_TYPES];

export const CAMPAIGN_ASSET_TYPE_LABELS: Record<string, string> = {
  image: 'Imagem',
  video: 'Vídeo',
};

export enum AdminRole {
  COLABORADOR = 'COLABORADOR',
  ADMIN_MASTER = 'ADMIN_MASTER',
}

export enum AdminPermission {
  OVERVIEW = 'overview',
  USERS = 'users',
  BOTS = 'bots',
  USAGE = 'usage',
  TEMPLATES = 'templates',
  CAMPAIGNS = 'campaigns',
  SUPPORT = 'support',
  FINANCE = 'finance',
  PERMISSIONS = 'permissions',
  PROMO_TOKENS = 'promo_tokens',
}

export const ADMIN_PERMISSIONS = [
  AdminPermission.OVERVIEW,
  AdminPermission.USERS,
  AdminPermission.BOTS,
  AdminPermission.USAGE,
  AdminPermission.TEMPLATES,
  AdminPermission.CAMPAIGNS,
  AdminPermission.SUPPORT,
  AdminPermission.FINANCE,
  AdminPermission.PERMISSIONS,
  AdminPermission.PROMO_TOKENS,
] as const;

import { BOT_TYPES, type BotType } from './bot-types.js';

export const BOT_TYPE_LABELS: Record<BotType, string> = {
  [BOT_TYPES.ARTS]: 'Artes',
  [BOT_TYPES.DOWNLOAD]: 'Download',
};

export const SUBSCRIPTION_STATUSES = {
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
  NO_SUBSCRIPTION: 'NO_SUBSCRIPTION',
  UNKNOWN: 'UNKNOWN',
} as const;

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUSES)[keyof typeof SUBSCRIPTION_STATUSES];

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativa',
  PAST_DUE: 'Em atraso',
  CANCELED: 'Cancelada',
  EXPIRED: 'Expirada',
  REFUNDED: 'Reembolsada',
  NO_SUBSCRIPTION: 'Sem assinatura',
  UNKNOWN: 'Desconhecido',
};

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
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
} as const;

export type SupportTicketStatus =
  (typeof SUPPORT_TICKET_STATUSES)[keyof typeof SUPPORT_TICKET_STATUSES];

export const SUPPORT_TICKET_STATUS_LABELS: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  closed: 'Fechado',
  archived: 'Arquivado',
};

export const SUPPORT_TICKET_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  NORMAL: 'normal',
} as const;

export type SupportTicketPriority =
  (typeof SUPPORT_TICKET_PRIORITIES)[keyof typeof SUPPORT_TICKET_PRIORITIES];

export const SUPPORT_TICKET_PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
  normal: 'Normal',
};

const SUPPORT_PRIORITY_ALIASES: Record<string, SupportTicketPriority> = {
  alta: SUPPORT_TICKET_PRIORITIES.HIGH,
  high: SUPPORT_TICKET_PRIORITIES.HIGH,
  hight: SUPPORT_TICKET_PRIORITIES.HIGH,
  media: SUPPORT_TICKET_PRIORITIES.MEDIUM,
  medium: SUPPORT_TICKET_PRIORITIES.MEDIUM,
  baixa: SUPPORT_TICKET_PRIORITIES.LOW,
  low: SUPPORT_TICKET_PRIORITIES.LOW,
  normal: SUPPORT_TICKET_PRIORITIES.NORMAL,
};

const SUPPORT_STATUS_ALIASES: Record<string, SupportTicketStatus> = {
  aberto: SUPPORT_TICKET_STATUSES.OPEN,
  open: SUPPORT_TICKET_STATUSES.OPEN,
  andamento: SUPPORT_TICKET_STATUSES.IN_PROGRESS,
  'em andamento': SUPPORT_TICKET_STATUSES.IN_PROGRESS,
  in_progress: SUPPORT_TICKET_STATUSES.IN_PROGRESS,
  fechado: SUPPORT_TICKET_STATUSES.CLOSED,
  closed: SUPPORT_TICKET_STATUSES.CLOSED,
  resolvido: SUPPORT_TICKET_STATUSES.CLOSED,
  resolved: SUPPORT_TICKET_STATUSES.CLOSED,
  arquivado: SUPPORT_TICKET_STATUSES.ARCHIVED,
  archived: SUPPORT_TICKET_STATUSES.ARCHIVED,
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

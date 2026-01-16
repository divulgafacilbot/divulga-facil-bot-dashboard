export const BOT_TYPE_LABELS = {
  PROMOCOES: 'Promoções',
  DOWNLOAD: 'Download',
  PINTEREST: 'Pinterest',
  SUGGESTION: 'Sugestões',
} as const;

export type BotType = keyof typeof BOT_TYPE_LABELS;

export const SUBSCRIPTION_STATUS_LABELS = {
  PENDING_CONFIRMATION: 'Aguardando confirmação',
  ACTIVE: 'Ativa',
  GRACE: 'Período de carência',
  PAST_DUE: 'Em atraso',
  CANCELED: 'Cancelada',
  EXPIRED: 'Expirada',
  REFUNDED: 'Reembolsada',
  CHARGEBACK: 'Estornada',
  NO_SUBSCRIPTION: 'Sem assinatura',
  UNKNOWN: 'Desconhecido',
} as const;

export type SubscriptionStatus = keyof typeof SUBSCRIPTION_STATUS_LABELS;

export const KIWIFY_EVENT_TYPE_LABELS = {
  PAYMENT_CONFIRMED: 'Pagamento confirmado',
  SUBSCRIPTION_RENEWED: 'Renovação de assinatura',
  REFUND: 'Reembolso',
  CHARGEBACK: 'Estorno',
  SUBSCRIPTION_CANCELED: 'Assinatura cancelada',
  purchase: 'Compra',
  subscription_renewed: 'Renovação de assinatura',
} as const;

export type KiwifyEventType = keyof typeof KIWIFY_EVENT_TYPE_LABELS;

export const PAYMENT_STATUS_LABELS = {
  paid: 'Pago',
  pending: 'Pendente',
  refunded: 'Reembolsado',
  chargeback: 'Estornado',
} as const;

export type PaymentStatus = keyof typeof PAYMENT_STATUS_LABELS;

export const PROCESSING_STATUS_LABELS = {
  PENDING: 'Pendente',
  PROCESSED: 'Processado',
  ERROR: 'Erro',
} as const;

export type ProcessingStatus = keyof typeof PROCESSING_STATUS_LABELS;

export const SUPPORT_TICKET_STATUS_LABELS = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  closed: 'Fechado',
  archived: 'Arquivado',
} as const;

export type SupportTicketStatus = keyof typeof SUPPORT_TICKET_STATUS_LABELS;

export const SUPPORT_TICKET_PRIORITY_LABELS = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
  normal: 'Normal',
} as const;

export type SupportTicketPriority = keyof typeof SUPPORT_TICKET_PRIORITY_LABELS;

export const SUPPORT_TICKET_CATEGORY_LABELS = {
  general: 'Geral',
  technical: 'Tecnico',
  billing: 'Cobranca',
  feature_request: 'Solicitacao de Recurso',
} as const;

export type SupportTicketCategory = keyof typeof SUPPORT_TICKET_CATEGORY_LABELS;

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

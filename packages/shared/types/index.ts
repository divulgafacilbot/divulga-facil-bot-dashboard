// User Types
export interface User {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription Types
export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'REFUNDED';
  expiresAt: Date;
  kiwifyCustomerId?: string;
  kiwifyTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Plan Types
export interface Plan {
  id: string;
  name: string;
  billingCycle: 'MONTHLY' | 'YEARLY' | 'LIFETIME';
  maxArtesPorDia: number;
  maxDownloadsPorDia: number;
  maxExecucoes Simultaneas: number;
  cooldownEntreRequisicoes: number;
  acessoBotGeracao: boolean;
  acessoBotDownload: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Telegram Types
export interface TelegramLink {
  id: string;
  userId: string;
  telegramUserId: number;
  telegramChatId: number;
  linkedAt: Date;
}

export interface TelegramBotLink {
  id: string;
  userId: string;
  botType: 'ARTS' | 'DOWNLOAD';
  linkedAt: Date;
}

// Brand Config Types
export interface UserBrandConfig {
  id: string;
  userId: string;
  templateId: string;
  bgColor: string;
  textColor: string;
  fontFamily: string;
  showCoupon: boolean;
  couponText?: string;
  updatedAt: Date;
}

// Product Data (Scraping)
export interface ProductData {
  source: 'shopee' | 'mercadolivre' | 'amazon' | 'magalu';
  url: string;
  title: string;
  priceText: string;
  priceValue?: number;
  imageUrl: string;
}

// Media Data (Social Downloads)
export interface MediaData {
  source: 'instagram' | 'tiktok' | 'pinterest';
  url: string;
  mediaType: 'image' | 'video';
  directUrl: string;
  filenameHint?: string;
}

// Telemetry Event Types
export type TelemetryEventType =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'TELEGRAM_LINKED'
  | 'TELEGRAM_UNLINKED'
  | 'ART_JOB_STARTED'
  | 'ART_JOB_SUCCESS'
  | 'ART_JOB_FAILED'
  | 'DOWNLOAD_JOB_STARTED'
  | 'DOWNLOAD_JOB_SUCCESS'
  | 'DOWNLOAD_JOB_FAILED'
  | 'SCRAPE_FALLBACK_PLAYWRIGHT'
  | 'SCRAPE_FALLBACK_SCRAPERAPI'
  | 'SCRAPE_BLOCKED'
  | 'PLAN_EXPIRED'
  | 'PLAN_RENEWED'
  | 'KIWIFY_WEBHOOK_RECEIVED'
  | 'KIWIFY_WEBHOOK_FAILED'
  | 'EMAIL_LINK_CODE_SENT'
  | 'EMAIL_LINK_CODE_VALIDATED'
  | 'EMAIL_LINK_CODE_FAILED';

export interface TelemetryEvent {
  id: string;
  eventType: TelemetryEventType;
  userId?: string;
  telegramUserId?: number;
  origin: 'dashboard' | 'bot_arts' | 'bot_download' | 'webhook' | 'admin';
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

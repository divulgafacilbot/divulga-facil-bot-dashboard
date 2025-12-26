// User Roles
export const USER_ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

// Subscription Status
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
} as const;

// Bot Types
export const BOT_TYPES = {
  ARTS: 'ARTS',
  DOWNLOAD: 'DOWNLOAD',
} as const;

// Telemetry Origins
export const TELEMETRY_ORIGINS = {
  DASHBOARD: 'dashboard',
  BOT_ARTS: 'bot_arts',
  BOT_DOWNLOAD: 'bot_download',
  WEBHOOK: 'webhook',
  ADMIN: 'admin',
} as const;

// Marketplace Sources
export const MARKETPLACE_SOURCES = {
  SHOPEE: 'shopee',
  MERCADO_LIVRE: 'mercadolivre',
  AMAZON: 'amazon',
  MAGALU: 'magalu',
} as const;

// Social Media Sources
export const SOCIAL_SOURCES = {
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
  PINTEREST: 'pinterest',
} as const;

// Media Types
export const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
} as const;

// Image Dimensions
export const IMAGE_DIMENSIONS = {
  CARD: { width: 1080, height: 1080 },
  STORY: { width: 1080, height: 1920 },
  WHATSAPP: { width: 1080, height: 1350 },
} as const;

// Rate Limits
export const RATE_LIMITS = {
  DEFAULT_COOLDOWN: 5, // seconds
  MAX_RETRIES: 3,
  REQUEST_TIMEOUT: 30000, // 30 seconds
} as const;

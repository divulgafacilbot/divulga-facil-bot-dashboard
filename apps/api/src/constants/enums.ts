/**
 * Consolidated Enums - Feature 7
 *
 * Single source of truth for all enums used across the application.
 * These mirror the Prisma enums but are available for non-database code.
 */

// ============================================================
// MARKETPLACE ENUMS
// ============================================================

/**
 * Supported marketplaces for affiliate products
 */
export const Marketplace = {
  MERCADO_LIVRE: 'MERCADO_LIVRE',
  SHOPEE: 'SHOPEE',
  AMAZON: 'AMAZON',
  MAGALU: 'MAGALU',
  ALIEXPRESS: 'ALIEXPRESS',
  AMERICANAS: 'AMERICANAS',
  SHEIN: 'SHEIN',
} as const;

export type MarketplaceType = (typeof Marketplace)[keyof typeof Marketplace];

export const MARKETPLACE_VALUES = Object.values(Marketplace);

export const MARKETPLACE_DISPLAY_NAMES: Record<MarketplaceType, string> = {
  MERCADO_LIVRE: 'Mercado Livre',
  SHOPEE: 'Shopee',
  AMAZON: 'Amazon',
  MAGALU: 'Magazine Luiza',
  ALIEXPRESS: 'AliExpress',
  AMERICANAS: 'Americanas',
  SHEIN: 'Shein',
};

// ============================================================
// CARD ENUMS
// ============================================================

/**
 * Source of card creation (bot or manual)
 */
export const CardSource = {
  BOT: 'BOT',
  MANUAL: 'MANUAL',
} as const;

export type CardSourceType = (typeof CardSource)[keyof typeof CardSource];

export const CARD_SOURCE_VALUES = Object.values(CardSource);

/**
 * Card status (soft delete implementation)
 */
export const CardStatus = {
  ACTIVE: 'ACTIVE',
  HIDDEN: 'HIDDEN',
  BLOCKED: 'BLOCKED',
  ERROR: 'ERROR',
} as const;

export type CardStatusType = (typeof CardStatus)[keyof typeof CardStatus];

export const CARD_STATUS_VALUES = Object.values(CardStatus);

export const CARD_STATUS_DISPLAY_NAMES: Record<CardStatusType, string> = {
  ACTIVE: 'Ativo',
  HIDDEN: 'Oculto',
  BLOCKED: 'Bloqueado',
  ERROR: 'Erro',
};

// ============================================================
// EVENT TYPE ENUMS
// ============================================================

/**
 * Public event types for tracking
 */
export const EventType = {
  PROFILE_VIEW: 'PUBLIC_PROFILE_VIEW',
  CARD_VIEW: 'PUBLIC_CARD_VIEW',
  CTA_CLICK: 'PUBLIC_CTA_CLICK',
  CARD_CLICK: 'PUBLIC_CARD_CLICK',
} as const;

export type EventTypeType = (typeof EventType)[keyof typeof EventType];

export const EVENT_TYPE_VALUES = Object.values(EventType);

/**
 * Mapping from simplified names to Prisma PublicEventType
 * For backward compatibility with existing code
 */
export const EVENT_TYPE_TO_PRISMA: Record<string, string> = {
  PROFILE_VIEW: 'PUBLIC_PROFILE_VIEW',
  CARD_VIEW: 'PUBLIC_CARD_VIEW',
  CTA_CLICK: 'PUBLIC_CTA_CLICK',
  CARD_CLICK: 'PUBLIC_CARD_CLICK',
};

/**
 * Mapping from Prisma PublicEventType to simplified names
 */
export const PRISMA_TO_EVENT_TYPE: Record<string, string> = {
  PUBLIC_PROFILE_VIEW: 'PROFILE_VIEW',
  PUBLIC_CARD_VIEW: 'CARD_VIEW',
  PUBLIC_CTA_CLICK: 'CTA_CLICK',
  PUBLIC_CARD_CLICK: 'CARD_CLICK',
};

// ============================================================
// BOT TYPE ENUMS
// ============================================================

/**
 * Telegram bot types
 */
export const BotType = {
  PROMOCOES: 'PROMOCOES',
  DOWNLOAD: 'DOWNLOAD',
  PINTEREST: 'PINTEREST',
  SUGGESTION: 'SUGGESTION',
} as const;

export type BotTypeType = (typeof BotType)[keyof typeof BotType];

export const BOT_TYPE_VALUES = Object.values(BotType);

export const BOT_TYPE_DISPLAY_NAMES: Record<BotTypeType, string> = {
  PROMOCOES: 'Bot de Promoções',
  DOWNLOAD: 'Bot de Download',
  PINTEREST: 'Bot do Pinterest',
  SUGGESTION: 'Bot de Sugestões',
};

// ============================================================
// VALIDATION HELPERS
// ============================================================

/**
 * Check if value is a valid Marketplace
 */
export function isValidMarketplace(value: string): value is MarketplaceType {
  return MARKETPLACE_VALUES.includes(value as MarketplaceType);
}

/**
 * Check if value is a valid CardSource
 */
export function isValidCardSource(value: string): value is CardSourceType {
  return CARD_SOURCE_VALUES.includes(value as CardSourceType);
}

/**
 * Check if value is a valid CardStatus
 */
export function isValidCardStatus(value: string): value is CardStatusType {
  return CARD_STATUS_VALUES.includes(value as CardStatusType);
}

/**
 * Check if value is a valid EventType
 */
export function isValidEventType(value: string): value is EventTypeType {
  return EVENT_TYPE_VALUES.includes(value as EventTypeType);
}

/**
 * Check if value is a valid BotType
 */
export function isValidBotType(value: string): value is BotTypeType {
  return BOT_TYPE_VALUES.includes(value as BotTypeType);
}

import type { BotType } from '../constants/bot-types.js';

export interface PromoToken {
  id: string;
  botType: BotType;
  name: string;
  description?: string;
  token: string;
  expiresAt?: Date;
  isActive: boolean;
  createdById: string;
  userId: string;
  userEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePromoTokenInput {
  adminId: string;
  userId: string;
  botType: BotType;
  name: string;
  description?: string;
  expiresAt?: Date;
}

export interface UpdatePromoTokenInput {
  name?: string;
  description?: string;
  expiresAt?: Date;
}

export interface GetPromoTokensFilters {
  botType?: BotType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PromoTokensListResponse {
  tokens: PromoToken[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ValidateTokenResponse {
  valid: boolean;
  tokenId?: string;
  error?: string;
}

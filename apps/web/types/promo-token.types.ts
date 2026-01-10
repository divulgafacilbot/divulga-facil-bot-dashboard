import type { BotType } from '../lib/admin-enums';

export interface PromoToken {
  id: string;
  botType: BotType;
  name: string;
  description?: string;
  token: string;
  expiresAt?: string;
  isActive: boolean;
  createdById: string;
  userId: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromoTokenInput {
  botType: BotType;
  userId: string;
  name: string;
  description?: string;
  expiresAt?: string;
}

export interface UpdatePromoTokenInput {
  name?: string;
  description?: string;
  expiresAt?: string;
}

export interface GetPromoTokensFilters {
  botType?: BotType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PromoTokensListResponse {
  tokens: PromoToken[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

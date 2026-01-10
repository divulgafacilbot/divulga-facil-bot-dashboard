import { randomBytes } from 'crypto';
import { prisma } from '../../db/prisma.js';
import { telemetryService } from '../telemetry.service.js';
import type {
  CreatePromoTokenInput,
  UpdatePromoTokenInput,
  GetPromoTokensFilters,
  PromoTokensListResponse,
  ValidateTokenResponse,
  PromoToken,
} from '../../types/promo-token.types.js';
import type { BotType } from '../../constants/bot-types.js';

class PromoTokensService {
  /**
   * Create a new promotional token
   * Limit: 1 active promo token per bot type per user
   */
  async createToken(input: CreatePromoTokenInput): Promise<PromoToken> {
    // Check if user already has an active promo token for this bot type
    const existingToken = await prisma.promo_tokens.findFirst({
      where: {
        user_id: input.userId,
        bot_type: input.botType,
        is_active: true,
      },
    });

    if (existingToken) {
      throw new Error(`Usuário já possui um token promocional ativo para o bot ${input.botType}`);
    }

    // Generate secure 64-character token
    const token = randomBytes(32).toString('hex');

    const promoToken = await prisma.promo_tokens.create({
      data: {
        bot_type: input.botType,
        name: input.name,
        description: input.description || null,
        token,
        expires_at: input.expiresAt || null,
        is_active: true,
        created_by_id: input.adminId,
        user_id: input.userId,
      },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    // Log telemetry event
    await telemetryService.logEvent({
      eventType: 'TOKEN_CREATED',
      userId: input.adminId,
      metadata: {
        tokenId: promoToken.id,
        botType: input.botType,
        targetUserId: input.userId,
        hasExpiration: !!input.expiresAt,
      },
    });

    return this.mapToPromoToken(promoToken);
  }

  /**
   * Get paginated list of tokens with optional filters
   */
  async getTokens(
    filters: GetPromoTokensFilters = {}
  ): Promise<PromoTokensListResponse> {
    const {
      botType,
      isActive,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {};
    if (botType) {
      where.bot_type = botType;
    }
    if (isActive !== undefined) {
      where.is_active = isActive;
    }

    const skip = (page - 1) * limit;

    const [tokens, total] = await Promise.all([
      prisma.promo_tokens.findMany({
        where,
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
        include: {
          user: {
            select: { email: true },
          },
        },
      }),
      prisma.promo_tokens.count({ where }),
    ]);

    return {
      tokens: tokens.map(this.mapToPromoToken),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single token by ID
   */
  async getTokenById(id: string): Promise<PromoToken | null> {
    const token = await prisma.promo_tokens.findUnique({
      where: { id },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!token) {
      return null;
    }

    return this.mapToPromoToken(token);
  }

  /**
   * Update token metadata
   */
  async updateToken(
    id: string,
    updates: UpdatePromoTokenInput
  ): Promise<PromoToken | null> {
    const existingToken = await prisma.promo_tokens.findUnique({
      where: { id },
    });

    if (!existingToken) {
      return null;
    }

    const updatedToken = await prisma.promo_tokens.update({
      where: { id },
      data: {
        name: updates.name !== undefined ? updates.name : undefined,
        description: updates.description !== undefined ? updates.description : undefined,
        expires_at: updates.expiresAt !== undefined ? updates.expiresAt : undefined,
      },
    });

    return this.mapToPromoToken(updatedToken);
  }

  /**
   * Soft delete a token (mark as inactive)
   */
  async deleteToken(id: string, adminId: string): Promise<boolean> {
    const token = await prisma.promo_tokens.findUnique({
      where: { id },
    });

    if (!token) {
      return false;
    }

    await prisma.promo_tokens.update({
      where: { id },
      data: {
        is_active: false,
      },
    });

    // Log telemetry event
    await telemetryService.logEvent({
      eventType: 'TOKEN_DELETED',
      userId: adminId,
      metadata: {
        tokenId: id,
        botType: token.bot_type,
      },
    });

    return true;
  }

  /**
   * Rotate token - create new one and deactivate old one atomically
   */
  async rotateToken(id: string, adminId: string): Promise<PromoToken | null> {
    const oldToken = await prisma.promo_tokens.findUnique({
      where: { id },
    });

    if (!oldToken) {
      return null;
    }

    // Use transaction to ensure atomicity
    const newToken = await prisma.$transaction(async (tx) => {
      // Deactivate old token
      await tx.promo_tokens.update({
        where: { id },
        data: { is_active: false },
      });

      // Create new token with same properties
      const token = randomBytes(32).toString('hex');
      const created = await tx.promo_tokens.create({
        data: {
          bot_type: oldToken.bot_type,
          name: oldToken.name,
          description: oldToken.description,
          token,
          expires_at: oldToken.expires_at,
          is_active: true,
          created_by_id: adminId,
          user_id: oldToken.user_id,
        },
        include: {
          user: {
            select: { email: true },
          },
        },
      });

      return created;
    });

    // Log telemetry event
    await telemetryService.logEvent({
      eventType: 'TOKEN_ROTATED',
      userId: adminId,
      metadata: {
        oldTokenId: id,
        newTokenId: newToken.id,
        botType: oldToken.bot_type,
      },
    });

    return this.mapToPromoToken(newToken);
  }

  /**
   * Validate a token for bot consumption
   */
  async validateToken(
    token: string,
    botType: BotType
  ): Promise<ValidateTokenResponse> {
    const promoToken = await prisma.promo_tokens.findUnique({
      where: { token },
    });

    // Token not found
    if (!promoToken) {
      await this.logValidation(null, botType, false, 'Token not found');
      return {
        valid: false,
        error: 'Token not found',
      };
    }

    // Token is inactive
    if (!promoToken.is_active) {
      await this.logValidation(promoToken.id, botType, false, 'Token is inactive');
      return {
        valid: false,
        tokenId: promoToken.id,
        error: 'Token is inactive',
      };
    }

    // Token expired
    if (promoToken.expires_at && promoToken.expires_at < new Date()) {
      await this.logValidation(promoToken.id, botType, false, 'Token expired');
      return {
        valid: false,
        tokenId: promoToken.id,
        error: 'Token expired',
      };
    }

    // Wrong bot type
    if (promoToken.bot_type !== botType) {
      await this.logValidation(
        promoToken.id,
        botType,
        false,
        `Token is for ${promoToken.bot_type}, not ${botType}`
      );
      return {
        valid: false,
        tokenId: promoToken.id,
        error: `Token is for ${promoToken.bot_type}, not ${botType}`,
      };
    }

    // Valid token
    await this.logValidation(promoToken.id, botType, true);
    return {
      valid: true,
      tokenId: promoToken.id,
    };
  }

  /**
   * Log validation attempt
   */
  private async logValidation(
    tokenId: string | null,
    botType: BotType,
    success: boolean,
    reason?: string
  ): Promise<void> {
    await telemetryService.logEvent({
      eventType: 'TOKEN_VALIDATED',
      metadata: {
        tokenId,
        botType,
        success,
        reason,
      },
    });
  }

  /**
   * Map database record to PromoToken type
   */
  private mapToPromoToken(record: any): PromoToken {
    return {
      id: record.id,
      botType: record.bot_type as BotType,
      name: record.name,
      description: record.description || undefined,
      token: record.token,
      expiresAt: record.expires_at || undefined,
      isActive: record.is_active,
      createdById: record.created_by_id,
      userId: record.user_id,
      userEmail: record.user?.email || undefined,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Get tokens for a specific user
   */
  async getTokensByUserId(userId: string, botType?: BotType): Promise<PromoToken[]> {
    const where: any = {
      user_id: userId,
      is_active: true,
    };

    if (botType) {
      where.bot_type = botType;
    }

    // Check expiration
    const now = new Date();

    const tokens = await prisma.promo_tokens.findMany({
      where: {
        ...where,
        OR: [
          { expires_at: null },
          { expires_at: { gt: now } },
        ],
      },
      orderBy: {
        created_at: 'desc',
      },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    return tokens.map(this.mapToPromoToken);
  }

  /**
   * Delete token by user (user can delete their own promo token)
   */
  async deleteTokenByUser(tokenId: string, userId: string): Promise<boolean> {
    const token = await prisma.promo_tokens.findFirst({
      where: {
        id: tokenId,
        user_id: userId,
        is_active: true,
      },
    });

    if (!token) {
      return false;
    }

    await prisma.promo_tokens.update({
      where: { id: tokenId },
      data: { is_active: false },
    });

    // Log telemetry
    await telemetryService.logEvent({
      eventType: 'PROMO_TOKEN_DELETED_BY_USER',
      userId,
      metadata: {
        tokenId,
        botType: token.bot_type,
      },
    });

    return true;
  }

  /**
   * Refresh/rotate token by user
   */
  async refreshTokenByUser(tokenId: string, userId: string): Promise<PromoToken | null> {
    const oldToken = await prisma.promo_tokens.findFirst({
      where: {
        id: tokenId,
        user_id: userId,
        is_active: true,
      },
    });

    if (!oldToken) {
      return null;
    }

    // Use transaction to ensure atomicity
    const newToken = await prisma.$transaction(async (tx) => {
      // Deactivate old token
      await tx.promo_tokens.update({
        where: { id: tokenId },
        data: { is_active: false },
      });

      // Create new token with same properties
      const token = randomBytes(32).toString('hex');
      const created = await tx.promo_tokens.create({
        data: {
          bot_type: oldToken.bot_type,
          name: oldToken.name,
          description: oldToken.description,
          token,
          expires_at: oldToken.expires_at,
          is_active: true,
          created_by_id: oldToken.created_by_id,
          user_id: userId,
        },
        include: {
          user: {
            select: { email: true },
          },
        },
      });

      return created;
    });

    // Log telemetry
    await telemetryService.logEvent({
      eventType: 'PROMO_TOKEN_REFRESHED_BY_USER',
      userId,
      metadata: {
        oldTokenId: tokenId,
        newTokenId: newToken.id,
        botType: oldToken.bot_type,
      },
    });

    return this.mapToPromoToken(newToken);
  }
}

export const promoTokensService = new PromoTokensService();

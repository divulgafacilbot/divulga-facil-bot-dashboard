import { Router } from 'express';
import { z } from 'zod';
import { PublicPageService } from '../services/pinterest/public-page.service.js';
import { PinterestBotConfigService } from '../services/pinterest/pinterest-bot-config.service.js';
import { CardService } from '../services/card.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { UploadService } from '../services/upload.service.js';
import { uploadSingleImage, handleUploadError } from '../middleware/upload.middleware.js';
import { nanoid } from 'nanoid';
import { sanitizeCardSlug } from '../utils/sanitize.utils.js';

// Helper function to trigger cache revalidation on the Next.js frontend
async function triggerRevalidation(slug: string, type: 'settings' | 'card' | 'all', cardSlug?: string): Promise<void> {
  try {
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
    const revalidateToken = process.env.REVALIDATE_SECRET_TOKEN;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (revalidateToken) {
      headers['x-revalidate-token'] = revalidateToken;
    }

    const response = await fetch(`${webUrl}/api/revalidate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ slug, type, cardSlug })
    });

    if (response.ok) {
      console.log(`[Revalidation] Triggered for /${slug} (type: ${type})`);
    } else {
      console.error(`[Revalidation] Failed for /${slug}:`, await response.text());
    }
  } catch (error) {
    // Don't fail the main request if revalidation fails
    console.error('[Revalidation] Error:', error);
  }
}

const router = Router();

// Validation schemas
const updateSettingsSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  headerColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  titleColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  headerImageUrl: z.string().max(500).optional(),
  bio: z.string().max(500).optional().nullable()
});

/**
 * GET /api/pinterest/settings
 * Get current public page settings
 */
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const settings = await PublicPageService.getByUserId(userId);

    if (!settings) {
      return res.status(404).json({
        error: 'Settings not found',
        message: 'Public page settings not initialized'
      });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PATCH /api/pinterest/settings
 * Update public page appearance
 */
router.patch('/settings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const body = updateSettingsSchema.parse(req.body);

    // Map camelCase to snake_case for database
    const updates: any = {};
    if (body.displayName !== undefined) updates.display_name = body.displayName;
    if (body.headerColor !== undefined) updates.header_color = body.headerColor;
    if (body.titleColor !== undefined) updates.title_color = body.titleColor;
    if (body.headerImageUrl !== undefined) updates.header_image_url = body.headerImageUrl;
    if (body.bio !== undefined) updates.bio = body.bio;

    const settings = await PublicPageService.update(userId, updates);

    // Trigger cache revalidation for the public page
    if (settings.public_slug) {
      triggerRevalidation(settings.public_slug, 'settings');
    }

    res.json({
      settings,
      message: 'Configurações atualizadas com sucesso'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * POST /api/pinterest/settings/header-image
 * Upload header image for public page
 */
router.post('/settings/header-image', authMiddleware, uploadSingleImage, handleUploadError, async (req: any, res: any) => {
  try {
    const userId = req.user!.id;

    // Validate image was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Validate file size (max 2MB)
    if (req.file.size > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image must be less than 2MB' });
    }

    // Get current settings to check for existing header image
    const currentSettings = await PublicPageService.getByUserId(userId);

    // Delete old header image if it was an uploaded file (not default)
    if (currentSettings?.header_image_url &&
        currentSettings.header_image_url.startsWith('/uploads/') &&
        !currentSettings.header_image_url.includes('logo-bot-bg')) {
      await UploadService.deleteCardImage(currentSettings.header_image_url);
    }

    // Upload new header image
    const headerImageUrl = await UploadService.uploadCardImage(
      req.file.buffer,
      `header-${userId}-${Date.now()}`,
      req.file.mimetype
    );

    // Update settings with new header image URL
    const settings = await PublicPageService.update(userId, {
      header_image_url: headerImageUrl
    });

    // Trigger cache revalidation for the public page
    if (settings.public_slug) {
      triggerRevalidation(settings.public_slug, 'settings');
    }

    res.json({
      data: { headerImageUrl },
      settings,
      message: 'Imagem de cabeçalho atualizada com sucesso'
    });
  } catch (error) {
    console.error('Upload header image error:', error);
    res.status(500).json({ error: 'Failed to upload header image' });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Pinterest Bot Config Routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const updateBotConfigSchema = z.object({
  enabled: z.boolean().optional(),
  autoPublish: z.boolean().optional(),
  defaultCategory: z.string().max(100).nullable().optional()
});

/**
 * GET /api/pinterest/bot-config
 * Get Pinterest bot configuration for current user
 */
router.get('/bot-config', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const config = await PinterestBotConfigService.getOrCreate(userId);

    res.json({
      config: {
        id: config.id,
        enabled: config.enabled,
        autoPublish: config.auto_publish,
        defaultCategory: config.default_category,
        createdAt: config.created_at,
        updatedAt: config.updated_at
      }
    });
  } catch (error) {
    console.error('Get bot config error:', error);
    res.status(500).json({ error: 'Failed to fetch bot configuration' });
  }
});

/**
 * PATCH /api/pinterest/bot-config
 * Update Pinterest bot configuration
 */
router.patch('/bot-config', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const body = updateBotConfigSchema.parse(req.body);

    const config = await PinterestBotConfigService.update(userId, {
      enabled: body.enabled,
      autoPublish: body.autoPublish,
      defaultCategory: body.defaultCategory
    });

    res.json({
      config: {
        id: config.id,
        enabled: config.enabled,
        autoPublish: config.auto_publish,
        defaultCategory: config.default_category,
        createdAt: config.created_at,
        updatedAt: config.updated_at
      },
      message: 'Configurações do bot atualizadas com sucesso'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update bot config error:', error);
    res.status(500).json({ error: 'Failed to update bot configuration' });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Manual Card CRUD Routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const createCardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  price: z.string().min(1).max(50),
  originalPrice: z.string().max(50).optional(),
  affiliateUrl: z.string().url().max(1000),
  marketplace: z.enum(['MERCADO_LIVRE', 'SHOPEE', 'AMAZON', 'MAGALU']),
  coupon: z.string().max(100).optional(),
  category: z.string().max(100).default('Outros')
});

const updateCardSchema = createCardSchema.partial();

/**
 * POST /api/pinterest/cards
 * Create a manual card with image upload
 */
router.post('/cards', authMiddleware, uploadSingleImage, handleUploadError, async (req: any, res: any) => {
  try {
    const userId = req.user!.id;

    // Validate form data
    const cardData = createCardSchema.parse(JSON.parse(req.body.data || '{}'));

    // Validate image
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Upload and process image
    const imageUrl = await UploadService.uploadCardImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Generate unique slug
    const cardSlug = sanitizeCardSlug(`${nanoid(8)}-${Date.now()}`) || `${nanoid(8)}-${Date.now()}`;

    // Create card using CardService
    const card = await CardService.createCard({
      userId,
      cardSlug,
      source: 'MANUAL',
      marketplace: cardData.marketplace as any,
      title: cardData.title,
      description: cardData.description,
      price: cardData.price,
      originalPrice: cardData.originalPrice,
      imageUrl,
      affiliateUrl: cardData.affiliateUrl,
      coupon: cardData.coupon,
      category: cardData.category
    });

    // Trigger cache revalidation for the public page
    const pageSettings = await PublicPageService.getByUserId(userId);
    if (pageSettings?.public_slug) {
      triggerRevalidation(pageSettings.public_slug, 'card', card.card_slug);
    }

    res.status(201).json({
      card,
      message: 'Card criado com sucesso'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create card error:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

/**
 * GET /api/pinterest/cards
 * List all cards for current user
 */
router.get('/cards', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { status, source, limit, cursor } = req.query;

    // Parse status - allow multiple statuses or single
    let statusFilter: any = undefined;
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      statusFilter = statuses.length === 1 ? statuses[0] : statuses;
    }

    const result = await CardService.listCards({
      userId,
      status: statusFilter as any,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      cursor: cursor as string
    });

    res.json(result);
  } catch (error) {
    console.error('List cards error:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

/**
 * PATCH /api/pinterest/cards/:id
 * Update a manual card
 */
router.patch('/cards/:id', authMiddleware, uploadSingleImage, handleUploadError, async (req: any, res: any) => {
  try {
    const userId = req.user!.id;
    const cardId = req.params.id;

    // Check if card exists and belongs to user
    const existingCard = await CardService.getCardById(cardId, true);

    if (!existingCard || existingCard.user_id !== userId) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Parse update data
    const updateData = updateCardSchema.parse(JSON.parse(req.body.data || '{}'));

    // Handle image upload if provided
    let imageUrl = existingCard.image_url;
    if (req.file) {
      // Delete old image if it was uploaded
      if (existingCard.image_url.startsWith('/uploads/')) {
        await UploadService.deleteCardImage(existingCard.image_url);
      }

      // Upload new image
      imageUrl = await UploadService.uploadCardImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
    }

    // Update card using CardService
    const card = await CardService.updateCard(cardId, {
      title: updateData.title,
      description: updateData.description,
      price: updateData.price,
      originalPrice: updateData.originalPrice,
      affiliateUrl: updateData.affiliateUrl,
      coupon: updateData.coupon,
      category: updateData.category,
      imageUrl
    });

    // Trigger cache revalidation for the public page
    const pageSettings = await PublicPageService.getByUserId(userId);
    if (pageSettings?.public_slug) {
      triggerRevalidation(pageSettings.public_slug, 'card', card.card_slug);
    }

    res.json({
      card,
      message: 'Card atualizado com sucesso'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update card error:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

/**
 * DELETE /api/pinterest/cards/:id
 * Permanently delete a card (hard delete - cannot be recovered)
 */
router.delete('/cards/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const cardId = req.params.id;

    // Check if card exists and belongs to user
    const existingCard = await CardService.getCardById(cardId, true);

    if (!existingCard || existingCard.user_id !== userId) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Delete uploaded image if it exists
    if (existingCard.image_url?.startsWith('/uploads/')) {
      await UploadService.deleteCardImage(existingCard.image_url);
    }

    // Permanently delete the card
    await CardService.deleteCard(cardId);

    // Trigger cache revalidation for the public page
    const pageSettings = await PublicPageService.getByUserId(userId);
    if (pageSettings?.public_slug) {
      triggerRevalidation(pageSettings.public_slug, 'card', existingCard.card_slug);
    }

    res.json({ message: 'Card removido permanentemente' });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

/**
 * PATCH /api/pinterest/cards/:id/status
 * Update card status (ACTIVE/HIDDEN)
 */
router.patch('/cards/:id/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const cardId = req.params.id;
    const { status } = z.object({
      status: z.enum(['ACTIVE', 'HIDDEN'])
    }).parse(req.body);

    // Check if card exists and belongs to user
    const existingCard = await CardService.getCardById(cardId, true);

    if (!existingCard || existingCard.user_id !== userId) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Update status using CardService (hide or restore)
    const card = status === 'ACTIVE'
      ? await CardService.restoreCard(cardId)
      : await CardService.hideCard(cardId);

    // Trigger cache revalidation for the public page
    const pageSettings = await PublicPageService.getByUserId(userId);
    if (pageSettings?.public_slug) {
      triggerRevalidation(pageSettings.public_slug, 'card', card.card_slug);
    }

    res.json({
      card,
      message: status === 'ACTIVE' ? 'Card ativado' : 'Card ocultado'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update card status error:', error);
    res.status(500).json({ error: 'Failed to update card status' });
  }
});

export default router;

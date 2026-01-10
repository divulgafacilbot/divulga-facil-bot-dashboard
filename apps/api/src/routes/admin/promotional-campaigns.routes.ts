import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { SUGGESTION_CONSTANTS } from '../../constants/suggestions.constants.js';
import { requireAdmin } from '../../middleware/require-admin.middleware.js';

const router = Router();

/**
 * GET /api/admin/promotional-campaigns
 * List all promotional campaigns for suggestions bot
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { marketplace, is_active, page = 1, limit = 20 } = req.query;

    const where: any = {};

    if (marketplace) {
      where.marketplace = marketplace;
    }

    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [campaigns, total] = await Promise.all([
      prisma.promotional_campaigns.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { created_at: 'desc' },
        ],
        skip,
        take,
      }),
      prisma.promotional_campaigns.count({ where }),
    ]);

    res.json({
      campaigns,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('[AdminPromotionalCampaigns] Error listing campaigns:', error);
    res.status(500).json({ error: 'Failed to list campaigns' });
  }
});

/**
 * GET /api/admin/promotional-campaigns/:id
 * Get a single promotional campaign
 */
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.promotional_campaigns.findUnique({
      where: { id },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('[AdminPromotionalCampaigns] Error getting campaign:', error);
    res.status(500).json({ error: 'Failed to get campaign' });
  }
});

/**
 * POST /api/admin/promotional-campaigns
 * Create a new promotional campaign
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      product_title,
      product_url,
      category,
      marketplace,
      hook_angle,
      is_active = true,
      priority = 0,
    } = req.body;

    // Validation
    if (!name || !product_title || !product_url || !marketplace) {
      return res.status(400).json({
        error: 'Missing required fields: name, product_title, product_url, marketplace',
      });
    }

    if (!SUGGESTION_CONSTANTS.MARKETPLACES.includes(marketplace as any)) {
      return res.status(400).json({
        error: `Invalid marketplace. Must be one of: ${SUGGESTION_CONSTANTS.MARKETPLACES.join(', ')}`,
      });
    }

    if (category && !SUGGESTION_CONSTANTS.ALLOWED_CATEGORIES.includes(category as any)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${SUGGESTION_CONSTANTS.ALLOWED_CATEGORIES.join(', ')}`,
      });
    }

    const campaign = await prisma.promotional_campaigns.create({
      data: {
        name,
        product_title,
        product_url,
        category,
        marketplace,
        hook_angle,
        is_active,
        priority,
      },
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('[AdminPromotionalCampaigns] Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

/**
 * PUT /api/admin/promotional-campaigns/:id
 * Update a promotional campaign
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      product_title,
      product_url,
      category,
      marketplace,
      hook_angle,
      is_active,
      priority,
    } = req.body;

    // Check if campaign exists
    const existing = await prisma.promotional_campaigns.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Validation
    if (marketplace && !SUGGESTION_CONSTANTS.MARKETPLACES.includes(marketplace as any)) {
      return res.status(400).json({
        error: `Invalid marketplace. Must be one of: ${SUGGESTION_CONSTANTS.MARKETPLACES.join(', ')}`,
      });
    }

    if (category && !SUGGESTION_CONSTANTS.ALLOWED_CATEGORIES.includes(category as any)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${SUGGESTION_CONSTANTS.ALLOWED_CATEGORIES.join(', ')}`,
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (product_title !== undefined) updateData.product_title = product_title;
    if (product_url !== undefined) updateData.product_url = product_url;
    if (category !== undefined) updateData.category = category;
    if (marketplace !== undefined) updateData.marketplace = marketplace;
    if (hook_angle !== undefined) updateData.hook_angle = hook_angle;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (priority !== undefined) updateData.priority = priority;

    const campaign = await prisma.promotional_campaigns.update({
      where: { id },
      data: updateData,
    });

    res.json(campaign);
  } catch (error) {
    console.error('[AdminPromotionalCampaigns] Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

/**
 * DELETE /api/admin/promotional-campaigns/:id
 * Delete a promotional campaign
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if campaign exists
    const existing = await prisma.promotional_campaigns.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await prisma.promotional_campaigns.delete({
      where: { id },
    });

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('[AdminPromotionalCampaigns] Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

/**
 * POST /api/admin/promotional-campaigns/:id/toggle
 * Toggle campaign active status
 */
router.post('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.promotional_campaigns.findUnique({
      where: { id },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const updated = await prisma.promotional_campaigns.update({
      where: { id },
      data: { is_active: !campaign.is_active },
    });

    res.json(updated);
  } catch (error) {
    console.error('[AdminPromotionalCampaigns] Error toggling campaign:', error);
    res.status(500).json({ error: 'Failed to toggle campaign' });
  }
});

/**
 * GET /api/admin/promotional-campaigns/rotation/:marketplace
 * Get rotation state for a marketplace
 */
router.get('/rotation/:marketplace', requireAdmin, async (req, res) => {
  try {
    const { marketplace } = req.params;

    if (!SUGGESTION_CONSTANTS.MARKETPLACES.includes(marketplace as any)) {
      return res.status(400).json({
        error: `Invalid marketplace. Must be one of: ${SUGGESTION_CONSTANTS.MARKETPLACES.join(', ')}`,
      });
    }

    const rotationState = await prisma.campaign_rotation_state.findUnique({
      where: { marketplace },
      include: {
        promotional_campaigns: true,
      },
    });

    res.json(rotationState || null);
  } catch (error) {
    console.error('[AdminPromotionalCampaigns] Error getting rotation state:', error);
    res.status(500).json({ error: 'Failed to get rotation state' });
  }
});

/**
 * POST /api/admin/promotional-campaigns/cache/invalidate
 * Invalidate suggestion cache (force regeneration)
 */
router.post('/cache/invalidate', requireAdmin, async (req, res) => {
  try {
    await prisma.suggestion_cache.deleteMany({
      where: { cache_key: 'global' },
    });

    res.json({ message: 'Cache invalidated successfully' });
  } catch (error) {
    console.error('[AdminPromotionalCampaigns] Error invalidating cache:', error);
    res.status(500).json({ error: 'Failed to invalidate cache' });
  }
});

export default router;

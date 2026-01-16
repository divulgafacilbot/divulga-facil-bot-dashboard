import { Router } from 'express';
import { requireAdmin, requirePermission } from '../../middleware/require-admin.middleware.js';
import { KiwifyProductsService, KiwifyProductData } from '../../services/admin/kiwify-products.service.js';
import { AuditService, AuditAction } from '../../services/audit/audit.service.js';
import { z } from 'zod';

const router = Router();

const createProductSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  product_name: z.string().nullable().optional(),
  kind: z.enum(['SUBSCRIPTION', 'ADDON_MARKETPLACE', 'PROMO_TOKEN_PACK']),
  plan_id: z.string().uuid().nullable().optional(),
  bot_type: z.string().nullable().optional(),
  quantity: z.number().int().positive().default(1),
});

const updateProductSchema = z.object({
  product_id: z.string().min(1).optional(),
  product_name: z.string().nullable().optional(),
  kind: z.enum(['SUBSCRIPTION', 'ADDON_MARKETPLACE', 'PROMO_TOKEN_PACK']).optional(),
  plan_id: z.string().uuid().nullable().optional(),
  bot_type: z.string().nullable().optional(),
  quantity: z.number().int().positive().optional(),
});

/**
 * GET /admin/kiwify-products
 * List all Kiwify product mappings
 */
router.get('/', requireAdmin, requirePermission('finance'), async (req, res) => {
  try {
    const kind = req.query.kind as string | undefined;

    let products;
    if (kind && ['SUBSCRIPTION', 'ADDON_MARKETPLACE', 'PROMO_TOKEN_PACK'].includes(kind)) {
      products = await KiwifyProductsService.getMappingsByKind(kind as any);
    } else {
      products = await KiwifyProductsService.getAllMappings();
    }

    res.json({ success: true, data: products });
  } catch (error: any) {
    console.error('Get kiwify products error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/kiwify-products/:id
 * Get a single Kiwify product mapping
 */
router.get('/:id', requireAdmin, requirePermission('finance'), async (req, res) => {
  try {
    const { id } = req.params;
    const product = await KiwifyProductsService.getProductMapping(id);

    if (!product) {
      return res.status(404).json({ error: 'Product mapping not found' });
    }

    res.json({ success: true, data: product });
  } catch (error: any) {
    console.error('Get kiwify product error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/kiwify-products
 * Create a new Kiwify product mapping
 */
router.post('/', requireAdmin, requirePermission('finance'), async (req, res) => {
  try {
    const validation = createProductSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const data = validation.data as KiwifyProductData;

    // Check if product_id already exists
    const exists = await KiwifyProductsService.productIdExists(data.product_id);
    if (exists) {
      return res.status(409).json({
        error: 'Product ID already mapped',
        message: 'This Kiwify product ID is already configured',
      });
    }

    const product = await KiwifyProductsService.createMapping(data);

    // Audit log
    await AuditService.logAction({
      actor_admin_id: (req as any).admin?.id,
      action: AuditAction.ENTITLEMENT_CREATED,
      entity_type: 'kiwify_product',
      entity_id: product.id,
      after: product,
      metadata: { product_id: data.product_id, kind: data.kind },
    });

    res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    console.error('Create kiwify product error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /admin/kiwify-products/:id
 * Update a Kiwify product mapping
 */
router.put('/:id', requireAdmin, requirePermission('finance'), async (req, res) => {
  try {
    const { id } = req.params;

    const validation = updateProductSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const data = validation.data;

    // Check if new product_id conflicts with existing
    if (data.product_id) {
      const existing = await KiwifyProductsService.getProductMapping(data.product_id);
      if (existing && existing.id !== id) {
        return res.status(409).json({
          error: 'Product ID already mapped',
          message: 'This Kiwify product ID is already configured for another mapping',
        });
      }
    }

    const before = await KiwifyProductsService.getProductMapping(id);
    const product = await KiwifyProductsService.updateMapping(id, data);

    // Audit log
    await AuditService.logAction({
      actor_admin_id: (req as any).admin?.id,
      action: AuditAction.SUBSCRIPTION_UPDATED,
      entity_type: 'kiwify_product',
      entity_id: id,
      before,
      after: product,
      metadata: { changes: Object.keys(data) },
    });

    res.json({ success: true, data: product });
  } catch (error: any) {
    console.error('Update kiwify product error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /admin/kiwify-products/:id
 * Delete a Kiwify product mapping
 */
router.delete('/:id', requireAdmin, requirePermission('finance'), async (req, res) => {
  try {
    const { id } = req.params;

    const before = await KiwifyProductsService.getProductMapping(id);
    if (!before) {
      return res.status(404).json({ error: 'Product mapping not found' });
    }

    await KiwifyProductsService.deleteMapping(id);

    // Audit log
    await AuditService.logAction({
      actor_admin_id: (req as any).admin?.id,
      action: AuditAction.ENTITLEMENT_REVOKED,
      entity_type: 'kiwify_product',
      entity_id: id,
      before,
      metadata: { product_id: before.product_id },
    });

    res.json({ success: true, message: 'Product mapping deleted' });
  } catch (error: any) {
    console.error('Delete kiwify product error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

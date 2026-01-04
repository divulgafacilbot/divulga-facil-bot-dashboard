import { Router, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { AdminTemplatesService } from '../../services/admin/templates.service.js';
import { requireAdmin, requirePermission, AdminRequest } from '../../middleware/require-admin.middleware.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/templates/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

const templateCategorySchema = z.enum([
  'Mercado Livre',
  'Magalu',
  'Shopee',
  'Amazon',
  'Datas especiais',
  'Diversos',
  'Templates Personalizados',
]);

const createTemplateSchema = z.object({
  name: z.string().min(1),
  category: templateCategorySchema,
  owner_user_id: z.string().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().optional(),
  category: templateCategorySchema.optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /admin/templates
 * Get all templates
 */
router.get(
  '/',
  requireAdmin,
  requirePermission('templates'),
  async (req: AdminRequest, res: Response) => {
    try {
      const { category, is_active } = req.query;

      const filters: any = {};
      if (category) filters.category = category as string;
      if (is_active !== undefined) filters.is_active = is_active === 'true';

      const templates = await AdminTemplatesService.getAllTemplates(filters);

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /admin/templates/stats
 * Get template statistics
 */
router.get(
  '/stats',
  requireAdmin,
  requirePermission('templates'),
  async (req: AdminRequest, res: Response) => {
    try {
      const stats = await AdminTemplatesService.getTemplateStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching template stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /admin/templates/:id
 * Get template by ID
 */
router.get(
  '/:id',
  requireAdmin,
  requirePermission('templates'),
  async (req: AdminRequest, res: Response) => {
    try {
      const template = await AdminTemplatesService.getTemplateById(req.params.id);

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Template not found') {
        return res.status(404).json({ error: error.message });
      }

      console.error('Error fetching template:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /admin/templates
 * Create a new template
 */
router.post(
  '/',
  requireAdmin,
  requirePermission('templates'),
  upload.fields([
    { name: 'story_image', maxCount: 1 },
    { name: 'feed_image', maxCount: 1 },
  ]),
  async (req: AdminRequest, res: Response) => {
    try {
      const data = createTemplateSchema.parse(req.body);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.story_image || !files.feed_image) {
        return res.status(400).json({ error: 'Both story and feed images are required' });
      }

      const template = await AdminTemplatesService.createTemplate({
        name: data.name,
        category: data.category,
        story_image: `/uploads/templates/${files.story_image[0].filename}`,
        feed_image: `/uploads/templates/${files.feed_image[0].filename}`,
        owner_user_id: data.owner_user_id || null,
      });

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }

      console.error('Error creating template:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /admin/templates/:id
 * Update a template
 */
router.put(
  '/:id',
  requireAdmin,
  requirePermission('templates'),
  upload.fields([
    { name: 'story_image', maxCount: 1 },
    { name: 'feed_image', maxCount: 1 },
  ]),
  async (req: AdminRequest, res: Response) => {
    try {
      const data = updateTemplateSchema.parse(req.body);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      const template = await AdminTemplatesService.updateTemplate(req.params.id, {
        ...data,
        story_image: files?.story_image?.[0]
          ? `/uploads/templates/${files.story_image[0].filename}`
          : undefined,
        feed_image: files?.feed_image?.[0]
          ? `/uploads/templates/${files.feed_image[0].filename}`
          : undefined,
      });

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }

      if (error instanceof Error && error.message === 'Template not found') {
        return res.status(404).json({ error: error.message });
      }

      console.error('Error updating template:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /admin/templates/:id
 * Delete a template
 */
router.delete(
  '/:id',
  requireAdmin,
  requirePermission('templates'),
  async (req: AdminRequest, res: Response) => {
    try {
      const result = await AdminTemplatesService.deleteTemplate(req.params.id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Template not found') {
        return res.status(404).json({ error: error.message });
      }

      console.error('Error deleting template:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PATCH /admin/templates/:id/deactivate
 * Deactivate a template
 */
router.patch(
  '/:id/deactivate',
  requireAdmin,
  requirePermission('templates'),
  async (req: AdminRequest, res: Response) => {
    try {
      const template = await AdminTemplatesService.deactivateTemplate(req.params.id);

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error('Error deactivating template:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PATCH /admin/templates/:id/activate
 * Activate a template
 */
router.patch(
  '/:id/activate',
  requireAdmin,
  requirePermission('templates'),
  async (req: AdminRequest, res: Response) => {
    try {
      const template = await AdminTemplatesService.activateTemplate(req.params.id);

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error('Error activating template:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /admin/templates/import-base
 * Import base templates from web public folder
 */
router.post(
  '/import-base',
  requireAdmin,
  requirePermission('templates'),
  async (_req: AdminRequest, res: Response) => {
    try {
      const result = await AdminTemplatesService.importBaseTemplates();
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error importing base templates:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

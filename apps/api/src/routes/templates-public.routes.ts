import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import { TemplatesListingService } from '../services/templates-listing.service.js';
import { UserTemplatesService } from '../services/user/templates.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/user-templates/');
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

/**
 * GET /api/templates
 * Get all available templates (base + user's personal)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, userId } = req.query;

    const templates = await TemplatesListingService.getAvailableTemplates({
      userId: userId as string,
      category: category as string,
      includeUserTemplates: true,
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/templates/categories
 * Get available template categories
 */
router.get('/categories', (req: Request, res: Response) => {
  const categories = TemplatesListingService.getCategories();

  res.json({
    success: true,
    data: categories,
  });
});

/**
 * GET /api/templates/by-category
 * Get templates grouped by category
 */
router.get('/by-category', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    const grouped = await TemplatesListingService.getTemplatesByCategory(
      userId as string
    );

    res.json({
      success: true,
      data: grouped,
    });
  } catch (error) {
    console.error('Error fetching templates by category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/templates/:id
 * Get a specific template by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    const template = await TemplatesListingService.getTemplateById(
      req.params.id,
      userId as string
    );

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Template not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({ error: error.message });
      }
    }

    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/templates/upload
 * Upload a new personal template (user authenticated)
 */
router.post(
  '/upload',
  requireAuth,
  upload.fields([
    { name: 'story_image', maxCount: 1 },
    { name: 'feed_image', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { name } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!name) {
        return res.status(400).json({ error: 'Template name is required' });
      }

      if (!files.story_image || !files.feed_image) {
        return res.status(400).json({ error: 'Both story and feed images are required' });
      }

      const template = await UserTemplatesService.uploadTemplate({
        userId: req.user.id,
        name,
        story_image: `/uploads/user-templates/${files.story_image[0].filename}`,
        feed_image: `/uploads/user-templates/${files.feed_image[0].filename}`,
        category: 'Templates Personalizados',
      });

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error('Error uploading template:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/templates/my/list
 * Get user's personal templates
 */
router.get('/my/list', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const templates = await UserTemplatesService.getUserTemplates(req.user.id);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Error fetching user templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/templates/my/:id
 * Delete a user's personal template
 */
router.delete('/my/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await UserTemplatesService.deleteUserTemplate(
      req.user.id,
      req.params.id
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Template not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({ error: error.message });
      }
    }

    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router } from 'express';
import multer from 'multer';
import {
  createCampaign,
  listCampaigns,
  getCampaignById,
  deleteCampaign,
  downloadCampaignZip,
  getCampaignStats,
} from '../../controllers/admin/campaigns.controller.js';
import { requireAdmin } from '../../middleware/require-admin.middleware.js';

const router = Router();

// Configure multer with memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

/**
 * GET /admin/campaigns/stats
 * Get campaign statistics
 */
router.get('/stats', requireAdmin, getCampaignStats);

/**
 * POST /admin/campaigns
 * Create a new campaign
 */
router.post(
  '/',
  requireAdmin,
  upload.fields([
    { name: 'main_video', maxCount: 1 },
    { name: 'assets', maxCount: 20 },
  ]),
  createCampaign
);

/**
 * GET /admin/campaigns
 * List all campaigns
 */
router.get('/', requireAdmin, listCampaigns);

/**
 * GET /admin/campaigns/:id
 * Get campaign by ID
 */
router.get('/:id', requireAdmin, getCampaignById);

/**
 * DELETE /admin/campaigns/:id
 * Delete a campaign
 */
router.delete('/:id', requireAdmin, deleteCampaign);

/**
 * GET /admin/campaigns/:id/download
 * Download campaign as ZIP
 */
router.get('/:id/download', requireAdmin, downloadCampaignZip);

export default router;

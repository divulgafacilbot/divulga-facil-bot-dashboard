import type { Request, Response } from 'express';
import { CampaignService } from '../../services/admin/campaign.service.js';
import {
  uploadFile,
  getAssetsByCampaignId,
  deleteAsset,
} from '../../services/admin/campaign-asset.service.js';
import { generateCampaignZip } from '../../services/admin/zip-generator.service.js';
import {
  createCampaignSchema,
  fileTypeSchema,
} from '../../validators/admin/campaign.schema.js';
import type { CampaignAssetType } from '../../types/campaign.types.js';

/**
 * Creates a new campaign with main video and optional assets
 * @route POST /api/admin/campaigns
 */
export async function createCampaign(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validationResult = createCampaignSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    // Validate files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const fileValidationResult = fileTypeSchema.safeParse({
      main_video: files.main_video?.[0],
      assets: files.assets,
    });

    if (!fileValidationResult.success) {
      res.status(400).json({
        error: 'File validation failed',
        details: fileValidationResult.error.errors,
      });
      return;
    }

    // Upload main video
    const mainVideoFile = files.main_video?.[0];
    if (!mainVideoFile) {
      res.status(400).json({
        error: 'Main video is required',
      });
      return;
    }

    const mainVideoUpload = await uploadFile(mainVideoFile, 'campaign-videos');
    const mainVideoUrl = mainVideoUpload.url;

    // Upload assets if provided
    const assetUrls: Array<{ url: string; type: CampaignAssetType }> = [];
    const assetFiles = files.assets || [];

    for (const assetFile of assetFiles) {
      const assetUpload = await uploadFile(assetFile, 'campaign-assets');
      const assetType: CampaignAssetType = assetFile.mimetype.startsWith('image/')
        ? 'image'
        : 'video';

      assetUrls.push({
        url: assetUpload.url,
        type: assetType,
      });
    }

    // Create campaign
    const campaign = await CampaignService.createCampaign(
      validationResult.data,
      mainVideoUrl,
      assetUrls
    );

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      error: 'Failed to create campaign',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Lists all campaigns with optional filtering and pagination
 * @route GET /api/admin/campaigns
 */
export async function listCampaigns(req: Request, res: Response): Promise<void> {
  try {
    const { search, page, limit, sortBy, sortOrder } = req.query;
    const sortByValue = typeof sortBy === 'string' ? sortBy : undefined;
    const allowedSortBy = ['created_at', 'name', 'price'] as const;
    const normalizedSortBy = allowedSortBy.includes(sortByValue as typeof allowedSortBy[number])
      ? (sortByValue as typeof allowedSortBy[number])
      : undefined;

    const filters = {
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      sortBy: normalizedSortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    };

    const result = await CampaignService.listCampaigns(filters);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({
      error: 'Failed to list campaigns',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Gets a single campaign by ID with all assets
 * @route GET /api/admin/campaigns/:id
 */
export async function getCampaignById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const campaign = await CampaignService.getCampaignById(id);

    if (!campaign) {
      res.status(404).json({
        error: 'Campaign not found',
      });
      return;
    }

    res.status(200).json(campaign);
  } catch (error) {
    console.error('Error getting campaign:', error);
    res.status(500).json({
      error: 'Failed to get campaign',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Deletes a campaign and all associated assets
 * @route DELETE /api/admin/campaigns/:id
 */
export async function deleteCampaign(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    await CampaignService.deleteCampaign(id);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting campaign:', error);

    if (error instanceof Error && error.message === 'Campaign not found') {
      res.status(404).json({
        error: 'Campaign not found',
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to delete campaign',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Downloads a campaign as a ZIP file with all media and README
 * @route GET /api/admin/campaigns/:id/download
 */
export async function downloadCampaignZip(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const { stream, filename } = await generateCampaignZip(id);

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe archive to response
    stream.pipe(res);

    // Handle errors
    stream.on('error', (error) => {
      console.error('Error streaming ZIP:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to generate ZIP file',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  } catch (error) {
    console.error('Error downloading campaign ZIP:', error);

    if (error instanceof Error && error.message === 'Campaign not found') {
      res.status(404).json({
        error: 'Campaign not found',
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to download campaign',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Gets campaign statistics
 * @route GET /api/admin/campaigns/stats
 */
export async function getCampaignStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await CampaignService.getCampaignStats();

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting campaign stats:', error);
    res.status(500).json({
      error: 'Failed to get campaign statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

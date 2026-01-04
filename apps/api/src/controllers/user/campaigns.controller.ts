import { Request, Response } from 'express';
import { UserCampaignsService } from '../../services/user/campaigns.service.js';
import { generateCampaignZip } from '../../services/admin/zip-generator.service.js';

/**
 * List all available campaigns
 * GET /api/user/campaigns
 *
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200 with campaigns array
 */
export async function listCampaigns(req: Request, res: Response): Promise<void> {
  try {
    const campaigns = await UserCampaignsService.listAvailableCampaigns();
    res.status(200).json(campaigns);
  } catch (error) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({
      error: 'Failed to list campaigns',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Download campaign ZIP file
 * GET /api/user/campaigns/:id/download
 *
 * @param req - Express request object with campaign ID in params
 * @param res - Express response object
 * @returns ZIP file stream or error
 */
export async function downloadCampaignZip(req: Request, res: Response): Promise<void> {
  try {
    const campaignId = req.params.id;
    const userId = req.user!.id;

    // Get campaign and track download
    await UserCampaignsService.getCampaignForDownload(campaignId, userId);

    // Generate ZIP archive
    const { stream, filename } = await generateCampaignZip(campaignId);

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe archive stream to response
    stream.pipe(res);

    // Handle stream errors
    stream.on('error', (error) => {
      console.error('Error streaming ZIP:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to generate ZIP file',
          message: error.message
        });
      }
    });

  } catch (error) {
    console.error('Error downloading campaign:', error);

    if (error instanceof Error && error.message === 'Campaign not found') {
      res.status(404).json({
        error: 'Campaign not found',
        message: 'The requested campaign does not exist'
      });
    } else {
      res.status(500).json({
        error: 'Failed to download campaign',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

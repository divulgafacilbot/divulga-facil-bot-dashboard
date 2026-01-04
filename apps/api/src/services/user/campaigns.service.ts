import { prisma } from '../../db/prisma.js';
import { CampaignDTO, CampaignWithAssets } from '../../types/campaign.types.js';

/**
 * User Campaigns Service
 * Handles campaign-related operations for regular users (non-admin)
 */
export class UserCampaignsService {
  /**
   * List all available campaigns
   * Returns all campaigns with asset count, ordered by creation date
   *
   * @returns {Promise<CampaignDTO[]>} Array of campaign DTOs
   */
  static async listAvailableCampaigns(): Promise<CampaignDTO[]> {
    const campaigns = await prisma.campaigns.findMany({
      orderBy: {
        created_at: 'desc',
      },
      include: {
        campaign_assets: true,
      },
    });

    return campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      price: Number(campaign.price),
      product_url: campaign.product_url,
      main_video_url: campaign.main_video_url,
      created_at: campaign.created_at,
      updated_at: campaign.updated_at,
      asset_count: campaign.campaign_assets.length,
    }));
  }

  /**
   * Get campaign details for download
   * Fetches a campaign with all its assets and records the download
   *
   * @param {string} campaignId - The campaign ID
   * @param {string} userId - The user ID
   * @returns {Promise<CampaignWithAssets>} Campaign with all assets
   * @throws {Error} If campaign is not found
   */
  static async getCampaignForDownload(
    campaignId: string,
    userId: string
  ): Promise<CampaignWithAssets> {
    const campaign = await prisma.campaigns.findUnique({
      where: { id: campaignId },
      include: {
        campaign_assets: {
          orderBy: {
            created_at: 'asc',
          },
        },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Record the download
    await this.trackDownload(campaignId, userId);

    return {
      id: campaign.id,
      name: campaign.name,
      price: Number(campaign.price),
      product_url: campaign.product_url,
      main_video_url: campaign.main_video_url,
      created_at: campaign.created_at,
      updated_at: campaign.updated_at,
      assets: campaign.campaign_assets.map((asset) => ({
        id: asset.id,
        campaign_id: asset.campaign_id,
        asset_url: asset.asset_url,
        asset_type: asset.asset_type as 'image' | 'video',
        created_at: asset.created_at,
      })),
    };
  }

  /**
   * Track campaign download
   * Records a download in the campaign_downloads table
   * Idempotent - does not fail if user already downloaded the campaign
   *
   * @param {string} campaignId - The campaign ID
   * @param {string} userId - The user ID
   * @returns {Promise<void>}
   */
  static async trackDownload(
    campaignId: string,
    userId: string
  ): Promise<void> {
    // Check if download record already exists
    const existing = await prisma.campaign_downloads.findFirst({
      where: {
        campaign_id: campaignId,
        user_id: userId,
      },
    });

    if (!existing) {
      // Create new download record
      await prisma.campaign_downloads.create({
        data: {
          campaign_id: campaignId,
          user_id: userId,
          downloaded_at: new Date(),
        },
      });
    } else {
      // Update existing record with new timestamp
      await prisma.campaign_downloads.update({
        where: {
          id: existing.id,
        },
        data: {
          downloaded_at: new Date(),
        },
      });
    }
  }
}

import { prisma } from '../../db/prisma.js';
import type {
  CampaignWithAssets,
  CampaignListResponse,
  CampaignFilters,
  CreateCampaignPayload,
  CampaignAssetType,
  CampaignDTO,
  CampaignAssetDTO,
} from '../../types/campaign.types.js';

/**
 * Admin Campaign Service
 * Handles CRUD operations for promotional campaigns
 */
export class CampaignService {
  /**
   * Creates a new campaign with main video and associated assets
   * @param data - Campaign creation payload
   * @param mainVideoUrl - URL of the main promotional video
   * @param assetUrls - Array of additional media assets
   * @returns Created campaign with all assets
   */
  static async createCampaign(
    data: CreateCampaignPayload,
    mainVideoUrl: string,
    assetUrls: Array<{ url: string; type: CampaignAssetType }>
  ): Promise<CampaignWithAssets> {
    try {
      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Create the campaign
        const campaign = await tx.campaigns.create({
          data: {
            name: data.name,
            price: data.price,
            product_url: data.product_url,
            main_video_url: mainVideoUrl,
          },
        });

        // Create associated assets
        const assets = await Promise.all(
          assetUrls.map((asset) =>
            tx.campaign_assets.create({
              data: {
                campaign_id: campaign.id,
                asset_url: asset.url,
                asset_type: asset.type,
              },
            })
          )
        );

        // Return campaign with assets
        return {
          id: campaign.id,
          name: campaign.name,
          price: Number(campaign.price),
          product_url: campaign.product_url,
          main_video_url: campaign.main_video_url,
          created_at: campaign.created_at,
          updated_at: campaign.updated_at,
          assets: assets.map((asset) => ({
            id: asset.id,
            campaign_id: asset.campaign_id,
            asset_url: asset.asset_url,
            asset_type: asset.asset_type as CampaignAssetType,
            created_at: asset.created_at,
          })),
        };
      });

      return result;
    } catch (error) {
      throw new Error(
        `Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Lists campaigns with optional filtering, sorting, and pagination
   * @param filters - Optional filters for campaigns
   * @returns Paginated list of campaigns with asset count
   */
  static async listCampaigns(
    filters?: CampaignFilters
  ): Promise<CampaignListResponse> {
    try {
      const {
        search,
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc',
      } = filters || {};

      // Build where clause
      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { product_url: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Build orderBy clause
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute queries in parallel
      const [campaigns, total] = await Promise.all([
        prisma.campaigns.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            _count: {
              select: {
                campaign_assets: true,
              },
            },
          },
        }),
        prisma.campaigns.count({ where }),
      ]);

      // Map to DTO format
      const campaignDTOs: CampaignDTO[] = campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        price: Number(campaign.price),
        product_url: campaign.product_url,
        main_video_url: campaign.main_video_url,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at,
        asset_count: campaign._count.campaign_assets,
      }));

      return {
        campaigns: campaignDTOs,
        total,
        page,
        limit,
      };
    } catch (error) {
      throw new Error(
        `Failed to list campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets a single campaign by ID with all associated assets
   * @param id - Campaign ID
   * @returns Campaign with assets or null if not found
   */
  static async getCampaignById(id: string): Promise<CampaignWithAssets | null> {
    try {
      const campaign = await prisma.campaigns.findUnique({
        where: { id },
        include: {
          campaign_assets: {
            orderBy: {
              created_at: 'asc',
            },
          },
        },
      });

      if (!campaign) {
        return null;
      }

      // Map to DTO format
      const campaignWithAssets: CampaignWithAssets = {
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
          asset_type: asset.asset_type as CampaignAssetType,
          created_at: asset.created_at,
        })),
      };

      return campaignWithAssets;
    } catch (error) {
      throw new Error(
        `Failed to get campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get campaign by ID with all related assets
   * @param campaignId - The campaign UUID
   * @returns Campaign with campaign_assets included
   * @throws Error if campaign not found
   * @deprecated Use getCampaignById instead
   */
  static async getCampaignWithAssets(campaignId: string) {
    const campaign = await prisma.campaigns.findUnique({
      where: { id: campaignId },
      include: {
        campaign_assets: true,
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    return campaign;
  }

  /**
   * Deletes a campaign and all associated assets (cascade)
   * @param id - Campaign ID to delete
   * @throws Error if campaign not found or deletion fails
   */
  static async deleteCampaign(id: string): Promise<void> {
    try {
      // Check if campaign exists
      const campaign = await prisma.campaigns.findUnique({
        where: { id },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Delete campaign (cascade will handle assets and downloads)
      await prisma.campaigns.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Campaign not found') {
        throw error;
      }
      throw new Error(
        `Failed to delete campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets campaign statistics
   * @returns Statistics about campaigns
   */
  static async getCampaignStats() {
    try {
      const [totalCampaigns, totalAssets, totalDownloads] = await Promise.all([
        prisma.campaigns.count(),
        prisma.campaign_assets.count(),
        prisma.campaign_downloads.count(),
      ]);

      return {
        total_campaigns: totalCampaigns,
        total_assets: totalAssets,
        total_downloads: totalDownloads,
        avg_assets_per_campaign:
          totalCampaigns > 0 ? totalAssets / totalCampaigns : 0,
      };
    } catch (error) {
      throw new Error(
        `Failed to get campaign stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

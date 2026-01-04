/**
 * Campaign Types and Interfaces
 * Defines all types related to promotional campaigns
 */

/**
 * Campaign asset types
 */
export type CampaignAssetType = 'image' | 'video';

/**
 * Campaign DTO (Data Transfer Object)
 * Represents a campaign with its metadata and assets
 */
export interface CampaignDTO {
  id: string;
  name: string;
  price: number;
  product_url: string;
  main_video_url: string;
  created_at: Date;
  updated_at: Date;
  assets?: CampaignAssetDTO[];
  asset_count?: number;
}

/**
 * Campaign Asset DTO
 * Represents a single media asset attached to a campaign
 */
export interface CampaignAssetDTO {
  id: string;
  campaign_id: string;
  asset_url: string;
  asset_type: CampaignAssetType;
  created_at: Date;
}

/**
 * Campaign Download DTO
 * Represents a download record for tracking purposes
 */
export interface CampaignDownloadDTO {
  id: string;
  campaign_id: string;
  user_id: string;
  downloaded_at: Date;
}

/**
 * Create Campaign Payload
 * Data required to create a new campaign
 */
export interface CreateCampaignPayload {
  name: string;
  price: number;
  product_url: string;
}

/**
 * Campaign With Assets
 * Full campaign data including all associated assets
 */
export interface CampaignWithAssets extends CampaignDTO {
  assets: CampaignAssetDTO[];
}

/**
 * Campaign List Response
 * Paginated list of campaigns
 */
export interface CampaignListResponse {
  campaigns: CampaignDTO[];
  total: number;
  page?: number;
  limit?: number;
}

/**
 * Campaign Filters
 * Optional filters for querying campaigns
 */
export interface CampaignFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'name' | 'price';
  sortOrder?: 'asc' | 'desc';
}

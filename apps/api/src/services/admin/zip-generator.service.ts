import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { CampaignService } from './campaign.service.js';

/**
 * Generate a ZIP archive for a campaign with all media files and README
 * @param campaignId - The campaign UUID
 * @returns Object containing the archive stream and filename
 * @throws Error if campaign not found
 */
export async function generateCampaignZip(campaignId: string): Promise<{
  stream: archiver.Archiver;
  filename: string;
}> {
  // Fetch campaign with all assets
  const campaign = await CampaignService.getCampaignWithAssets(campaignId);

  // Create ZIP archive
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Maximum compression
  });

  // Collect all media file paths
  const mediaFiles: string[] = [];

  // Add main video
  if (campaign.main_video_url) {
    mediaFiles.push(campaign.main_video_url);
  }

  // Add all campaign assets
  if (campaign.campaign_assets && campaign.campaign_assets.length > 0) {
    campaign.campaign_assets.forEach((asset) => {
      if (asset.asset_url) {
        mediaFiles.push(asset.asset_url);
      }
    });
  }

  // Add media files to ZIP (skip if file doesn't exist)
  for (const mediaUrl of mediaFiles) {
    try {
      // Convert URL path to filesystem path
      // Assuming URLs are like /uploads/campaigns/filename.mp4
      let filePath: string;

      if (mediaUrl.startsWith('/uploads/')) {
        // Local file path
        filePath = path.join(process.cwd(), mediaUrl);
      } else if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
        // External URL - skip (can't add remote files to ZIP directly)
        console.warn(`Skipping external URL: ${mediaUrl}`);
        continue;
      } else {
        // Assume relative path from uploads directory
        filePath = path.join(process.cwd(), 'uploads', mediaUrl);
      }

      // Check if file exists
      if (fs.existsSync(filePath)) {
        const fileName = path.basename(filePath);
        archive.file(filePath, { name: fileName });
      } else {
        console.warn(`File not found, skipping: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error adding file to ZIP: ${mediaUrl}`, error);
      // Continue processing other files
    }
  }

  // Create README content
  const readmeContent = `Product Link: ${campaign.product_url}

Download this media and use the link for affiliate marketing.
`;

  // Add README.txt to ZIP
  archive.append(readmeContent, { name: 'README.txt' });

  // Finalize the archive (this must be called before returning)
  archive.finalize();

  // Sanitize campaign name for filename
  const sanitizedName = sanitizeCampaignName(campaign.name);
  const filename = `${sanitizedName}.zip`;

  return {
    stream: archive,
    filename,
  };
}

/**
 * Sanitize campaign name for use in filename
 * @param name - Original campaign name
 * @returns Sanitized name (lowercase, special chars removed, spaces to hyphens)
 */
function sanitizeCampaignName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple consecutive hyphens with single hyphen
}

import { prisma } from '../../db/prisma.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Uploads a file to local storage
 * @param file - The uploaded file from multer
 * @param folder - The folder name where the file will be stored (inside uploads/)
 * @returns Object containing the URL and file path
 */
export async function uploadFile(
  file: Express.Multer.File,
  folder: string
): Promise<{ url: string; path: string }> {
  try {
    // Create the target directory if it doesn't exist
    const uploadDir = path.resolve(process.cwd(), 'uploads', folder);
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${randomSuffix}${ext}`;

    // Save file to local storage
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, file.buffer);

    // Return URL and path
    const url = `/uploads/${folder}/${filename}`;
    return {
      url,
      path: filePath,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Fetches all campaign assets for a given campaign
 * @param campaignId - The campaign ID
 * @returns Array of campaign assets ordered by creation date
 */
export async function getAssetsByCampaignId(campaignId: string) {
  try {
    const assets = await prisma.campaign_assets.findMany({
      where: {
        campaign_id: campaignId,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return assets;
  } catch (error) {
    console.error('Error fetching campaign assets:', error);
    throw new Error('Failed to fetch campaign assets');
  }
}

/**
 * Deletes a campaign asset from the database and attempts to delete the physical file
 * @param assetId - The asset ID to delete
 * @returns void
 */
export async function deleteAsset(assetId: string): Promise<void> {
  try {
    // Fetch the asset to get the file path
    const asset = await prisma.campaign_assets.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new Error('Asset not found');
    }

    // Delete the asset record from database
    await prisma.campaign_assets.delete({
      where: { id: assetId },
    });

    // Attempt to delete physical file (don't fail if file doesn't exist)
    try {
      // Convert URL to file path
      const filePath = path.resolve(process.cwd(), asset.asset_url.replace(/^\//, ''));
      await fs.unlink(filePath);
    } catch (fileError) {
      // Log the error but don't throw - file might already be deleted or not exist
      console.warn(`Could not delete physical file for asset ${assetId}:`, fileError);
    }
  } catch (error) {
    console.error('Error deleting asset:', error);
    throw error;
  }
}

import axios from 'axios';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Marketplace Image Service
 * Handles image downloading, processing, and storage for marketplace products
 */
export class MarketplaceImageService {
  private uploadsDir: string;

  constructor() {
    // Path: apps/api/uploads/marketplace-products
    this.uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads', 'marketplace-products');
  }

  /**
   * Download and process product image
   * @param imageUrl - Original image URL
   * @param userId - User ID
   * @param productSlug - Product slug
   * @returns Local image path
   */
  async downloadAndProcessImage(
    imageUrl: string,
    userId: string,
    productSlug: string
  ): Promise<string> {
    // Ensure uploads directory exists
    await this.ensureDirectoryExists(this.uploadsDir);
    await this.ensureDirectoryExists(path.join(this.uploadsDir, userId));

    // Download image
    const imageBuffer = await this.downloadImage(imageUrl);

    // Process image (resize, optimize)
    const processedBuffer = await this.processImage(imageBuffer);

    // Save to disk
    const filename = `${productSlug}.jpg`;
    const filepath = path.join(this.uploadsDir, userId, filename);
    await fs.writeFile(filepath, processedBuffer);

    // Return relative path for storage
    return `/uploads/marketplace-products/${userId}/${filename}`;
  }

  /**
   * Download image from URL
   */
  private async downloadImage(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error('[MarketplaceImage] Download failed:', error);
      throw new Error('Failed to download product image');
    }
  }

  /**
   * Process image (resize, optimize, convert to JPEG)
   */
  private async processImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 85,
          progressive: true,
        })
        .toBuffer();
    } catch (error) {
      console.error('[MarketplaceImage] Processing failed:', error);
      throw new Error('Failed to process product image');
    }
  }

  /**
   * Delete product image
   */
  async deleteImage(imagePath: string): Promise<void> {
    try {
      // Convert relative path to absolute
      const absolutePath = path.join(__dirname, '..', '..', '..', imagePath);
      await fs.unlink(absolutePath);
    } catch (error) {
      console.error('[MarketplaceImage] Delete failed:', error);
      // Don't throw - image might already be deleted
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Get absolute path from relative path
   */
  getAbsolutePath(relativePath: string): string {
    return path.join(__dirname, '..', '..', '..', relativePath);
  }

  /**
   * Check if image exists
   */
  async imageExists(imagePath: string): Promise<boolean> {
    try {
      const absolutePath = this.getAbsolutePath(imagePath);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const marketplaceImageService = new MarketplaceImageService();

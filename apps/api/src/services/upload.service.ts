import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import sharp from 'sharp';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'cards');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export class UploadService {
  /**
   * Ensure upload directory exists
   */
  static async init() {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    console.log(`✅ Upload directory ready: ${UPLOAD_DIR}`);
  }

  /**
   * Upload and process card image
   * Returns relative URL path
   */
  static async uploadCardImage(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<string> {
    // Validate file type
    if (!ALLOWED_TYPES.includes(mimeType)) {
      throw new Error(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }

    // Validate file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(`File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Generate unique filename
    const ext = path.extname(originalName);
    const filename = `${nanoid()}-${Date.now()}`;
    const webpFilename = `${filename}.webp`;
    const filepath = path.join(UPLOAD_DIR, webpFilename);

    // Resize and optimize image
    await sharp(fileBuffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toFile(filepath);

    // Return relative URL
    return `/uploads/cards/${webpFilename}`;
  }

  /**
   * Delete card image
   */
  static async deleteCardImage(imageUrl: string): Promise<void> {
    if (!imageUrl.startsWith('/uploads/cards/')) {
      throw new Error('Invalid image URL');
    }

    const filename = path.basename(imageUrl);
    const filepath = path.join(UPLOAD_DIR, filename);

    try {
      await fs.unlink(filepath);
    } catch (error) {
      console.error(`Failed to delete image: ${filepath}`, error);
      // Don't throw - file might already be deleted
    }
  }

  /**
   * Get upload directory path
   */
  static getUploadDir(): string {
    return UPLOAD_DIR;
  }

  /**
   * Check if file exists
   */
  static async fileExists(imageUrl: string): Promise<boolean> {
    if (!imageUrl.startsWith('/uploads/cards/')) {
      return false;
    }

    const filename = path.basename(imageUrl);
    const filepath = path.join(UPLOAD_DIR, filename);

    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }
}

// Initialize on module load
UploadService.init().catch(err => {
  console.error('Failed to initialize upload service:', err);
});

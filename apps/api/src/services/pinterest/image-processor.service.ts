import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);

export class ImageProcessorService {
  private static UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'cards');
  private static MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  private static ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

  /**
   * Process and save uploaded image
   */
  static async processImage(
    fileBuffer: Buffer,
    mimetype: string,
    originalName: string
  ): Promise<string> {
    // 1. Validate file size
    if (fileBuffer.length > this.MAX_SIZE_BYTES) {
      throw new Error('File size exceeds 5MB limit');
    }

    // 2. Validate format
    if (!this.ALLOWED_FORMATS.includes(mimetype)) {
      throw new Error('Invalid file format. Only JPEG, PNG, and WebP allowed');
    }

    // 3. Ensure upload directory exists
    await fs.mkdir(this.UPLOAD_DIR, { recursive: true });

    // 4. Generate filename
    const ext = path.extname(originalName);
    const filename = `${nanoid()}${ext}`;
    const filepath = path.join(this.UPLOAD_DIR, filename);

    // 5. Process image (resize, optimize)
    await sharp(fileBuffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(filepath);

    // 6. Return relative URL
    return `/uploads/cards/${filename}`;
  }

  /**
   * Delete image file
   */
  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      const filename = path.basename(imageUrl);
      const filepath = path.join(this.UPLOAD_DIR, filename);
      await fs.unlink(filepath);
    } catch (error) {
      // Ignore errors (file may not exist)
    }
  }

  /**
   * Validate image dimensions
   */
  static async validateImage(fileBuffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(fileBuffer).metadata();

      // Min dimensions: 200x200, Max: 4000x4000
      if (!metadata.width || !metadata.height) {
        return false;
      }

      if (metadata.width < 200 || metadata.height < 200) {
        return false;
      }

      if (metadata.width > 4000 || metadata.height > 4000) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

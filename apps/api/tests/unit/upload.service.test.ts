import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UploadService } from '../../src/services/upload.service.js';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// Mock sharp
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock fs
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    unlink: vi.fn(),
    access: vi.fn(),
  },
}));

describe('UploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadCardImage', () => {
    it('should successfully upload and process a JPEG image', async () => {
      const mockBuffer = Buffer.from('fake-jpeg-data');
      const originalName = 'test-image.jpg';
      const mimeType = 'image/jpeg';

      const result = await UploadService.uploadCardImage(mockBuffer, originalName, mimeType);

      expect(result).toMatch(/^\/uploads\/cards\/.+\.webp$/);
      expect(sharp).toHaveBeenCalledWith(mockBuffer);
    });

    it('should successfully upload and process a PNG image', async () => {
      const mockBuffer = Buffer.from('fake-png-data');
      const originalName = 'test-image.png';
      const mimeType = 'image/png';

      const result = await UploadService.uploadCardImage(mockBuffer, originalName, mimeType);

      expect(result).toMatch(/^\/uploads\/cards\/.+\.webp$/);
      expect(sharp).toHaveBeenCalledWith(mockBuffer);
    });

    it('should successfully upload and process a WEBP image', async () => {
      const mockBuffer = Buffer.from('fake-webp-data');
      const originalName = 'test-image.webp';
      const mimeType = 'image/webp';

      const result = await UploadService.uploadCardImage(mockBuffer, originalName, mimeType);

      expect(result).toMatch(/^\/uploads\/cards\/.+\.webp$/);
    });

    it('should reject file with invalid MIME type', async () => {
      const mockBuffer = Buffer.from('fake-data');
      const originalName = 'test.txt';
      const mimeType = 'text/plain';

      await expect(
        UploadService.uploadCardImage(mockBuffer, originalName, mimeType)
      ).rejects.toThrow('Invalid file type');
    });

    it('should reject file exceeding size limit', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB (exceeds 5MB limit)
      const originalName = 'large-image.jpg';
      const mimeType = 'image/jpeg';

      await expect(
        UploadService.uploadCardImage(largeBuffer, originalName, mimeType)
      ).rejects.toThrow('File too large');
    });

    it('should resize image to 800x800', async () => {
      const mockBuffer = Buffer.from('fake-jpeg-data');
      const mockSharp = {
        resize: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(sharp).mockReturnValue(mockSharp as any);

      await UploadService.uploadCardImage(mockBuffer, 'test.jpg', 'image/jpeg');

      expect(mockSharp.resize).toHaveBeenCalledWith(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    });

    it('should convert image to WebP format with quality 80', async () => {
      const mockBuffer = Buffer.from('fake-jpeg-data');
      const mockSharp = {
        resize: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(sharp).mockReturnValue(mockSharp as any);

      await UploadService.uploadCardImage(mockBuffer, 'test.jpg', 'image/jpeg');

      expect(mockSharp.webp).toHaveBeenCalledWith({ quality: 80 });
    });

    it('should generate unique filenames for concurrent uploads', async () => {
      const mockBuffer = Buffer.from('fake-data');

      const [result1, result2, result3] = await Promise.all([
        UploadService.uploadCardImage(mockBuffer, 'test1.jpg', 'image/jpeg'),
        UploadService.uploadCardImage(mockBuffer, 'test2.jpg', 'image/jpeg'),
        UploadService.uploadCardImage(mockBuffer, 'test3.jpg', 'image/jpeg'),
      ]);

      expect(result1).not.toBe(result2);
      expect(result2).not.toBe(result3);
      expect(result1).not.toBe(result3);
    });
  });

  describe('deleteCardImage', () => {
    it('should successfully delete an existing image', async () => {
      const imageUrl = '/uploads/cards/test-image.webp';

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await UploadService.deleteCardImage(imageUrl);

      expect(result).toBe(true);
      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('test-image.webp')
      );
    });

    it('should return false when file does not exist', async () => {
      const imageUrl = '/uploads/cards/nonexistent.webp';

      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

      const result = await UploadService.deleteCardImage(imageUrl);

      expect(result).toBe(false);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      const imageUrl = '/uploads/cards/test-image.webp';

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockRejectedValue(new Error('Permission denied'));

      const result = await UploadService.deleteCardImage(imageUrl);

      expect(result).toBe(false);
    });

    it('should not delete files outside uploads directory', async () => {
      const imageUrl = '/etc/passwd';

      await expect(UploadService.deleteCardImage(imageUrl)).rejects.toThrow();
    });
  });

  describe('getImagePath', () => {
    it('should return correct absolute path for image URL', () => {
      const imageUrl = '/uploads/cards/test-image.webp';

      const result = UploadService.getImagePath(imageUrl);

      expect(result).toContain('uploads');
      expect(result).toContain('cards');
      expect(result).toContain('test-image.webp');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should handle URLs with query parameters', () => {
      const imageUrl = '/uploads/cards/test-image.webp?v=123';

      const result = UploadService.getImagePath(imageUrl);

      expect(result).toContain('test-image.webp');
      expect(result).not.toContain('?v=123');
    });
  });

  describe('validateImageBuffer', () => {
    it('should accept valid JPEG buffer within size limit', () => {
      const validBuffer = Buffer.alloc(2 * 1024 * 1024); // 2MB

      expect(() =>
        UploadService.validateImageBuffer(validBuffer, 'image/jpeg')
      ).not.toThrow();
    });

    it('should accept valid PNG buffer within size limit', () => {
      const validBuffer = Buffer.alloc(3 * 1024 * 1024); // 3MB

      expect(() =>
        UploadService.validateImageBuffer(validBuffer, 'image/png')
      ).not.toThrow();
    });

    it('should reject buffer with invalid MIME type', () => {
      const buffer = Buffer.alloc(1024);

      expect(() =>
        UploadService.validateImageBuffer(buffer, 'application/pdf')
      ).toThrow('Invalid file type');
    });

    it('should reject buffer exceeding size limit', () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

      expect(() =>
        UploadService.validateImageBuffer(largeBuffer, 'image/jpeg')
      ).toThrow('File too large');
    });

    it('should reject empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0);

      expect(() =>
        UploadService.validateImageBuffer(emptyBuffer, 'image/jpeg')
      ).toThrow('File too large');
    });
  });

  describe('getImageMetadata', () => {
    it('should return metadata for valid image buffer', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      const mockMetadata = {
        width: 1024,
        height: 768,
        format: 'jpeg',
        size: mockBuffer.length,
      };

      const mockSharp = {
        metadata: vi.fn().mockResolvedValue(mockMetadata),
      };

      vi.mocked(sharp).mockReturnValue(mockSharp as any);

      const result = await UploadService.getImageMetadata(mockBuffer);

      expect(result).toEqual(mockMetadata);
      expect(sharp).toHaveBeenCalledWith(mockBuffer);
    });

    it('should throw error for invalid image buffer', async () => {
      const invalidBuffer = Buffer.from('not-an-image');

      const mockSharp = {
        metadata: vi.fn().mockRejectedValue(new Error('Invalid image')),
      };

      vi.mocked(sharp).mockReturnValue(mockSharp as any);

      await expect(UploadService.getImageMetadata(invalidBuffer)).rejects.toThrow(
        'Invalid image'
      );
    });
  });
});

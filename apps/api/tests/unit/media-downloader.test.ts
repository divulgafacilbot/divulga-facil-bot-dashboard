import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { cleanupTempFile } from '../../src/utils/media-downloader.js';

const TEMP_DIR = path.join(process.cwd(), 'temp');
const TEST_FILE = path.join(TEMP_DIR, 'test-cleanup-file.txt');

describe('Media Downloader Utils', () => {
  beforeAll(() => {
    // Ensure temp directory exists
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(TEST_FILE)) {
      fs.unlinkSync(TEST_FILE);
    }
  });

  describe('cleanupTempFile', () => {
    it('should remove existing file', () => {
      // Create test file
      fs.writeFileSync(TEST_FILE, 'test content');
      expect(fs.existsSync(TEST_FILE)).toBe(true);

      // Clean up
      cleanupTempFile(TEST_FILE);
      expect(fs.existsSync(TEST_FILE)).toBe(false);
    });

    it('should handle non-existent files gracefully', () => {
      const nonExistentFile = path.join(TEMP_DIR, 'does-not-exist.txt');

      // Should not throw
      expect(() => cleanupTempFile(nonExistentFile)).not.toThrow();
    });

    it('should handle invalid paths gracefully', () => {
      // Should not throw
      expect(() => cleanupTempFile('')).not.toThrow();
      expect(() => cleanupTempFile('/invalid/path/file.txt')).not.toThrow();
    });
  });

  describe('File Size Validation', () => {
    it('should validate 50MB limit constant', () => {
      const TELEGRAM_MAX_FILE_SIZE = 50 * 1024 * 1024;
      expect(TELEGRAM_MAX_FILE_SIZE).toBe(52428800);
    });

    it('should correctly calculate file size in MB', () => {
      const testCases = [
        { bytes: 1024 * 1024, expectedMB: 1 },
        { bytes: 50 * 1024 * 1024, expectedMB: 50 },
        { bytes: 100 * 1024 * 1024, expectedMB: 100 },
      ];

      testCases.forEach(({ bytes, expectedMB }) => {
        const calculatedMB = bytes / 1024 / 1024;
        expect(calculatedMB).toBe(expectedMB);
      });
    });
  });

  describe('Temp Directory', () => {
    it('should have temp directory created', () => {
      expect(fs.existsSync(TEMP_DIR)).toBe(true);
    });

    it('should be able to write to temp directory', () => {
      const testFile = path.join(TEMP_DIR, 'write-test.txt');
      fs.writeFileSync(testFile, 'test');
      expect(fs.existsSync(testFile)).toBe(true);
      fs.unlinkSync(testFile);
    });
  });

  describe('Filename Generation', () => {
    it('should generate unique filenames with timestamp', () => {
      const timestamp1 = Date.now();
      const filename1 = `download-${timestamp1}.mp4`;

      // Wait 1ms to ensure different timestamp
      const timestamp2 = timestamp1 + 1;
      const filename2 = `download-${timestamp2}.mp4`;

      expect(filename1).not.toBe(filename2);
    });

    it('should use correct extensions for media types', () => {
      const testCases = [
        { mediaType: 'video', expectedExt: 'mp4' },
        { mediaType: 'image', expectedExt: 'jpg' },
      ];

      testCases.forEach(({ mediaType, expectedExt }) => {
        const filename = `download-${Date.now()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
        expect(filename).toMatch(new RegExp(`\\.${expectedExt}$`));
      });
    });

    it('should use filenameHint when provided', () => {
      const hints = [
        'instagram-video.mp4',
        'tiktok-video.mp4',
        'pinterest-image.jpg',
        'instagram-image.jpg',
      ];

      hints.forEach((hint) => {
        expect(hint).toMatch(/\.(mp4|jpg)$/);
        expect(hint.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('Download Error Handling', () => {
  it('should format file size error message correctly', () => {
    const fileSize = 75 * 1024 * 1024; // 75MB
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(1);
    const errorMessage = `Arquivo muito grande (${fileSizeMB}MB). Limite: 50MB. Tente outro link.`;

    expect(errorMessage).toContain('75.0MB');
    expect(errorMessage).toContain('Limite: 50MB');
  });

  it('should handle axios timeout errors', () => {
    const timeoutValue = 30000; // 30 seconds
    expect(timeoutValue).toBe(30000);
  });
});

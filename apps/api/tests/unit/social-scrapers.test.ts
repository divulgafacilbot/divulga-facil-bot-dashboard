import { describe, expect, it } from 'vitest';
import { instagramScraper } from '../../src/scraping/social/instagram.scraper.js';
import { tiktokScraper } from '../../src/scraping/social/tiktok.scraper.js';
import { pinterestScraper } from '../../src/scraping/social/pinterest.scraper.js';
import { youtubeScraper } from '../../src/scraping/social/youtube.scraper.js';
import { scrapeMedia } from '../../src/scraping/social/index.js';

describe('Instagram Scraper', () => {
  describe('canHandle', () => {
    it('should handle Instagram post URLs', () => {
      expect(instagramScraper.canHandle('https://www.instagram.com/p/ABC123/')).toBe(true);
      expect(instagramScraper.canHandle('https://instagram.com/p/XYZ789/')).toBe(true);
    });

    it('should handle Instagram reel URLs', () => {
      expect(instagramScraper.canHandle('https://www.instagram.com/reel/ABC123/')).toBe(true);
      expect(instagramScraper.canHandle('https://instagram.com/reel/XYZ789/')).toBe(true);
    });

    it('should reject non-Instagram URLs', () => {
      expect(instagramScraper.canHandle('https://tiktok.com/video')).toBe(false);
      expect(instagramScraper.canHandle('https://youtube.com/watch')).toBe(false);
      expect(instagramScraper.canHandle('https://pinterest.com/pin/123')).toBe(false);
    });

    it('should reject Instagram URLs without /p/ or /reel/', () => {
      expect(instagramScraper.canHandle('https://www.instagram.com/username/')).toBe(false);
      expect(instagramScraper.canHandle('https://www.instagram.com/')).toBe(false);
    });
  });
});

describe('TikTok Scraper', () => {
  describe('canHandle', () => {
    it('should handle standard TikTok video URLs', () => {
      expect(tiktokScraper.canHandle('https://www.tiktok.com/@user/video/1234567890')).toBe(true);
      expect(tiktokScraper.canHandle('https://tiktok.com/@username123/video/9876543210')).toBe(true);
    });

    it('should handle shortened TikTok URLs', () => {
      expect(tiktokScraper.canHandle('https://vm.tiktok.com/ABC123/')).toBe(true);
      expect(tiktokScraper.canHandle('https://vm.tiktok.com/ZMR1a2b3c/')).toBe(true);
    });

    it('should reject non-TikTok URLs', () => {
      expect(tiktokScraper.canHandle('https://instagram.com/p/123')).toBe(false);
      expect(tiktokScraper.canHandle('https://youtube.com/watch')).toBe(false);
      expect(tiktokScraper.canHandle('https://pinterest.com/pin/123')).toBe(false);
    });

    it('should reject TikTok URLs without video path', () => {
      expect(tiktokScraper.canHandle('https://www.tiktok.com/@user')).toBe(false);
      expect(tiktokScraper.canHandle('https://www.tiktok.com/')).toBe(false);
    });
  });
});

describe('Pinterest Scraper', () => {
  describe('canHandle', () => {
    it('should handle Pinterest pin URLs', () => {
      expect(pinterestScraper.canHandle('https://www.pinterest.com/pin/123456789/')).toBe(true);
      expect(pinterestScraper.canHandle('https://pinterest.com/pin/987654321/')).toBe(true);
    });

    it('should handle pin.it shortlinks', () => {
      expect(pinterestScraper.canHandle('https://pin.it/ABC123')).toBe(true);
      expect(pinterestScraper.canHandle('https://pin.it/1a2B3c')).toBe(true);
    });

    it('should reject non-Pinterest URLs', () => {
      expect(pinterestScraper.canHandle('https://instagram.com/p/123')).toBe(false);
      expect(pinterestScraper.canHandle('https://tiktok.com/video')).toBe(false);
      expect(pinterestScraper.canHandle('https://youtube.com/watch')).toBe(false);
    });

    it('should reject Pinterest URLs without pin path', () => {
      expect(pinterestScraper.canHandle('https://www.pinterest.com/username/')).toBe(false);
      expect(pinterestScraper.canHandle('https://www.pinterest.com/')).toBe(false);
    });
  });
});

describe('YouTube Scraper', () => {
  describe('canHandle', () => {
    it('should handle YouTube watch URLs', () => {
      expect(youtubeScraper.canHandle('https://www.youtube.com/watch?v=ABC123')).toBe(true);
      expect(youtubeScraper.canHandle('https://youtube.com/watch?v=XYZ789')).toBe(true);
    });

    it('should handle youtu.be shortlinks', () => {
      expect(youtubeScraper.canHandle('https://youtu.be/ABC123')).toBe(true);
      expect(youtubeScraper.canHandle('https://youtu.be/XYZ789')).toBe(true);
    });

    it('should reject non-YouTube URLs', () => {
      expect(youtubeScraper.canHandle('https://instagram.com/p/123')).toBe(false);
      expect(youtubeScraper.canHandle('https://tiktok.com/video')).toBe(false);
      expect(youtubeScraper.canHandle('https://pinterest.com/pin/123')).toBe(false);
    });
  });

  describe('scrape', () => {
    it('should throw error explaining limitation', async () => {
      await expect(youtubeScraper.scrape('https://youtu.be/ABC123'))
        .rejects.toThrow('Download de vídeos do YouTube requer autenticação especial');
    });

    it('should provide helpful error message', async () => {
      try {
        await youtubeScraper.scrape('https://www.youtube.com/watch?v=test');
      } catch (error: any) {
        expect(error.message).toContain('Esta funcionalidade estará disponível em breve');
        expect(error.message).toContain('Instagram, TikTok ou Pinterest');
      }
    });
  });
});

describe('Scraping Router', () => {
  it('should throw error for unsupported platform', async () => {
    await expect(scrapeMedia('https://facebook.com/post/123'))
      .rejects.toThrow('Plataforma não suportada');
  });

  it('should provide list of supported platforms in error', async () => {
    try {
      await scrapeMedia('https://twitter.com/status/123');
    } catch (error: any) {
      expect(error.message).toContain('Instagram');
      expect(error.message).toContain('TikTok');
      expect(error.message).toContain('Pinterest');
      expect(error.message).toContain('YouTube');
    }
  });

  it('should route Instagram URLs correctly', () => {
    const url = 'https://www.instagram.com/p/ABC123/';
    expect(instagramScraper.canHandle(url)).toBe(true);
    expect(tiktokScraper.canHandle(url)).toBe(false);
    expect(pinterestScraper.canHandle(url)).toBe(false);
    expect(youtubeScraper.canHandle(url)).toBe(false);
  });

  it('should route TikTok URLs correctly', () => {
    const url = 'https://www.tiktok.com/@user/video/123';
    expect(instagramScraper.canHandle(url)).toBe(false);
    expect(tiktokScraper.canHandle(url)).toBe(true);
    expect(pinterestScraper.canHandle(url)).toBe(false);
    expect(youtubeScraper.canHandle(url)).toBe(false);
  });

  it('should route Pinterest URLs correctly', () => {
    const url = 'https://www.pinterest.com/pin/123456789/';
    expect(instagramScraper.canHandle(url)).toBe(false);
    expect(tiktokScraper.canHandle(url)).toBe(false);
    expect(pinterestScraper.canHandle(url)).toBe(true);
    expect(youtubeScraper.canHandle(url)).toBe(false);
  });

  it('should route YouTube URLs correctly', () => {
    const url = 'https://www.youtube.com/watch?v=ABC123';
    expect(instagramScraper.canHandle(url)).toBe(false);
    expect(tiktokScraper.canHandle(url)).toBe(false);
    expect(pinterestScraper.canHandle(url)).toBe(false);
    expect(youtubeScraper.canHandle(url)).toBe(true);
  });
});

describe('URL Detection Patterns', () => {
  it('should extract URL from text message', () => {
    const testCases = [
      { text: 'Check this out https://instagram.com/p/ABC123/', expected: 'https://instagram.com/p/ABC123/' },
      { text: 'https://tiktok.com/@user/video/123', expected: 'https://tiktok.com/@user/video/123' },
      { text: 'Look at this pin: https://pin.it/ABC123 amazing!', expected: 'https://pin.it/ABC123' },
      { text: 'Multiple links https://instagram.com/p/1/ and https://tiktok.com/video', expected: 'https://instagram.com/p/1/' },
    ];

    testCases.forEach(({ text, expected }) => {
      const urlMatch = text.match(/https?:\/\/[^\s]+/);
      expect(urlMatch).toBeTruthy();
      expect(urlMatch![0]).toBe(expected);
    });
  });

  it('should not match text without URLs', () => {
    const testCases = [
      'No URL here',
      'Just some text',
      'www.example.com', // Missing protocol
      'ftp://example.com', // Wrong protocol
    ];

    testCases.forEach((text) => {
      const urlMatch = text.match(/https?:\/\/[^\s]+/);
      expect(urlMatch).toBeNull();
    });
  });
});

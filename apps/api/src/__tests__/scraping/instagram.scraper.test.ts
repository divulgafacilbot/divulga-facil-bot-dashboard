import { describe, it, expect } from 'vitest';
import { instagramScraper } from '../../scraping/social/instagram.scraper';

describe('Instagram Scraper - canHandle', () => {
  it('should accept post URLs', () => {
    expect(instagramScraper.canHandle('https://www.instagram.com/p/ABC123/')).toBe(true);
  });

  it('should accept reel URLs', () => {
    expect(instagramScraper.canHandle('https://www.instagram.com/reel/ABC123/')).toBe(true);
  });

  it('should reject non-Instagram URLs', () => {
    expect(instagramScraper.canHandle('https://www.tiktok.com/@user/video/123')).toBe(false);
  });
});

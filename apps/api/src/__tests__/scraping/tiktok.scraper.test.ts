import { describe, it, expect } from 'vitest';
import { tiktokScraper } from '../../scraping/social/tiktok.scraper';

describe('TikTok Scraper - canHandle', () => {
  it('should accept long TikTok URLs', () => {
    expect(tiktokScraper.canHandle('https://www.tiktok.com/@user/video/1234567890')).toBe(true);
  });

  it('should accept vm.tiktok.com short URLs', () => {
    expect(tiktokScraper.canHandle('https://vm.tiktok.com/ABC123/')).toBe(true);
  });

  it('should accept vt.tiktok.com short URLs', () => {
    expect(tiktokScraper.canHandle('https://vt.tiktok.com/ABC123/')).toBe(true);
  });

  it('should reject non-TikTok URLs', () => {
    expect(tiktokScraper.canHandle('https://www.instagram.com/p/ABC123/')).toBe(false);
  });
});

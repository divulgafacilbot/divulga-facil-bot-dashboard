import { describe, it, expect } from 'vitest';
import { pinterestScraper } from '../../scraping/social/pinterest.scraper';

describe('Pinterest Scraper - canHandle', () => {
  it('should accept Pinterest pin URLs', () => {
    expect(pinterestScraper.canHandle('https://www.pinterest.com/pin/123456789/')).toBe(true);
  });

  it('should accept pin.it short URLs', () => {
    expect(pinterestScraper.canHandle('https://pin.it/ABC123')).toBe(true);
  });

  it('should reject non-Pinterest URLs', () => {
    expect(pinterestScraper.canHandle('https://www.youtube.com/watch?v=ABC123')).toBe(false);
  });
});

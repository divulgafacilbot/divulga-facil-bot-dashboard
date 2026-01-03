import { describe, it, expect } from 'vitest';
import { youtubeScraper } from '../../scraping/social/youtube.scraper';

describe('YouTube Scraper - canHandle', () => {
  it('should accept watch URLs', () => {
    expect(youtubeScraper.canHandle('https://www.youtube.com/watch?v=ABC123')).toBe(true);
  });

  it('should accept youtu.be short URLs', () => {
    expect(youtubeScraper.canHandle('https://youtu.be/ABC123')).toBe(true);
  });

  it('should accept shorts URLs', () => {
    expect(youtubeScraper.canHandle('https://youtube.com/shorts/ABC123')).toBe(true);
  });

  it('should accept embed URLs', () => {
    expect(youtubeScraper.canHandle('https://www.youtube.com/embed/ABC123')).toBe(true);
  });

  it('should reject non-YouTube URLs', () => {
    expect(youtubeScraper.canHandle('https://www.pinterest.com/pin/123456789/')).toBe(false);
  });
});

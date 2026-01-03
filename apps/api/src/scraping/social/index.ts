import { SocialScraper, MediaResult } from './types.js';
import { instagramScraper } from './instagram.scraper.js';
import { tiktokScraper } from './tiktok.scraper.js';
import { pinterestScraper } from './pinterest.scraper.js';
import { youtubeScraper } from './youtube.scraper.js';

const scrapers: SocialScraper[] = [
  instagramScraper,
  tiktokScraper,
  pinterestScraper,
  youtubeScraper,
];

export async function scrapeMedia(url: string): Promise<MediaResult> {
  const scraper = scrapers.find(s => s.canHandle(url));

  if (!scraper) {
    throw new Error(
      'Plataforma não suportada.\n\n' +
      'Plataformas aceitas:\n' +
      '• Instagram (post/reel)\n' +
      '• TikTok (vídeo)\n' +
      '• Pinterest (pin)\n' +
      '• YouTube (limitado)'
    );
  }

  return scraper.scrape(url);
}

export type { SocialPlatform, MediaType, MediaItem, MediaResult } from './types.js';

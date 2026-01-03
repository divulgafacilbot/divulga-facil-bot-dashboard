import axios from 'axios';
import * as cheerio from 'cheerio';
import { SocialScraper, MediaResult, MediaItem, SocialPlatform } from './types.js';

export const instagramScraper: SocialScraper = {
  canHandle(url: string): boolean {
    return /instagram\.com\/(p|reel)\//.test(url);
  },

  async scrape(url: string): Promise<MediaResult> {
    const cleanUrl = url.split('?')[0];

    try {
      const response = await axios.get(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      const ogVideo = $('meta[property="og:video"]').attr('content');
      const ogImage = $('meta[property="og:image"]').attr('content');

      const items: MediaItem[] = [];

      if (ogVideo) {
        items.push({
          mediaType: 'video',
          directUrl: ogVideo,
          filenameHint: 'instagram-video.mp4',
        });
      } else if (ogImage) {
        items.push({
          mediaType: 'image',
          directUrl: ogImage,
          filenameHint: 'instagram-image.jpg',
        });
      }

      if (items.length === 0) {
        throw new Error('Não foi possível extrair mídia do Instagram');
      }

      return {
        source: 'INSTAGRAM' as SocialPlatform,
        url: cleanUrl,
        items,
      };
    } catch (error: any) {
      throw new Error(`Erro ao fazer scraping do Instagram: ${error.message}`);
    }
  },
};

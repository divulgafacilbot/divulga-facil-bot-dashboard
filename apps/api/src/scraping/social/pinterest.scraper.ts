import axios from 'axios';
import * as cheerio from 'cheerio';
import { SocialScraper, MediaResult, SocialPlatform } from './types.js';

export const pinterestScraper: SocialScraper = {
  canHandle(url: string): boolean {
    return /pinterest\.com\/pin\//.test(url) || /pin\.it\//.test(url);
  },

  async scrape(url: string): Promise<MediaResult> {
    try {
      let finalUrl = url;
      if (url.includes('pin.it')) {
        const response = await axios.head(url, {
          maxRedirects: 5,
          validateStatus: () => true,
        });
        finalUrl = response.request.res.responseUrl || url;
      }

      const response = await axios.get(finalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const ogVideo = $('meta[property="og:video"]').attr('content');
      const ogImage = $('meta[property="og:image"]').attr('content');

      if (ogVideo) {
        return {
          source: 'PINTEREST' as SocialPlatform,
          url: finalUrl,
          items: [{
            mediaType: 'video',
            directUrl: ogVideo,
            filenameHint: 'pinterest-video.mp4',
          }],
        };
      } else if (ogImage) {
        return {
          source: 'PINTEREST' as SocialPlatform,
          url: finalUrl,
          items: [{
            mediaType: 'image',
            directUrl: ogImage,
            filenameHint: 'pinterest-image.jpg',
          }],
        };
      }

      throw new Error('Não foi possível extrair mídia do Pinterest');
    } catch (error: any) {
      throw new Error(`Erro ao fazer scraping do Pinterest: ${error.message}`);
    }
  },
};

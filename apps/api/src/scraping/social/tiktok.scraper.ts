import axios from 'axios';
import * as cheerio from 'cheerio';
import { SocialScraper, MediaResult, SocialPlatform } from './types.js';

export const tiktokScraper: SocialScraper = {
  canHandle(url: string): boolean {
    return /tiktok\.com\/@[\w.-]+\/video\/\d+/.test(url) || /vm\.tiktok\.com\//.test(url);
  },

  async scrape(url: string): Promise<MediaResult> {
    try {
      let finalUrl = url;
      if (url.includes('vm.tiktok.com')) {
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

      if (!ogVideo) {
        throw new Error('Não foi possível extrair vídeo do TikTok');
      }

      return {
        source: 'TIKTOK' as SocialPlatform,
        url: finalUrl,
        items: [{
          mediaType: 'video',
          directUrl: ogVideo,
          filenameHint: 'tiktok-video.mp4',
        }],
      };
    } catch (error: any) {
      throw new Error(`Erro ao fazer scraping do TikTok: ${error.message}`);
    }
  },
};

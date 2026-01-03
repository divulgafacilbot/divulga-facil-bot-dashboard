import { SocialScraper, MediaResult } from './types.js';

export const youtubeScraper: SocialScraper = {
  canHandle(url: string): boolean {
    return /youtube\.com\/watch\?v=/.test(url) || /youtu\.be\//.test(url);
  },

  async scrape(url: string): Promise<MediaResult> {
    throw new Error(
      'Download de vídeos do YouTube requer autenticação especial. ' +
      'Esta funcionalidade estará disponível em breve. ' +
      'Por enquanto, use Instagram, TikTok ou Pinterest.'
    );
  },
};

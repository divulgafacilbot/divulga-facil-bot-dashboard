import { SocialScraper, MediaResult, SocialPlatform } from './types.js';

export const youtubeScraper: SocialScraper = {
  canHandle(url: string): boolean {
    return (
      /youtube\.com\/watch\?v=/.test(url) ||
      /youtu\.be\//.test(url) ||
      /youtube\.com\/shorts\//.test(url) ||
      /youtube\.com\/embed\//.test(url)
    );
  },

  async scrape(url: string): Promise<MediaResult> {
    try {
      const normalizedUrl = normalizeYouTubeUrl(url);
      return {
        source: 'YOUTUBE' as SocialPlatform,
        url: normalizedUrl,
        items: [{
          mediaType: 'video',
          directUrl: normalizedUrl,
          filenameHint: 'youtube-video.mp4',
          downloadStrategy: 'youtube',
        }],
      };
    } catch (error: any) {
      throw new Error(`Erro ao fazer scraping do YouTube: ${error.message}`);
    }
  },
};

function normalizeYouTubeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === 'youtu.be') {
      return `https://www.youtube.com/watch?v=${parsed.pathname.replace('/', '')}`;
    }

    if (parsed.pathname.startsWith('/shorts/')) {
      const videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0];
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }

    if (parsed.pathname.startsWith('/embed/')) {
      const videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0];
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }

    if (parsed.searchParams.get('v')) {
      return `https://www.youtube.com/watch?v=${parsed.searchParams.get('v')}`;
    }

    return url;
  } catch (error) {
    return url;
  }
}

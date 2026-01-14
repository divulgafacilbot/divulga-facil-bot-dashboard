import axios from 'axios';
import * as cheerio from 'cheerio';
import { MediaItem, MediaResult, SocialPlatform, SocialScraper } from './types.js';
import { buildHeaders, resolveFinalUrl } from './utils.js';

const META_SELECTORS = [
  'meta[property="og:video"]',
  'meta[property="og:video:url"]',
  'meta[property="og:video:secure_url"]',
  'meta[name="og:video"]',
  'meta[name="og:video:url"]',
  'meta[name="og:video:secure_url"]',
  'meta[property="twitter:player:stream"]',
];

function extractVideoFromMeta($: cheerio.Root): string | null {
  for (const selector of META_SELECTORS) {
    const candidate = $('head').find(selector).attr('content') || $('head').find(selector).attr('value');
    const sanitized = sanitizeUrl(candidate);
    if (sanitized) {
      return sanitized;
    }
  }
  return null;
}

function extractVideoFromJsonLd($: cheerio.Root): string | null {
  const scripts = $('script[type="application/ld+json"]');
  for (const script of scripts.toArray()) {
    const raw = $(script).html();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of entries) {
        if (!entry || typeof entry !== 'object') continue;
        if (entry['@type'] === 'VideoObject') {
          const contentUrl = entry.contentUrl || entry.embedUrl;
          const sanitized = sanitizeUrl(contentUrl);
          if (sanitized) {
            return sanitized;
          }
        }
      }
    } catch {
      // Ignore invalid JSON-LD
    }
  }
  return null;
}

function extractVideoFromVideoTag($: cheerio.Root): string | null {
  const videoSrc = $('video').first().attr('src') || $('video').first().attr('data-src');
  const candidate = sanitizeUrl(videoSrc);
  if (candidate) {
    return candidate;
  }

  const sourceTag = $('video source').first().attr('src') || $('video source').first().attr('data-src');
  return sanitizeUrl(sourceTag);
}

function extractVideoFromNextData($: cheerio.Root): string | null {
  const nextDataScript = $('script#__NEXT_DATA__').html();
  if (!nextDataScript) return null;

  try {
    const parsed = JSON.parse(nextDataScript);
    const video = parsed?.props?.pageProps?.mediaInfo?.video;
    if (!video || typeof video !== 'object') return null;

    const candidates = [
      video.watermarkVideoUrl,
      video.videoUrl,
      video.playUrl,
      video.playAddr,
      video.downloadAddr,
    ];

    for (const candidate of candidates) {
      const sanitized = sanitizeUrl(candidate);
      if (sanitized) {
        return sanitized;
      }
    }
  } catch {
    // Ignore parsing errors
  }

  return null;
}

function sanitizeUrl(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return null;
}

export const shopeeScraper: SocialScraper = {
  canHandle(url: string): boolean {
    return /shopee\.com/i.test(url) || /shp\.ee/i.test(url) || /sv\.shopee\.com\.br\/share-video/i.test(url);
  },

  async scrape(url: string): Promise<MediaResult> {
    try {
      const finalUrl = await resolveFinalUrl(url);
      const response = await axios.get(finalUrl, {
        headers: buildHeaders(finalUrl),
        timeout: 15000,
        maxRedirects: 5,
      });

      const html = response.data;
      const $ = cheerio.load(html);
      let videoUrl = extractVideoFromMeta($);

      if (!videoUrl) {
        videoUrl = extractVideoFromJsonLd($);
      }

      if (!videoUrl) {
        videoUrl = extractVideoFromVideoTag($);
      }

      if (!videoUrl) {
        videoUrl = extractVideoFromNextData($);
      }

      if (!videoUrl) {
        throw new Error('Não foi possível extrair vídeo da Shopee');
      }

      const item: MediaItem = {
        mediaType: 'video',
        directUrl: videoUrl,
        filenameHint: 'shopee-video.mp4',
        headers: buildHeaders(finalUrl),
      };

      return {
        source: 'SHOPEE' as SocialPlatform,
        url: finalUrl,
        items: [item],
      };
    } catch (error: any) {
      throw new Error(
        `Erro ao fazer scraping da Shopee: ${error?.message || 'Não foi possível acessar o vídeo'}`
      );
    }
  },
};

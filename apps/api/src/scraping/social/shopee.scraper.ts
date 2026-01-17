import axios from 'axios';
import * as cheerio from 'cheerio';
import { MediaItem, MediaResult, SocialPlatform, SocialScraper } from './types.js';
import { buildHeaders, resolveFinalUrl } from './utils.js';

// Prioritize high quality video URLs
const META_SELECTORS = [
  'meta[property="og:video:secure_url"]',
  'meta[property="og:video:url"]',
  'meta[property="og:video"]',
  'meta[name="og:video:secure_url"]',
  'meta[name="og:video:url"]',
  'meta[name="og:video"]',
  'meta[property="twitter:player:stream"]',
];

function extractVideoFromMeta($: cheerio.Root): string | null {
  // Log all video-related meta tags for debugging
  console.log('[Shopee] Scanning video meta tags...');

  // Collect all video URLs found
  const videoUrls: { selector: string; url: string }[] = [];

  for (const selector of META_SELECTORS) {
    const candidate = $('head').find(selector).attr('content') || $('head').find(selector).attr('value');
    const sanitized = sanitizeUrl(candidate);
    if (sanitized) {
      console.log(`[Shopee] Found video URL via ${selector}: ${sanitized.substring(0, 100)}...`);
      videoUrls.push({ selector, url: sanitized });
    }
  }

  // Also check for og:video:width and og:video:height
  const width = $('meta[property="og:video:width"]').attr('content');
  const height = $('meta[property="og:video:height"]').attr('content');
  if (width || height) {
    console.log(`[Shopee] Video dimensions from meta: ${width}x${height}`);
  }

  // Return the first valid URL found
  return videoUrls.length > 0 ? videoUrls[0].url : null;
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

/**
 * Remove watermark parameters from Shopee video URL.
 *
 * Shopee adds watermark params to video URLs in the format:
 * - With watermark: `video-name.16003551759237459.7124.mp4` (smaller file, has watermark)
 * - Without watermark: `video-name.mp4` (larger file, no watermark)
 *
 * The pattern is: `.{timestamp}.{id}.mp4` where timestamp and id are numbers.
 * Removing these params gives the original video without watermark.
 */
function removeWatermarkFromUrl(url: string): string {
  // Pattern: matches .{numbers}.{numbers}.mp4 at the end of URL
  // Example: .16003551759237459.7124.mp4 → .mp4
  const watermarkPattern = /\.(\d+)\.(\d+)\.mp4$/i;

  if (watermarkPattern.test(url)) {
    const cleanUrl = url.replace(watermarkPattern, '.mp4');
    console.log('[Shopee] Removendo marca d\'água da URL do vídeo');
    console.log('[Shopee] URL original:', url.substring(url.length - 50));
    console.log('[Shopee] URL limpa:', cleanUrl.substring(cleanUrl.length - 30));
    return cleanUrl;
  }

  return url;
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

      // Remove watermark from video URL to get the clean version
      const cleanVideoUrl = removeWatermarkFromUrl(videoUrl);

      // Log final URL being used
      console.log('[Shopee] Final video URL:', cleanVideoUrl);

      // Extract video dimensions if available
      const width = $('meta[property="og:video:width"]').attr('content');
      const height = $('meta[property="og:video:height"]').attr('content');

      console.log('[Shopee] Video dimensions:', width ? `${width}x${height}` : 'not specified in meta');

      const item: MediaItem = {
        mediaType: 'video',
        directUrl: cleanVideoUrl,
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

import axios from 'axios';
import * as cheerio from 'cheerio';
import { SocialScraper, MediaResult, SocialPlatform } from './types.js';
import { buildHeaders, normalizeEscapedJsonPayload, resolveFinalUrl } from './utils.js';

export const pinterestScraper: SocialScraper = {
  canHandle(url: string): boolean {
    return /pinterest\.com\/pin\//.test(url) || /pin\.it\//.test(url);
  },

  async scrape(url: string): Promise<MediaResult> {
    try {
      const finalUrl = url.includes('pin.it') ? await resolveFinalUrl(url) : url;

      const response = await axios.get(finalUrl, {
        headers: buildHeaders(finalUrl),
        timeout: 10000,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      const ogVideo =
        $('meta[property="og:video"]').attr('content') ||
        $('meta[property="og:video:secure_url"]').attr('content') ||
        $('meta[property="og:video:url"]').attr('content');
      const ogImage = $('meta[property="og:image"]').attr('content');
      const normalizedBody = normalizeEscapedJsonPayload(response.data);
      const relayVideoUrl = extractBestVideoUrlFromRelay(response.data);
      const pinVideoMatch = normalizedBody.match(/https:\/\/v\.pinimg\.com\/[^"'\\s]+\.mp4[^"'\\s]*/);
      const pinImageMatch = normalizedBody.match(/https:\/\/i\.pinimg\.com\/[^"'\\s]+\\.(?:jpg|jpeg|png)[^"'\\s]*/);
      const jsonVideoMatch = normalizedBody.match(/"contentUrl":"(https:\/\/v\.pinimg\.com\/[^"]+\.mp4[^"]*)"/);
      let jsonLdVideoUrl: string | null = null;

      $('script[type="application/ld+json"]').each((_, element) => {
        if (jsonLdVideoUrl) return;
        const raw = $(element).html();
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          const entries = Array.isArray(parsed) ? parsed : [parsed];
          for (const entry of entries) {
            if (!entry || typeof entry !== 'object') continue;
            if (entry['@type'] === 'VideoObject') {
              const contentUrl = entry.contentUrl || entry.embedUrl;
              if (typeof contentUrl === 'string') {
                jsonLdVideoUrl = contentUrl;
                break;
              }
            }
          }
        } catch {
          // Ignore JSON-LD parse errors and continue.
        }
      });

      if (relayVideoUrl || ogVideo || jsonLdVideoUrl || jsonVideoMatch || pinVideoMatch) {
        const directUrl =
          relayVideoUrl ||
          ogVideo ||
          jsonLdVideoUrl ||
          (jsonVideoMatch ? jsonVideoMatch[1] : null) ||
          pinVideoMatch?.[0];
        return {
          source: 'PINTEREST' as SocialPlatform,
          url: finalUrl,
          items: [{
            mediaType: 'video',
            directUrl: directUrl!,
            filenameHint: 'pinterest-video.mp4',
            headers: buildHeaders(finalUrl),
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
            headers: buildHeaders(finalUrl),
          }],
        };
      } else if (pinImageMatch) {
        return {
          source: 'PINTEREST' as SocialPlatform,
          url: finalUrl,
          items: [{
            mediaType: 'image',
            directUrl: pinImageMatch[0],
            filenameHint: 'pinterest-image.jpg',
            headers: buildHeaders(finalUrl),
          }],
        };
      }

      throw new Error('Não foi possível extrair mídia do Pinterest');
    } catch (error: any) {
      throw new Error(`Erro ao fazer scraping do Pinterest: ${error.message}`);
    }
  },
};

const RELAY_PAYLOAD_REGEX = /window\.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__\([^,]+,\s*(\{[\s\S]*?\})\);/g;

interface RelayPayload {
  data?: {
    v3GetPinQuery?: {
      data?: {
        videos?: {
          videoList?: Record<string, VideoListEntry>;
          videoUrls?: string[];
        };
      };
    };
  };
}

interface VideoListEntry {
  url?: string;
  width?: number | string;
  height?: number | string;
}

function extractBestVideoUrlFromRelay(html: string): string | null {
  for (const match of html.matchAll(RELAY_PAYLOAD_REGEX)) {
    const payloadJson = match[1];
    if (!payloadJson?.includes('"v3GetPinQuery"')) {
      continue;
    }

    try {
      const payload = JSON.parse(payloadJson) as RelayPayload;
      const pinData = payload?.data?.v3GetPinQuery?.data;
      if (!pinData) {
        continue;
      }

      const fromVideoList = selectVideoFromVideoList(pinData.videos?.videoList);
      if (fromVideoList) {
        return fromVideoList;
      }

      const fromVideoUrls = selectBestVideoFromUrls(pinData.videos?.videoUrls);
      if (fromVideoUrls) {
        return fromVideoUrls;
      }
    } catch {
      // ignore parse errors and continue with next script block
    }
  }

  return null;
}

function selectVideoFromVideoList(videoList?: Record<string, VideoListEntry>): string | null {
  if (!videoList) {
    return null;
  }

  const candidates = Object.values(videoList)
    .filter((entry): entry is VideoListEntry => typeof entry?.url === 'string' && entry.url.endsWith('.mp4'))
    .map((entry) => ({
      url: entry.url,
      width: parseNumeric(entry.width),
      height: parseNumeric(entry.height),
    }));

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => {
    const heightDiff = (b.height ?? 0) - (a.height ?? 0);
    if (heightDiff !== 0) {
      return heightDiff;
    }
    return (b.width ?? 0) - (a.width ?? 0);
  });

  return candidates[0].url;
}

function selectBestVideoFromUrls(videoUrls?: string[]): string | null {
  if (!videoUrls?.length) {
    return null;
  }

  const candidates = videoUrls
    .filter((url): url is string => typeof url === 'string' && url.includes('.mp4'))
    .map((url) => ({
      url,
      width: extractWidthFromUrl(url),
    }));

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => b.width - a.width);
  return candidates[0].url;
}

function parseNumeric(value: number | string | undefined): number | undefined {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function extractWidthFromUrl(url: string): number {
  const match = url.match(/_(\d+)w/);
  if (match) {
    return Number(match[1]);
  }
  return 0;
}

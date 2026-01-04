import axios from 'axios';
import * as cheerio from 'cheerio';
import { SocialScraper, MediaResult, MediaItem, SocialPlatform } from './types.js';
import { chromium } from 'playwright';
import { buildHeaders, normalizeEscapedJsonPayload, DEFAULT_HEADERS } from './utils.js';

export const instagramScraper: SocialScraper = {
  canHandle(url: string): boolean {
    return /instagram\.com\/(p|reel)\//.test(url);
  },

  async scrape(url: string): Promise<MediaResult> {
    const cleanUrl = url.split('?')[0];
    const isReel = /instagram\.com\/reel\//.test(cleanUrl);

    try {
      const response = await axios.get(cleanUrl, {
        headers: buildHeaders(cleanUrl),
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      const ogVideo =
        $('meta[property="og:video"]').attr('content') ||
        $('meta[property="og:video:secure_url"]').attr('content') ||
        $('meta[property="og:video:url"]').attr('content') ||
        $('meta[property="twitter:player:stream"]').attr('content');
      const ogImage = $('meta[property="og:image"]').attr('content');
      const normalizedBody = normalizeEscapedJsonPayload(response.data);
      const videoUrlMatch =
        normalizedBody.match(/"video_url":"(https:\/\/[^"]+)"/) ||
        normalizedBody.match(/"contentUrl":"(https:\/\/[^"]+\.mp4[^"]*)"/);
      const fallbackVideoUrl = videoUrlMatch?.[1];
      const mp4Regex = /https:\/\/[^"'\s]+\.mp4[^"'\s]*/;
      const mp4EscapedRegex = new RegExp('https:\\\\/\\\\/[^"\\s]+\\\\.mp4[^"\\s]*');
      const mp4Match = normalizedBody.match(mp4Regex);
      const mp4EscapedMatch = normalizedBody.match(mp4EscapedRegex);
      const fallbackMp4Url =
        mp4Match?.[0] ||
        (mp4EscapedMatch ? mp4EscapedMatch[0].replace(/\\\//g, '/') : null);
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

      const items: MediaItem[] = [];
      const isDirectMp4 = (value: string | null | undefined) =>
        typeof value === 'string' && value.includes('.mp4');
      let videoUrl =
        (isDirectMp4(ogVideo) ? ogVideo : null) ||
        (isDirectMp4(jsonLdVideoUrl) ? jsonLdVideoUrl : null) ||
        (isDirectMp4(fallbackVideoUrl) ? fallbackVideoUrl : null) ||
        fallbackMp4Url ||
        null;

      if (!videoUrl) {
        // Attempt JSON fetch even if we already have an image (to avoid thumbnails).
        const shortcodeMatch = cleanUrl.match(/instagram\.com\/(?:p|reel)\/([^/]+)/);
        if (shortcodeMatch) {
          try {
            const appIdHeader = {
              'x-ig-app-id': '936619743392459',
            };
            const jsonResponse = await axios.get(`${cleanUrl}?__a=1&__d=dis`, {
              headers: { ...buildHeaders(cleanUrl), ...appIdHeader },
              timeout: 10000,
            });
            const media = jsonResponse.data?.graphql?.shortcode_media;
            videoUrl = media?.video_url || null;
            if (!videoUrl) {
              const altResponse = await axios.get(`${cleanUrl}?__a=1`, {
                headers: { ...buildHeaders(cleanUrl), ...appIdHeader },
                timeout: 10000,
              });
              const altMedia = altResponse.data?.graphql?.shortcode_media;
              videoUrl = altMedia?.video_url || null;
            }
          } catch {
            // Ignore and fall back to image.
          }
        }
      }

      let videoHeaders: Record<string, string> | undefined;
      if (!videoUrl && isReel) {
        // Headless fallback for reels when static scraping fails.
        const headlessResult = await extractVideoWithPlaywright(cleanUrl);
        videoUrl = headlessResult?.url || null;
        videoHeaders = headlessResult?.headers;
      }

      if (videoUrl) {
        const sanitizedUrl = stripByteRange(videoUrl);
        items.push({
          mediaType: 'video',
          directUrl: sanitizedUrl,
          filenameHint: 'instagram-video.mp4',
          headers: videoHeaders || buildHeaders(cleanUrl),
        });
      } else if (ogImage && !isReel) {
        items.push({
          mediaType: 'image',
          directUrl: ogImage,
          filenameHint: 'instagram-image.jpg',
          headers: buildHeaders(cleanUrl),
        });
      } else if (isReel) {
        throw new Error('Não foi possível extrair vídeo do Instagram');
      }

      if (items.length === 0) {
        throw new Error('Não foi possível extrair mídia do Instagram');
      }

      return {
        source: 'INSTAGRAM' as SocialPlatform,
        url: cleanUrl,
        items,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Erro ao fazer scraping do Instagram: ${message}`);
    }
  },
};

async function extractVideoWithPlaywright(
  url: string
): Promise<{ url: string; headers: Record<string, string> } | null> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: DEFAULT_HEADERS['User-Agent'],
    });
    const page = await context.newPage();
    let networkVideoUrl: string | null = null;

    page.on('response', async (response) => {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('video') || response.url().includes('.mp4')) {
          networkVideoUrl = response.url();
        }
      } catch {
        // Ignore response parsing errors.
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1500);
    await page.waitForSelector('video', { timeout: 8000 }).catch(() => null);

    const videoUrl = await page.evaluate(() => {
      const video = document.querySelector('video');
      return video?.getAttribute('src') || (video as HTMLVideoElement | null)?.currentSrc || null;
    });
    const resolvedUrl =
      videoUrl && !videoUrl.startsWith('blob:') ? videoUrl : networkVideoUrl;
    if (!resolvedUrl) return null;

    const cookies = await context.cookies();
    const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
    const headers = {
      ...buildHeaders(url),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    };
    return { url: stripByteRange(resolvedUrl), headers };
  } catch {
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function stripByteRange(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.searchParams.has('bytestart') || parsed.searchParams.has('byteend')) {
      parsed.searchParams.delete('bytestart');
      parsed.searchParams.delete('byteend');
      return parsed.toString();
    }
  } catch {
    // Ignore invalid URLs and return original.
  }
  return rawUrl;
}

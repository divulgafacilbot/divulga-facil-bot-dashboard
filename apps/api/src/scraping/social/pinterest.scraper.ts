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

      if (ogVideo || jsonLdVideoUrl || jsonVideoMatch || pinVideoMatch) {
        const directUrl =
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

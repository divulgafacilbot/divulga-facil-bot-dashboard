import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import { SocialScraper, MediaResult, MediaItem, SocialPlatform } from './types.js';
import { buildHeaders, resolveFinalUrl } from './utils.js';

export const tiktokScraper: SocialScraper = {
  canHandle(url: string): boolean {
    return /tiktok\.com\//.test(url) || /vm\.tiktok\.com\//.test(url) || /vt\.tiktok\.com\//.test(url);
  },

  async scrape(url: string): Promise<MediaResult> {
    try {
      let finalUrl = url;
      if (/vm\.tiktok\.com|vt\.tiktok\.com|t\.tiktok\.com/.test(url)) {
        finalUrl = await resolveFinalUrl(url);
      }

      const response = await axios.get(finalUrl, {
        headers: buildHeaders(finalUrl),
        timeout: 10000,
        maxRedirects: 5,
      });

      let items = extractTikTokItems(response.data, finalUrl);

      if (!items.length) {
        const playwrightData = await fetchTikTokDataWithPlaywright(finalUrl);
        if (playwrightData) {
          items = extractTikTokItems(playwrightData.html, finalUrl, {
            sigiState: playwrightData.sigiState,
            nextData: playwrightData.nextData,
            universalData: playwrightData.universalData,
            windowState: playwrightData.windowState,
          });
        }
      }

      if (!items.length) {
        const fallbackItem = await fetchTikTokFromTikwm(finalUrl);
        if (fallbackItem) {
          items = [fallbackItem];
        }
      }

      if (!items.length) {
        throw new Error('Não foi possível extrair vídeo do TikTok');
      }

      return {
        source: 'TIKTOK' as SocialPlatform,
        url: finalUrl,
        items,
      };
    } catch (error: any) {
      throw new Error(`Erro ao fazer scraping do TikTok: ${error.message}`);
    }
  },
};

function extractTikTokItems(
  html: string,
  finalUrl: string,
  scriptOverrides?: {
    sigiState?: string | null;
    nextData?: string | null;
    universalData?: string | null;
    windowState?: any;
  }
): MediaItem[] {
  const $ = cheerio.load(html);
  const ogVideo = $('meta[property="og:video"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');
  const items: MediaItem[] = [];

  const sigiStateRaw = scriptOverrides?.sigiState ?? $('script#SIGI_STATE').html();
  if (sigiStateRaw) {
    const sigiState = JSON.parse(sigiStateRaw);
    const itemModule = sigiState?.ItemModule || sigiState?.itemModule;
    const item = itemModule ? Object.values(itemModule)[0] : null;
    const video = item?.video;
    if (video?.downloadAddr || video?.playAddr) {
      items.push({
        mediaType: 'video',
        directUrl: video.downloadAddr || video.playAddr,
        filenameHint: 'tiktok-video.mp4',
        headers: buildHeaders(finalUrl),
      });
    }
    const imagePost = item?.imagePost;
    if (imagePost?.images?.length) {
      for (const image of imagePost.images) {
        const imageUrl = image?.displayImage?.urlList?.[0] || image?.imageURL?.urlList?.[0];
        if (imageUrl) {
          items.push({
            mediaType: 'image',
            directUrl: imageUrl,
            filenameHint: 'tiktok-image.jpg',
            headers: buildHeaders(finalUrl),
          });
        }
      }
    }
  }

  const nextDataRaw = scriptOverrides?.nextData ?? $('script#__NEXT_DATA__').html();
  if (!items.length && nextDataRaw) {
    const nextData = JSON.parse(nextDataRaw);
    const itemStruct = nextData?.props?.pageProps?.itemInfo?.itemStruct;
    const video = itemStruct?.video;
    if (video?.downloadAddr || video?.playAddr) {
      items.push({
        mediaType: 'video',
        directUrl: video.downloadAddr || video.playAddr,
        filenameHint: 'tiktok-video.mp4',
        headers: buildHeaders(finalUrl),
      });
    }
    const imagePost = itemStruct?.imagePost;
    if (imagePost?.images?.length) {
      for (const image of imagePost.images) {
        const imageUrl = image?.displayImage?.urlList?.[0] || image?.imageURL?.urlList?.[0];
        if (imageUrl) {
          items.push({
            mediaType: 'image',
            directUrl: imageUrl,
            filenameHint: 'tiktok-image.jpg',
            headers: buildHeaders(finalUrl),
          });
        }
      }
    }
  }

  const universalDataRaw = scriptOverrides?.universalData ?? $('script#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
  if (!items.length && universalDataRaw) {
    const universalData = JSON.parse(universalDataRaw);
    const scope = universalData?.__DEFAULT_SCOPE__ || {};
    const videoDetail = scope['webapp.video-detail'] || scope['webapp.video-detail-page'];
    const itemStruct = videoDetail?.itemInfo?.itemStruct;
    const video = itemStruct?.video;
    if (video?.downloadAddr || video?.playAddr) {
      items.push({
        mediaType: 'video',
        directUrl: video.downloadAddr || video.playAddr,
        filenameHint: 'tiktok-video.mp4',
        headers: buildHeaders(finalUrl),
      });
    }
    const imagePost = itemStruct?.imagePost;
    if (imagePost?.images?.length) {
      for (const image of imagePost.images) {
        const imageUrl = image?.displayImage?.urlList?.[0] || image?.imageURL?.urlList?.[0];
        if (imageUrl) {
          items.push({
            mediaType: 'image',
            directUrl: imageUrl,
            filenameHint: 'tiktok-image.jpg',
            headers: buildHeaders(finalUrl),
          });
        }
      }
    }
  }

  if (!items.length && scriptOverrides?.windowState) {
    const itemModule = scriptOverrides.windowState?.ItemModule || scriptOverrides.windowState?.itemModule;
    const item = itemModule ? Object.values(itemModule)[0] : null;
    const video = item?.video;
    if (video?.downloadAddr || video?.playAddr) {
      items.push({
        mediaType: 'video',
        directUrl: video.downloadAddr || video.playAddr,
        filenameHint: 'tiktok-video.mp4',
        headers: buildHeaders(finalUrl),
      });
    }
  }

  if (!items.length && ogVideo) {
    items.push({
      mediaType: 'video',
      directUrl: ogVideo,
      filenameHint: 'tiktok-video.mp4',
      headers: buildHeaders(finalUrl),
    });
  } else if (!items.length && ogImage) {
    items.push({
      mediaType: 'image',
      directUrl: ogImage,
      filenameHint: 'tiktok-image.jpg',
      headers: buildHeaders(finalUrl),
    });
  }

  return items;
}

async function fetchTikTokDataWithPlaywright(
  url: string
): Promise<{
  html: string;
  sigiState?: string | null;
  nextData?: string | null;
  universalData?: string | null;
  windowState?: any;
} | null> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (type === 'image' || type === 'font' || type === 'media') {
        route.abort();
        return;
      }
      route.continue();
    });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);
    const [sigiState, nextData, universalData] = await Promise.all([
      page.evaluate(() => document.querySelector('#SIGI_STATE')?.textContent ?? null),
      page.evaluate(() => document.querySelector('#__NEXT_DATA__')?.textContent ?? null),
      page.evaluate(() => document.querySelector('#__UNIVERSAL_DATA_FOR_REHYDRATION__')?.textContent ?? null),
    ]);
    const windowState = await page.evaluate(() => (window as any).SIGI_STATE || (window as any).__SIGI_STATE__ || null);
    return {
      html: await page.content(),
      sigiState,
      nextData,
      universalData,
      windowState,
    };
  } catch (error) {
    return null;
  } finally {
    await browser.close();
  }
}

async function fetchTikTokFromTikwm(url: string): Promise<MediaItem | null> {
  try {
    const response = await axios.get('https://www.tikwm.com/api/', {
      params: { url, hd: 1 },
      timeout: 15000,
      headers: buildHeaders(url),
    });
    const videoUrl = response.data?.data?.play;
    if (!videoUrl) {
      return null;
    }
    return {
      mediaType: 'video',
      directUrl: videoUrl,
      filenameHint: 'tiktok-video.mp4',
      headers: buildHeaders(url),
    };
  } catch (error) {
    return null;
  }
}

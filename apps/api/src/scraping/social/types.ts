export type SocialPlatform = 'INSTAGRAM' | 'TIKTOK' | 'PINTEREST' | 'YOUTUBE' | 'SHOPEE';

export type MediaType = 'image' | 'video';

export interface MediaItem {
  mediaType: MediaType;
  directUrl: string;
  filenameHint?: string;
  headers?: Record<string, string>;
  downloadStrategy?: 'direct' | 'youtube';
}

export interface MediaResult {
  source: SocialPlatform;
  url: string;
  items: MediaItem[];
}

export interface SocialScraper {
  canHandle(url: string): boolean;
  scrape(url: string): Promise<MediaResult>;
}

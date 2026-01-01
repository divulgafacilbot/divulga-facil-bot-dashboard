export enum MarketplaceEnum {
  SHOPEE = "SHOPEE",
  MERCADO_LIVRE = "MERCADO_LIVRE",
  AMAZON = "AMAZON",
  MAGALU = "MAGALU",
}

export enum RenderFieldEnum {
  TITLE = "title",
  DESCRIPTION = "description",
  PRICE = "price",
  ORIGINAL_PRICE = "originalPrice",
  PRODUCT_URL = "productUrl",
  COUPON = "coupon",
  DISCLAIMER = "disclaimer",
  SALES_QUANTITY = "salesQuantity",
  CUSTOM_TEXT = "customText",
}

export type ScrapeField =
  | "title"
  | "description"
  | "price"
  | "originalPrice"
  | "discountPercentage"
  | "imageUrl"
  | "marketplace"
  | "rating"
  | "reviewCount"
  | "salesQuantity"
  | "seller"
  | "inStock";

export interface ProductData {
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  imageUrl: string;
  productUrl: string;
  marketplace: MarketplaceEnum;
  rating?: number;
  reviewCount?: number;
  salesQuantity?: number;
  seller?: string;
  inStock: boolean;
  scrapedAt: Date;
}

export interface ScrapeOptions {
  fields?: ScrapeField[];
  originalUrl?: string;
  skipPlaywright?: boolean;
  userId?: string;
  telegramUserId?: string | number;
  origin?: string;
}

export interface ScraperResult {
  success: boolean;
  data?: ProductData;
  error?: string;
}

export interface MarketplaceScraper {
  readonly marketplace: MarketplaceEnum;
  readonly marketplaceName: string;
  canHandle(url: string): boolean;
  scrape(url: string, options?: ScrapeOptions): Promise<ScraperResult>;
}

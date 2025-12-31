/**
 * Product data extracted from marketplace
 */
export interface ProductData {
  title: string;
  description?: string; // Product description
  price: number; // Promotional price
  originalPrice?: number; // Price before discount (full price)
  discountPercentage?: number;
  imageUrl: string;
  productUrl: string;
  marketplace: 'SHOPEE' | 'MERCADO_LIVRE' | 'AMAZON' | 'MAGAZINE_LUIZA';
  rating?: number;
  reviewCount?: number;
  salesQuantity?: number; // Number of items sold
  seller?: string;
  inStock: boolean;
  scrapedAt: Date;
}

/**
 * Scraper result
 */
export interface ScraperResult {
  success: boolean;
  data?: ProductData;
  error?: string;
}

/**
 * Marketplace scraper interface
 */
export interface IMarketplaceScraper {
  /**
   * Name of the marketplace
   */
  readonly marketplaceName: string;

  /**
   * Check if this scraper can handle the given URL
   */
  canHandle(url: string): boolean;

  /**
   * Scrape product data from URL
   */
  scrape(url: string): Promise<ScraperResult>;
}

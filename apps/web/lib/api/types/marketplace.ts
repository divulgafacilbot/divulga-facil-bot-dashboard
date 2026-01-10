/**
 * Marketplace Product Types (Frontend)
 */

export interface MarketplaceProduct {
  id: string;
  user_id: string;
  slug: string;
  source: 'BOT' | 'MANUAL';
  title: string;
  description?: string;
  price?: number;
  original_price?: number;
  discount_percent?: number;
  category?: string;
  affiliate_url: string;
  image_url: string;
  marketplace: string;
  coupon_code?: string;
  custom_note?: string;
  is_hidden: boolean;
  is_featured: boolean;
  view_count: number;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMarketplaceProductInput {
  source: 'BOT' | 'MANUAL';
  title: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  discountPercent?: number;
  category?: string;
  affiliateUrl: string;
  imageUrl: string;
  marketplace: string;
  couponCode?: string;
  customNote?: string;
  isFeatured?: boolean;
}

export interface UpdateMarketplaceProductInput {
  title?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  discountPercent?: number;
  category?: string;
  affiliateUrl?: string;
  imageUrl?: string;
  marketplace?: string;
  couponCode?: string;
  customNote?: string;
  isHidden?: boolean;
  isFeatured?: boolean;
}

export interface ListMarketplaceProductsFilters {
  category?: string;
  marketplace?: string;
  isHidden?: boolean;
  isFeatured?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MarketplaceProductStats {
  total: number;
  visible: number;
  hidden: number;
  featured: number;
  byCategory: Array<{ category: string; count: number }>;
  byMarketplace: Array<{ marketplace: string; count: number }>;
}

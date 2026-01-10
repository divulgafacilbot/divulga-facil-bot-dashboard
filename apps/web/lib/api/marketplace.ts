import { apiClient } from './client';
import type {
  MarketplaceProduct,
  CreateMarketplaceProductInput,
  UpdateMarketplaceProductInput,
  ListMarketplaceProductsFilters,
  MarketplaceProductStats,
} from './types/marketplace';

/**
 * Marketplace API Client
 */
export const marketplaceApi = {
  /**
   * Create a new marketplace product
   */
  async createProduct(data: CreateMarketplaceProductInput): Promise<MarketplaceProduct> {
    const response = await apiClient.post<{ data: MarketplaceProduct }>('/marketplace/products', data);
    return response.data.data;
  },

  /**
   * Get product by ID
   */
  async getProduct(productId: string): Promise<MarketplaceProduct> {
    const response = await apiClient.get<{ data: MarketplaceProduct }>(`/marketplace/products/${productId}`);
    return response.data.data;
  },

  /**
   * List products with filters
   */
  async listProducts(filters?: ListMarketplaceProductsFilters): Promise<{
    products: MarketplaceProduct[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams();

    if (filters?.category) params.append('category', filters.category);
    if (filters?.marketplace) params.append('marketplace', filters.marketplace);
    if (filters?.isHidden !== undefined) params.append('isHidden', String(filters.isHidden));
    if (filters?.isFeatured !== undefined) params.append('isFeatured', String(filters.isFeatured));
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await apiClient.get<{
      products: MarketplaceProduct[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/marketplace/products?${params.toString()}`);
    return {
      products: response.data.products,
      pagination: response.data.pagination,
    };
  },

  /**
   * Update product
   */
  async updateProduct(
    productId: string,
    data: UpdateMarketplaceProductInput
  ): Promise<MarketplaceProduct> {
    const response = await apiClient.patch<{ data: MarketplaceProduct }>(`/marketplace/products/${productId}`, data);
    return response.data.data;
  },

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(productId: string): Promise<void> {
    await apiClient.delete(`/marketplace/products/${productId}`);
  },

  /**
   * Get product statistics
   */
  async getProductStats(): Promise<MarketplaceProductStats> {
    const response = await apiClient.get<{ data: MarketplaceProductStats }>('/marketplace/products/stats');
    return response.data.data;
  },

  /**
   * Track product view
   */
  async trackView(productId: string): Promise<void> {
    await apiClient.post(`/marketplace/products/${productId}/view`);
  },

  /**
   * Track product click
   */
  async trackClick(productId: string): Promise<void> {
    await apiClient.post(`/marketplace/products/${productId}/click`);
  },
};

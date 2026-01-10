import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarketplaceProductService } from '../product.service';
import prisma from '../../../lib/prisma';

vi.mock('../../../lib/prisma', () => ({
  default: {
    marketplaceProduct: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

describe('MarketplaceProductService', () => {
  let service: MarketplaceProductService;

  beforeEach(() => {
    service = new MarketplaceProductService();
    vi.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const mockProduct = {
        id: '1',
        user_id: 'user1',
        source: 'MANUAL',
        title: 'Test Product',
        slug: 'sp-test123',
        affiliate_url: 'https://example.com',
        image_url: 'https://example.com/image.jpg',
        marketplace: 'SHOPEE',
        is_featured: false,
        is_hidden: false,
        views_count: 0,
        clicks_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(prisma.marketplaceProduct.create).mockResolvedValue(mockProduct as any);

      const result = await service.createProduct({
        userId: 'user1',
        source: 'MANUAL',
        title: 'Test Product',
        affiliateUrl: 'https://example.com',
        imageUrl: 'https://example.com/image.jpg',
        marketplace: 'SHOPEE',
      });

      expect(result).toEqual(mockProduct);
      expect(prisma.marketplaceProduct.create).toHaveBeenCalledOnce();
    });
  });

  describe('listProducts', () => {
    it('should list products with pagination', async () => {
      const mockProducts = [
        { id: '1', title: 'Product 1' },
        { id: '2', title: 'Product 2' },
      ];

      vi.mocked(prisma.marketplaceProduct.findMany).mockResolvedValue(mockProducts as any);
      vi.mocked(prisma.marketplaceProduct.count).mockResolvedValue(10);

      const result = await service.listProducts({
        userId: 'user1',
        page: 1,
        limit: 2,
      });

      expect(result.products).toEqual(mockProducts);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.totalPages).toBe(5);
    });
  });

  describe('getProductStats', () => {
    it('should return product statistics', async () => {
      vi.mocked(prisma.marketplaceProduct.count).mockResolvedValueOnce(100);
      vi.mocked(prisma.marketplaceProduct.count).mockResolvedValueOnce(80);
      vi.mocked(prisma.marketplaceProduct.count).mockResolvedValueOnce(15);
      vi.mocked(prisma.marketplaceProduct.count).mockResolvedValueOnce(20);

      const result = await service.getProductStats('user1');

      expect(result.total).toBe(100);
      expect(result.visible).toBe(80);
      expect(result.featured).toBe(15);
      expect(result.hidden).toBe(20);
    });
  });

  describe('trackView', () => {
    it('should increment view count', async () => {
      const mockProduct = {
        id: '1',
        views_count: 5,
      };

      vi.mocked(prisma.marketplaceProduct.update).mockResolvedValue(mockProduct as any);

      await service.trackView('1');

      expect(prisma.marketplaceProduct.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { views_count: { increment: 1 } },
      });
    });
  });

  describe('trackClick', () => {
    it('should increment click count', async () => {
      const mockProduct = {
        id: '1',
        clicks_count: 3,
      };

      vi.mocked(prisma.marketplaceProduct.update).mockResolvedValue(mockProduct as any);

      await service.trackClick('1');

      expect(prisma.marketplaceProduct.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { clicks_count: { increment: 1 } },
      });
    });
  });
});

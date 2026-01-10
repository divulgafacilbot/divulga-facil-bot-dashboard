import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { MarketplaceController } from '../marketplace.controller';
import { MarketplaceProductService } from '../../services/marketplace/product.service';

vi.mock('../../services/marketplace/product.service');

describe('MarketplaceController', () => {
  let controller: MarketplaceController;
  let mockService: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockService = {
      createProduct: vi.fn(),
      listProducts: vi.fn(),
      getProductById: vi.fn(),
      updateProduct: vi.fn(),
      deleteProduct: vi.fn(),
      getProductStats: vi.fn(),
      trackView: vi.fn(),
      trackClick: vi.fn(),
    };

    vi.mocked(MarketplaceProductService).mockImplementation(() => mockService);

    controller = new MarketplaceController();

    mockReq = {
      user: { userId: 'user1' },
      body: {},
      params: {},
      query: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    vi.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const mockProduct = {
        id: '1',
        title: 'Test Product',
        user_id: 'user1',
      };

      mockReq.body = {
        source: 'MANUAL',
        title: 'Test Product',
        affiliateUrl: 'https://example.com',
        imageUrl: 'https://example.com/image.jpg',
        marketplace: 'SHOPEE',
      };

      mockService.createProduct.mockResolvedValue(mockProduct);

      await controller.createProduct(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ product: mockProduct });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.body = {
        // Missing required fields
        title: 'Test',
      };

      await controller.createProduct(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('listProducts', () => {
    it('should list products with pagination', async () => {
      const mockResult = {
        products: [
          { id: '1', title: 'Product 1' },
          { id: '2', title: 'Product 2' },
        ],
        pagination: {
          total: 10,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockReq.query = { page: '1', limit: '10' };

      mockService.listProducts.mockResolvedValue(mockResult);

      await controller.listProducts(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getProduct', () => {
    it('should get a product by id', async () => {
      const mockProduct = {
        id: '1',
        title: 'Test Product',
      };

      mockReq.params = { id: '1' };

      mockService.getProductById.mockResolvedValue(mockProduct);

      await controller.getProduct(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ product: mockProduct });
    });

    it('should return 404 if product not found', async () => {
      mockReq.params = { id: '999' };

      mockService.getProductById.mockResolvedValue(null);

      await controller.getProduct(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Produto não encontrado' });
    });
  });

  describe('updateProduct', () => {
    it('should update a product successfully', async () => {
      const mockProduct = {
        id: '1',
        title: 'Updated Product',
      };

      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Product' };

      mockService.updateProduct.mockResolvedValue(mockProduct);

      await controller.updateProduct(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ product: mockProduct });
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product successfully', async () => {
      mockReq.params = { id: '1' };

      mockService.deleteProduct.mockResolvedValue(undefined);

      await controller.deleteProduct(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Produto excluído com sucesso' });
    });
  });

  describe('getStats', () => {
    it('should get product statistics', async () => {
      const mockStats = {
        total: 100,
        visible: 80,
        featured: 15,
        hidden: 20,
      };

      mockService.getProductStats.mockResolvedValue(mockStats);

      await controller.getStats(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockStats);
    });
  });

  describe('trackView', () => {
    it('should track product view', async () => {
      mockReq.params = { id: '1' };

      mockService.trackView.mockResolvedValue(undefined);

      await controller.trackView(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'View registrada' });
    });
  });

  describe('trackClick', () => {
    it('should track product click', async () => {
      mockReq.params = { id: '1' };

      mockService.trackClick.mockResolvedValue(undefined);

      await controller.trackClick(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Click registrado' });
    });
  });
});

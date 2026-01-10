import { prisma } from '../../db/prisma.js';
import { slugGeneratorService } from './slug-generator.service.js';
import { categoryInferenceService } from './category-inference.service.js';
import { marketplaceImageService } from './image.service.js';
import { telemetryService } from '../telemetry.service.js';

export interface CreateMarketplaceProductInput {
  userId: string;
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
  userId: string;
  category?: string;
  marketplace?: string;
  isHidden?: boolean;
  isFeatured?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Marketplace Product Service
 * Manages marketplace products (from bot or manual creation)
 */
export class MarketplaceProductService {
  /**
   * Create a new marketplace product
   */
  async createProduct(input: CreateMarketplaceProductInput) {
    // Generate unique slug
    const slug = slugGeneratorService.generateSlug(input.marketplace);

    // Infer category if not provided
    let category = input.category;
    if (!category) {
      category = await categoryInferenceService.inferCategory(input.title, input.description);
    }

    // Download and process image
    let localImageUrl = input.imageUrl;
    try {
      localImageUrl = await marketplaceImageService.downloadAndProcessImage(
        input.imageUrl,
        input.userId,
        slug
      );
    } catch (error) {
      console.error('[MarketplaceProduct] Image download failed, using original URL:', error);
    }

    // Calculate discount percent if not provided
    let discountPercent = input.discountPercent;
    if (!discountPercent && input.price && input.originalPrice && input.originalPrice > input.price) {
      discountPercent = Math.round(((input.originalPrice - input.price) / input.originalPrice) * 100);
    }

    // Create product
    const product = await prisma.marketplace_products.create({
      data: {
        user_id: input.userId,
        slug,
        source: input.source,
        title: input.title,
        description: input.description,
        price: input.price,
        original_price: input.originalPrice,
        discount_percent: discountPercent,
        category,
        affiliate_url: input.affiliateUrl,
        image_url: localImageUrl,
        marketplace: input.marketplace as any,
        coupon_code: input.couponCode,
        custom_note: input.customNote,
        is_featured: input.isFeatured || false,
      },
    });

    // Log telemetry
    await telemetryService.logEvent({
      eventType: 'MARKETPLACE_PRODUCT_CREATED',
      userId: input.userId,
      origin: input.source === 'BOT' ? 'pinterest-bot' : 'dashboard',
      metadata: {
        productId: product.id,
        slug: product.slug,
        marketplace: product.marketplace,
        category: product.category,
      },
    });

    return product;
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string, userId: string) {
    return await prisma.marketplace_products.findFirst({
      where: {
        id: productId,
        user_id: userId,
      },
    });
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(slug: string, userId: string) {
    return await prisma.marketplace_products.findFirst({
      where: {
        slug,
        user_id: userId,
      },
    });
  }

  /**
   * List products with filters
   */
  async listProducts(filters: ListMarketplaceProductsFilters) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      user_id: filters.userId,
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.marketplace) {
      where.marketplace = filters.marketplace;
    }

    if (filters.isHidden !== undefined) {
      where.is_hidden = filters.isHidden;
    }

    if (filters.isFeatured !== undefined) {
      where.is_featured = filters.isFeatured;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.marketplace_products.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.marketplace_products.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update product
   */
  async updateProduct(productId: string, userId: string, input: UpdateMarketplaceProductInput) {
    // Verify ownership
    const existing = await this.getProductById(productId, userId);
    if (!existing) {
      throw new Error('Product not found');
    }

    // If image URL changed, download new image
    let imageUrl = input.imageUrl;
    if (imageUrl && imageUrl !== existing.image_url) {
      try {
        imageUrl = await marketplaceImageService.downloadAndProcessImage(
          imageUrl,
          userId,
          existing.slug
        );
        // Delete old image if local
        if (existing.image_url.startsWith('/uploads/')) {
          await marketplaceImageService.deleteImage(existing.image_url);
        }
      } catch (error) {
        console.error('[MarketplaceProduct] Image update failed:', error);
      }
    }

    // Calculate discount if prices changed
    let discountPercent = input.discountPercent;
    if (!discountPercent && input.price && input.originalPrice && input.originalPrice > input.price) {
      discountPercent = Math.round(((input.originalPrice - input.price) / input.originalPrice) * 100);
    }

    const product = await prisma.marketplace_products.update({
      where: { id: productId },
      data: {
        title: input.title,
        description: input.description,
        price: input.price,
        original_price: input.originalPrice,
        discount_percent: discountPercent,
        category: input.category,
        affiliate_url: input.affiliateUrl,
        image_url: imageUrl,
        marketplace: input.marketplace as any,
        coupon_code: input.couponCode,
        custom_note: input.customNote,
        is_hidden: input.isHidden,
        is_featured: input.isFeatured,
      },
    });

    // Log telemetry
    await telemetryService.logEvent({
      eventType: 'MARKETPLACE_PRODUCT_UPDATED',
      userId,
      origin: 'dashboard',
      metadata: {
        productId: product.id,
        slug: product.slug,
      },
    });

    return product;
  }

  /**
   * Delete product (soft delete by setting is_hidden = true)
   */
  async deleteProduct(productId: string, userId: string) {
    const existing = await this.getProductById(productId, userId);
    if (!existing) {
      throw new Error('Product not found');
    }

    const product = await prisma.marketplace_products.update({
      where: { id: productId },
      data: { is_hidden: true },
    });

    // Log telemetry
    await telemetryService.logEvent({
      eventType: 'MARKETPLACE_PRODUCT_DELETED',
      userId,
      origin: 'dashboard',
      metadata: {
        productId: product.id,
        slug: product.slug,
      },
    });

    return product;
  }

  /**
   * Increment view count
   */
  async incrementViewCount(productId: string) {
    await prisma.marketplace_products.update({
      where: { id: productId },
      data: {
        view_count: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Increment click count
   */
  async incrementClickCount(productId: string) {
    await prisma.marketplace_products.update({
      where: { id: productId },
      data: {
        click_count: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Get product statistics
   */
  async getProductStats(userId: string) {
    const [total, hidden, featured, byCategory, byMarketplace] = await Promise.all([
      prisma.marketplace_products.count({
        where: { user_id: userId },
      }),
      prisma.marketplace_products.count({
        where: { user_id: userId, is_hidden: true },
      }),
      prisma.marketplace_products.count({
        where: { user_id: userId, is_featured: true },
      }),
      prisma.marketplace_products.groupBy({
        by: ['category'],
        where: { user_id: userId, is_hidden: false },
        _count: true,
      }),
      prisma.marketplace_products.groupBy({
        by: ['marketplace'],
        where: { user_id: userId, is_hidden: false },
        _count: true,
      }),
    ]);

    return {
      total,
      visible: total - hidden,
      hidden,
      featured,
      byCategory: byCategory.map((item) => ({
        category: item.category,
        count: item._count,
      })),
      byMarketplace: byMarketplace.map((item) => ({
        marketplace: item.marketplace,
        count: item._count,
      })),
    };
  }
}

export const marketplaceProductService = new MarketplaceProductService();

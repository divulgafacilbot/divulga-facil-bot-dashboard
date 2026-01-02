import { Request, Response } from 'express';
import { artGeneratorService, ArtFormat } from '../services/image-generation/art-generator.service.js';
import { brandConfigService } from '../services/brand-config.service.js';
import { layoutPreferencesService } from '../services/layout-preferences.service.js';
import { usageCountersService } from '../services/usage-counters.service.js';
import { scraperRouter } from '../scraping/index.js';
import { getRequiredScrapeFields } from '../scraping/fields.js';
import { MarketplaceEnum } from '../scraping/types.js';
import { z } from 'zod';

const generateArtSchema = z.object({
  productUrl: z.string().url('Invalid product URL'),
  format: z.enum(['feed', 'story']).optional().default('feed'),
});

export class ArtGenerationController {
  /**
   * POST /api/generate-art
   * Generate product art from URL
   * Requires authentication
   */
  async generateArt(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate request body
      const validation = generateArtSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { productUrl, format } = validation.data;

      const layoutPreferences = await layoutPreferencesService.getPreferences(userId);
      const requiredFields = getRequiredScrapeFields(layoutPreferences);

      // 1. Scrape product data
      const scrapedResult = await scraperRouter.scrape(productUrl, {
        fields: requiredFields,
        userId,
        origin: 'dashboard',
      });

      if (!scrapedResult.success || !scrapedResult.data) {
        return res.status(400).json({
          error: 'Failed to scrape product data',
          details: scrapedResult.error,
        });
      }

      const product = scrapedResult.data;

      // 2. Get user's brand config
      const brandConfig = await brandConfigService.getConfig(userId);

      // 3. Generate art
      const artBuffer = await artGeneratorService.generateArt(
        product,
        brandConfig,
        format as ArtFormat,
        userId,
        layoutPreferences
      );

      await usageCountersService.incrementRenders(userId);

      // 4. Send image
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', artBuffer.length);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="product-art-${format}.png"`
      );

      return res.send(artBuffer);
    } catch (error) {
      console.error('Error generating art:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/test-art
   * Generate test art with mock data (for testing)
   */
  async testArt(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const format = (req.query.format as ArtFormat) || 'feed';

      // Mock product data for testing
      const mockProduct = {
        title: 'Smartwatch Relógio Ultra 2 Pro Max',
        price: 89.99,
        originalPrice: 189.99,
        discountPercentage: 53,
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        productUrl: 'https://example.com/product',
        marketplace: MarketplaceEnum.SHOPEE,
        rating: 4.5,
        reviewCount: 1234,
        inStock: true,
        scrapedAt: new Date(),
      };

      // Get user's brand config or use defaults
      const brandConfig = userId
        ? await brandConfigService.getConfig(userId)
        : {
            templateId: 'default',
            bgColor: '#FFFFFF',
            textColor: '#000000',
            priceColor: '#FF0000',
            fontFamily: 'Inter',
            showCoupon: true,
            couponText: 'DESCONTO10',
            ctaText: 'COMPRE AGORA!',
            customImageUrl: null,
          };

      // Generate art
      const artBuffer = await artGeneratorService.generateArt(
        mockProduct,
        brandConfig,
        format,
        userId
      );

      // Send image
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', artBuffer.length);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="test-art-${format}.png"`
      );

      return res.send(artBuffer);
    } catch (error) {
      console.error('Error generating test art:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const artGenerationController = new ArtGenerationController();

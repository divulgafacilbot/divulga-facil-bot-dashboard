import sharp from 'sharp';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { ProductData } from '../scrapers/types.js';
import { LayoutPreferences } from '../layout-preferences.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BrandConfig {
  templateId: string;
  bgColor: string;
  textColor: string;
  priceColor: string | null;
  fontFamily: string;
  showCoupon: boolean;
  couponText: string | null;
  ctaText: string | null;
  customImageUrl: string | null;
}

export type ArtFormat = 'feed' | 'story';

export class ArtGeneratorService {
  /**
   * Generate product art image
   */
  async generateArt(
    product: ProductData,
    brandConfig: BrandConfig,
    format: ArtFormat = 'feed',
    userId?: string,
    layoutPreferences?: LayoutPreferences
  ): Promise<Buffer> {
    try {
      // 1. Get template image
      const templateBuffer = await this.getTemplateImage(brandConfig.templateId, format, userId);

      // 2. Get product image
      const productImageBuffer = await this.downloadImage(product.imageUrl);

      // 3. Prepare dimensions based on format
      const dimensions = format === 'feed'
        ? { width: 1080, height: 1350 }  // 4:5 ratio
        : { width: 1080, height: 1920 }; // 9:16 ratio

      // 4. Resize template to target dimensions
      const templateResized = await sharp(templateBuffer)
        .resize(dimensions.width, dimensions.height, { fit: 'cover' })
        .toBuffer();

      // 5. Process product image based on format
      let compositeImage: Buffer;

      if (format === 'feed') {
        compositeImage = await this.generateFeedArt(
          templateResized,
          productImageBuffer,
          product,
          brandConfig,
          dimensions,
          layoutPreferences
        );
      } else {
        compositeImage = await this.generateStoryArt(
          templateResized,
          productImageBuffer,
          product,
          brandConfig,
          dimensions,
          layoutPreferences
        );
      }

      return compositeImage;
    } catch (error) {
      console.error('Error generating art:', error);
      throw new Error('Failed to generate product art');
    }
  }

  /**
   * Generate feed format art (4:5)
   */
  private async generateFeedArt(
    templateBuffer: Buffer,
    productImageBuffer: Buffer,
    product: ProductData,
    brandConfig: BrandConfig,
    dimensions: { width: number; height: number },
    layoutPreferences?: LayoutPreferences
  ): Promise<Buffer> {
    // Resize product image to fit in template (smaller, centered)
    const productImageSize = Math.min(dimensions.width * 0.6, dimensions.height * 0.4);
    const productImageResized = await sharp(productImageBuffer)
      .resize(Math.round(productImageSize), Math.round(productImageSize), {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    // Create SVG overlay for text
    const textColor = brandConfig.textColor || '#000000';
    const priceColor = brandConfig.priceColor || textColor;

    const priceFormatted = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
    const originalPriceText = product.originalPrice
      ? `R$ ${product.originalPrice.toFixed(2).replace('.', ',')}`
      : '';
    const discountText = product.discountPercentage
      ? `-${product.discountPercentage}%`
      : '';

    // Create text overlay SVG with conditional fields based on layout preferences
    let currentY = dimensions.height * 0.60; // Start position for text content
    const yStep = 60; // Vertical spacing between elements

    const textSvg = `
      <svg width="${dimensions.width}" height="${dimensions.height}">
        ${layoutPreferences?.feedShowTitle !== false ? `
        <!-- Product Title -->
        <text
          x="${dimensions.width / 2}"
          y="${Math.round(currentY)}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="48"
          font-weight="bold"
          fill="${textColor}"
          text-anchor="middle"
          style="paint-order: stroke; stroke: white; stroke-width: 4px;"
        >
          ${this.escapeXml(this.truncateText(product.title, 40))}
        </text>
        ` : ''}

        ${layoutPreferences?.feedShowDescription !== false && product.description ? `
        <!-- Product Description -->
        <text
          x="${dimensions.width / 2}"
          y="${Math.round(currentY + (layoutPreferences?.feedShowTitle !== false ? yStep : 0))}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="28"
          fill="${textColor}"
          text-anchor="middle"
          opacity="0.8"
          style="paint-order: stroke; stroke: white; stroke-width: 2px;"
        >
          ${this.escapeXml(this.truncateText(product.description, 60))}
        </text>
        ` : ''}

        ${layoutPreferences?.feedShowPrice !== false ? `
        <!-- Price -->
        <text
          x="${dimensions.width / 2}"
          y="${Math.round(dimensions.height * 0.75)}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="64"
          font-weight="bold"
          fill="${priceColor}"
          text-anchor="middle"
          style="paint-order: stroke; stroke: white; stroke-width: 4px;"
        >
          ${priceFormatted}
        </text>
        ` : ''}

        ${layoutPreferences?.feedShowOriginalPrice !== false && originalPriceText ? `
        <!-- Original Price (strikethrough) -->
        <text
          x="${dimensions.width / 2}"
          y="${Math.round(dimensions.height * 0.82)}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="36"
          fill="${textColor}"
          text-anchor="middle"
          opacity="0.7"
          text-decoration="line-through"
        >
          ${originalPriceText}
        </text>
        ` : ''}

        ${discountText ? `
        <!-- Discount Badge -->
        <rect
          x="${Math.round(dimensions.width * 0.75)}"
          y="${Math.round(dimensions.height * 0.15)}"
          width="180"
          height="80"
          fill="#FF0000"
          rx="10"
        />
        <text
          x="${Math.round(dimensions.width * 0.75 + 90)}"
          y="${Math.round(dimensions.height * 0.15 + 55)}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="42"
          font-weight="bold"
          fill="white"
          text-anchor="middle"
        >
          ${discountText}
        </text>
        ` : ''}

        ${layoutPreferences?.feedShowSalesQuantity !== false && product.salesQuantity ? `
        <!-- Sales Quantity -->
        <text
          x="${Math.round(dimensions.width * 0.15)}"
          y="${Math.round(dimensions.height * 0.20)}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="32"
          font-weight="bold"
          fill="${textColor}"
          text-anchor="start"
          style="paint-order: stroke; stroke: white; stroke-width: 3px;"
        >
          🔥 ${product.salesQuantity.toLocaleString('pt-BR')} vendidos
        </text>
        ` : ''}

        ${layoutPreferences?.feedShowCoupon !== false && brandConfig.showCoupon && brandConfig.couponText ? `
        <!-- Coupon -->
        <text
          x="${dimensions.width / 2}"
          y="${Math.round(dimensions.height * 0.90)}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="32"
          fill="${textColor}"
          text-anchor="middle"
          style="paint-order: stroke; stroke: white; stroke-width: 3px;"
        >
          🎟️ ${this.escapeXml(brandConfig.couponText)}
        </text>
        ` : ''}

        ${layoutPreferences?.feedShowDisclaimer !== false && layoutPreferences?.feedShowDisclaimer ? `
        <!-- Disclaimer -->
        <text
          x="${dimensions.width / 2}"
          y="${Math.round(dimensions.height * 0.93)}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="20"
          fill="${textColor}"
          text-anchor="middle"
          opacity="0.6"
        >
          *Oferta sujeita a disponibilidade
        </text>
        ` : ''}

        ${layoutPreferences?.feedShowCustomText !== false && brandConfig.ctaText ? `
        <!-- CTA Text -->
        <text
          x="${dimensions.width / 2}"
          y="${Math.round(dimensions.height * 0.96)}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="28"
          font-weight="bold"
          fill="${textColor}"
          text-anchor="middle"
          style="paint-order: stroke; stroke: white; stroke-width: 3px;"
        >
          ${this.escapeXml(brandConfig.ctaText)}
        </text>
        ` : ''}
      </svg>
    `;

    // Composite: template + product image + text
    const productImageX = Math.round((dimensions.width - productImageSize) / 2);
    const productImageY = Math.round(dimensions.height * 0.15);

    const result = await sharp(templateBuffer)
      .composite([
        {
          input: productImageResized,
          top: productImageY,
          left: productImageX,
        },
        {
          input: Buffer.from(textSvg),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    return result;
  }

  /**
   * Generate story format art (9:16)
   */
  private async generateStoryArt(
    templateBuffer: Buffer,
    productImageBuffer: Buffer,
    product: ProductData,
    brandConfig: BrandConfig,
    dimensions: { width: number; height: number },
    layoutPreferences?: LayoutPreferences
  ): Promise<Buffer> {
    // Story layout: 1/6 top, 4/6 middle (content), 1/6 bottom
    const contentHeight = Math.round(dimensions.height * (4 / 6));
    const topOffset = Math.round(dimensions.height / 6);

    // Resize product image to fit in content area
    const productImageSize = Math.min(dimensions.width * 0.8, contentHeight * 0.5);
    const productImageResized = await sharp(productImageBuffer)
      .resize(Math.round(productImageSize), Math.round(productImageSize), {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    const textColor = brandConfig.textColor || '#000000';
    const priceColor = brandConfig.priceColor || textColor;

    const priceFormatted = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
    const discountText = product.discountPercentage
      ? `-${product.discountPercentage}%`
      : '';

    // Create text overlay SVG for story with conditional fields based on layout preferences
    const textSvg = `
      <svg width="${dimensions.width}" height="${dimensions.height}">
        <!-- Product Image positioned in middle zone -->

        ${layoutPreferences?.storyShowTitle !== false ? `
        <!-- Product Title (below image) -->
        <text
          x="${dimensions.width / 2}"
          y="${Math.round(topOffset + contentHeight * 0.6)}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="56"
          font-weight="bold"
          fill="${textColor}"
          text-anchor="middle"
          style="paint-order: stroke; stroke: white; stroke-width: 4px;"
        >
          ${this.escapeXml(this.truncateText(product.title, 35))}
        </text>
        ` : ''}

        ${layoutPreferences?.storyShowPrice !== false ? `
        <!-- Price -->
        <text
          x="${dimensions.width / 2}"
          y="${Math.round(topOffset + contentHeight * 0.75)}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="72"
          font-weight="bold"
          fill="${priceColor}"
          text-anchor="middle"
          style="paint-order: stroke; stroke: white; stroke-width: 5px;"
        >
          ${priceFormatted}
        </text>
        ` : ''}

        ${layoutPreferences?.storyShowOriginalPrice !== false && product.originalPrice ? `
        <!-- Original Price (strikethrough) -->
        <text
          x="${dimensions.width / 2}"
          y="${Math.round(topOffset + contentHeight * 0.82)}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="40"
          fill="${textColor}"
          text-anchor="middle"
          opacity="0.7"
          text-decoration="line-through"
        >
          R$ ${product.originalPrice.toFixed(2).replace('.', ',')}
        </text>
        ` : ''}

        ${discountText ? `
        <!-- Discount Badge -->
        <rect
          x="${Math.round(dimensions.width * 0.7)}"
          y="${Math.round(topOffset + contentHeight * 0.1)}"
          width="200"
          height="90"
          fill="#FF0000"
          rx="10"
        />
        <text
          x="${Math.round(dimensions.width * 0.7 + 100)}"
          y="${Math.round(topOffset + contentHeight * 0.1 + 60)}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="48"
          font-weight="bold"
          fill="white"
          text-anchor="middle"
        >
          ${discountText}
        </text>
        ` : ''}

        ${layoutPreferences?.storyShowCoupon !== false && brandConfig.showCoupon && brandConfig.couponText ? `
        <!-- Coupon -->
        <text
          x="${dimensions.width / 2}"
          y="${Math.round(topOffset + contentHeight * 0.88)}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="40"
          fill="${textColor}"
          text-anchor="middle"
          style="paint-order: stroke; stroke: white; stroke-width: 3px;"
        >
          🎟️ ${this.escapeXml(brandConfig.couponText)}
        </text>
        ` : ''}

        ${layoutPreferences?.storyShowCustomText !== false && brandConfig.ctaText ? `
        <!-- Custom Text / CTA -->
        <text
          x="${dimensions.width / 2}"
          y="${Math.round(topOffset + contentHeight * 0.95)}"
          font-family="${brandConfig.fontFamily}, Arial, sans-serif"
          font-size="36"
          font-weight="bold"
          fill="${textColor}"
          text-anchor="middle"
          style="paint-order: stroke; stroke: white; stroke-width: 3px;"
        >
          ${this.escapeXml(brandConfig.ctaText)}
        </text>
        ` : ''}
      </svg>
    `;

    // Position product image in center of content area
    const productImageX = Math.round((dimensions.width - productImageSize) / 2);
    const productImageY = Math.round(topOffset + contentHeight * 0.05);

    const result = await sharp(templateBuffer)
      .composite([
        {
          input: productImageResized,
          top: productImageY,
          left: productImageX,
        },
        {
          input: Buffer.from(textSvg),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    return result;
  }

  /**
   * Get template image from file system or custom upload
   */
  private async getTemplateImage(
    templateId: string,
    format: ArtFormat,
    userId?: string
  ): Promise<Buffer> {
    // Try custom user template first
    if (userId && templateId !== 'default') {
      try {
        const customPath = path.join(
          __dirname,
          '..',
          '..',
          '..',
          'uploads',
          'templates',
          userId,
          templateId,
          format === 'feed' ? 'feed.png' : 'story.png'
        );
        return await fs.readFile(customPath);
      } catch (error) {
        console.log(`Custom template not found, falling back to system template: ${templateId}`);
      }
    }

    // Fall back to system templates
    const systemTemplatePath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      '..',
      'public',
      'templates',
      `${templateId}-${format}.png`
    );

    try {
      return await fs.readFile(systemTemplatePath);
    } catch (error) {
      // If template not found, use default
      const defaultPath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        '..',
        'public',
        'templates',
        `default-${format}.png`
      );
      return await fs.readFile(defaultPath);
    }
  }

  /**
   * Download image from URL
   */
  private async downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    return Buffer.from(response.data);
  }

  /**
   * Truncate text to max length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const artGeneratorService = new ArtGeneratorService();

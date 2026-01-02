import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { LayoutPreferences } from '../layout-preferences.service.js';
import { ProductData } from '../../scraping/types.js';

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
    const baseProductImageSize = Math.min(dimensions.width * 0.6, dimensions.height * 0.4);
    const productImageSize = baseProductImageSize * 1.44;
    const productImageResized = await sharp(productImageBuffer)
      .resize(Math.round(productImageSize), Math.round(productImageSize), {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toBuffer();

    // Composite: template + product image + text
    const productImageX = Math.round((dimensions.width - productImageSize) / 2);
    const productImageY = Math.round(dimensions.height * 0.25);

    const result = await sharp(templateBuffer)
      .composite([
        {
          input: productImageResized,
          top: productImageY,
          left: productImageX,
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
    const contentHeight = Math.round(dimensions.height * (30 / 50));
    const topOffset = Math.round(dimensions.height / 5.5);
    const contentTop = topOffset;

    // Resize product image to fit in content area
    let productImageSize = Math.min(dimensions.width * 0.8, contentHeight * 0.45);
    const textColor = brandConfig.textColor || '#000000';
    const priceColor = brandConfig.priceColor || textColor;

    const storyFields = this.getStoryFields(product, brandConfig, layoutPreferences);
    const textBlocks = storyFields.map((field) => ({
      ...field,
      lines: field.lines || [field.text],
      lineHeight: field.lineHeight || Math.round(field.fontSize * 1.2),
    }));

    const minGap = 16;
    const blockSpacing = 18;
    const baseTextHeight = textBlocks.reduce((total, block, index) => {
      const blockHeight = block.lineHeight * block.lines.length;
      const spacing = index === 0 ? 0 : blockSpacing;
      return total + blockHeight + spacing;
    }, 0);

    let maxTextHeight = contentHeight - productImageSize - minGap * 2;
    if (maxTextHeight < 0) {
      productImageSize = Math.min(productImageSize, Math.round(contentHeight * 0.35));
      maxTextHeight = contentHeight - productImageSize - minGap * 2;
    }

    const textScale =
      baseTextHeight > 0 && maxTextHeight > 0
        ? Math.min(1, maxTextHeight / baseTextHeight)
        : 1;

    const scaledBlockSpacing = Math.max(8, Math.round(blockSpacing * textScale));
    const scaledBlocks = textBlocks.map((block) => ({
      ...block,
      fontSize: Math.max(18, Math.round(block.fontSize * textScale)),
      lineHeight: Math.max(20, Math.round(block.lineHeight * textScale)),
    }));

    const scaledTextHeight = scaledBlocks.reduce((total, block, index) => {
      const blockHeight = block.lineHeight * block.lines.length;
      const spacing = index === 0 ? 0 : scaledBlockSpacing;
      return total + blockHeight + spacing;
    }, 0);

    const totalElementsHeight = productImageSize + scaledTextHeight;
    const elementCount = 1 + scaledBlocks.length;
    const spaceAround = Math.max(
      0,
      Math.floor((contentHeight - totalElementsHeight) / (elementCount + 1))
    );

    const productImageResized = await sharp(productImageBuffer)
      .resize(Math.round(productImageSize), Math.round(productImageSize), {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toBuffer();

    const displayPrices = this.normalizePriceDisplay(product);
    const discountText =
      displayPrices.originalPrice !== null &&
        displayPrices.price !== null &&
        displayPrices.originalPrice > displayPrices.price &&
        product.discountPercentage
        ? `-${product.discountPercentage}%`
        : '';

    let currentY = Math.round(contentTop + spaceAround + productImageSize + spaceAround);
    const storyTextElements = scaledBlocks
      .map((field, index) => {
        const lines = field.lines || [field.text];
        const blockTop = currentY + (index === 0 ? 0 : scaledBlockSpacing);
        currentY = blockTop + field.lineHeight * lines.length;
        const textBlock = `
          <text
            x="${dimensions.width / 2}"
            y="${blockTop + field.lineHeight}"
            font-family="${brandConfig.fontFamily}, Arial, sans-serif"
            font-size="${field.fontSize}"
            font-weight="${field.fontWeight}"
            fill="${field.color}"
            text-anchor="middle"
            ${field.decoration ? `text-decoration="${field.decoration}"` : ""}
            style="paint-order: stroke; stroke: white; stroke-width: 3px;"
          >
            ${lines
            .map(
              (line, lineIndex) => `
              <tspan x="${dimensions.width / 2}" ${lineIndex === 0 ? "" : `dy="${field.lineHeight}"`}>
                ${this.escapeXml(line)}
              </tspan>
            `
            )
            .join("")}
          </text>
        `;
        return textBlock;
      })
      .join("");

    const textSvg = `
      <svg width="${dimensions.width}" height="${dimensions.height}">
        ${discountText ? `
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
        ${storyTextElements}
      </svg>
    `;

    // Position product image in center of content area
    const productImageX = Math.round((dimensions.width - productImageSize) / 2);
    const productImageY = Math.round(contentTop + spaceAround);

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

    const templateFilename = `${templateId}-${format}.png`;
    const candidatePaths = [
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'web',
        'public',
        'templates',
        templateFilename
      ),
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        '..',
        'public',
        'templates',
        templateFilename
      ),
    ];

    for (const candidate of candidatePaths) {
      try {
        return await fs.readFile(candidate);
      } catch {
        // Try next candidate
      }
    }

    const defaultCandidates = [
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'web',
        'public',
        'templates',
        `default-${format}.png`
      ),
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        '..',
        'public',
        'templates',
        `default-${format}.png`
      ),
    ];

    for (const candidate of defaultCandidates) {
      try {
        return await fs.readFile(candidate);
      } catch {
        // Try next candidate
      }
    }

    throw new Error(`Template not found: ${templateId} (${format})`);
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

  buildLegendText(
    product: ProductData,
    brandConfig: BrandConfig,
    layoutPreferences?: LayoutPreferences
  ): string {
    const order = layoutPreferences?.storyOrder || [
      "title",
      "price",
      "originalPrice",
      "coupon",
      "customText",
    ];

    const lines: string[] = [];
    const displayPrices = this.normalizePriceDisplay(product);
    const priceFormatted = displayPrices.price !== null
      ? `R$ ${displayPrices.price.toFixed(2).replace('.', ',')}`
      : null;
    const originalPriceText = displayPrices.originalPrice !== null
      ? `R$ ${displayPrices.originalPrice.toFixed(2).replace('.', ',')}`
      : null;

    order.forEach((field) => {
      switch (field) {
        case "title":
          if (layoutPreferences?.feedShowTitle !== false) {
            lines.push(`🛍️ *${product.title}*`);
          }
          break;
        case "description":
          if (layoutPreferences?.feedShowDescription !== false && product.description) {
            lines.push(product.description);
          }
          break;
        case "price":
          if (layoutPreferences?.feedShowPrice !== false && priceFormatted) {
            lines.push(`💸 por ${priceFormatted} 🚨🚨`);
          }
          break;
        case "originalPrice":
          if (layoutPreferences?.feedShowOriginalPrice !== false && originalPriceText) {
            lines.push(`Preço cheio: ${originalPriceText}`);
          }
          break;
        case "productUrl":
          if (layoutPreferences?.feedShowProductUrl !== false) {
            lines.push(`👉Link p/ comprar: ${product.productUrl}`);
          }
          break;
        case "coupon":
          if (
            layoutPreferences?.feedShowCoupon !== false &&
            brandConfig.showCoupon &&
            brandConfig.couponText
          ) {
            lines.push(`🎟️ Cupom: ${brandConfig.couponText}`);
          }
          break;
        case "disclaimer":
          if (layoutPreferences?.feedShowDisclaimer) {
            lines.push("*Promoção sujeita a alteração a qualquer momento");
          }
          break;
        case "salesQuantity":
          if (layoutPreferences?.feedShowSalesQuantity && product.salesQuantity) {
            lines.push(`Vendas: ${product.salesQuantity.toLocaleString('pt-BR')} vendidos`);
          }
          break;
        case "customText":
          if (layoutPreferences?.feedShowCustomText && brandConfig.ctaText) {
            lines.push(brandConfig.ctaText);
          }
          break;
        default:
          break;
      }
    });

    return lines.join("\n\n");
  }

  private getStoryFields(
    product: ProductData,
    brandConfig: BrandConfig,
    layoutPreferences?: LayoutPreferences
  ) {
    const displayPrices = this.normalizePriceDisplay(product);
    const textMaxWidthFactor =
      product.marketplace === "AMAZON" || product.marketplace === "MAGALU"
        ? 0.81
        : 0.9;
    const fields: Array<{
      text: string;
      lines?: string[];
      lineHeight?: number;
      fontSize: number;
      fontWeight: string;
      color: string;
      decoration?: string;
    }> = [];

    const order = layoutPreferences?.storyOrder || [
      "title",
      "price",
      "originalPrice",
      "coupon",
      "customText",
    ];

    order.forEach((field) => {
      switch (field) {
        case "title":
          if (layoutPreferences?.storyShowTitle !== false) {
            const titleLines = this.wrapText(
              product.title,
              Math.round(36 * textMaxWidthFactor)
            );
            fields.push({
              text: titleLines[0] || product.title,
              lines: titleLines,
              lineHeight: 62,
              fontSize: 52,
              fontWeight: "bold",
              color: brandConfig.textColor || "#000000",
            });
          }
          break;
        case "price":
          if (layoutPreferences?.storyShowPrice !== false && displayPrices.price !== null) {
            fields.push({
              text: `R$ ${displayPrices.price.toFixed(2).replace(".", ",")}`,
              fontSize: 72,
              fontWeight: "bold",
              color: brandConfig.priceColor || brandConfig.textColor || "#000000",
            });
          }
          break;
        case "originalPrice":
          if (
            layoutPreferences?.storyShowOriginalPrice !== false &&
            displayPrices.originalPrice !== null
          ) {
            fields.push({
              text: `R$ ${displayPrices.originalPrice.toFixed(2).replace(".", ",")}`,
              fontSize: 40,
              fontWeight: "normal",
              color: brandConfig.textColor || "#000000",
              decoration: "line-through",
            });
          }
          break;
        case "coupon":
          if (
            layoutPreferences?.storyShowCoupon !== false &&
            brandConfig.showCoupon &&
            brandConfig.couponText
          ) {
            fields.push({
              text: `🎟️ ${brandConfig.couponText}`,
              fontSize: 40,
              fontWeight: "bold",
              color: brandConfig.textColor || "#000000",
            });
          }
          break;
        case "customText":
          if (layoutPreferences?.storyShowCustomText !== false && brandConfig.ctaText) {
            fields.push({
              text: brandConfig.ctaText,
              fontSize: 36,
              fontWeight: "bold",
              color: brandConfig.textColor || "#000000",
            });
          }
          break;
        default:
          break;
      }
    });

    return fields;
  }

  private normalizePriceDisplay(product: ProductData): {
    price: number | null;
    originalPrice: number | null;
  } {
    const price = Number.isFinite(product.price) ? product.price : null;
    const originalPrice = Number.isFinite(product.originalPrice ?? NaN)
      ? product.originalPrice!
      : null;

    if (price !== null && originalPrice !== null && price > originalPrice) {
      return { price: originalPrice, originalPrice: null };
    }

    return { price, originalPrice };
  }

  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let currentLine = "";

    words.forEach((word) => {
      const next = currentLine ? `${currentLine} ${word}` : word;
      if (next.length > maxChars && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = next;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length ? lines : [text];
  }
}

export const artGeneratorService = new ArtGeneratorService();

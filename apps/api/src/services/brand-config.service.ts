import { prisma } from '../db/prisma.js';
import { DEFAULT_BRAND_CONFIG, BrandConfigUpdate } from '../validators/brand-config.schema.js';

export class BrandConfigService {
  /**
   * Get brand config for a user
   * Returns defaults if user has no config
   */
  async getConfig(userId: string) {
    const config = await prisma.user_brand_configs.findUnique({
      where: { user_id: userId },
    });

    if (!config) {
      return {
        ...DEFAULT_BRAND_CONFIG,
        userId,
      };
    }

    return {
      userId: config.user_id,
      templateId: config.template_id || DEFAULT_BRAND_CONFIG.templateId,
      bgColor: config.bg_color || DEFAULT_BRAND_CONFIG.bgColor,
      textColor: config.text_color || DEFAULT_BRAND_CONFIG.textColor,
      priceColor: config.price_color || DEFAULT_BRAND_CONFIG.priceColor,
      fontFamily: config.font_family || DEFAULT_BRAND_CONFIG.fontFamily,
      showCoupon: config.show_coupon ?? DEFAULT_BRAND_CONFIG.showCoupon,
      couponText: config.coupon_text || DEFAULT_BRAND_CONFIG.couponText,
      ctaText: config.cta_text || DEFAULT_BRAND_CONFIG.ctaText,
      customImageUrl: config.custom_image_url || DEFAULT_BRAND_CONFIG.customImageUrl,
    };
  }

  /**
   * Update brand config for a user
   * Creates new config if doesn't exist
   */
  async updateConfig(userId: string, data: BrandConfigUpdate) {
    const updateData: any = {};

    if (data.templateId !== undefined) updateData.template_id = data.templateId;
    if (data.bgColor !== undefined) updateData.bg_color = data.bgColor;
    if (data.textColor !== undefined) updateData.text_color = data.textColor;
    if (data.priceColor !== undefined) updateData.price_color = data.priceColor;
    if (data.fontFamily !== undefined) updateData.font_family = data.fontFamily;
    if (data.showCoupon !== undefined) updateData.show_coupon = data.showCoupon;
    if (data.couponText !== undefined) updateData.coupon_text = data.couponText;
    if (data.ctaText !== undefined) updateData.cta_text = data.ctaText;
    if (data.customImageUrl !== undefined) updateData.custom_image_url = data.customImageUrl;

    const config = await prisma.user_brand_configs.upsert({
      where: { user_id: userId },
      update: {
        ...updateData,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        ...updateData,
      },
    });

    return {
      userId: config.user_id,
      templateId: config.template_id,
      bgColor: config.bg_color,
      textColor: config.text_color,
      priceColor: config.price_color,
      fontFamily: config.font_family,
      showCoupon: config.show_coupon,
      couponText: config.coupon_text,
      ctaText: config.cta_text,
      customImageUrl: config.custom_image_url,
    };
  }

  /**
   * Delete brand config for a user (reset to defaults)
   */
  async deleteConfig(userId: string) {
    await prisma.user_brand_configs.delete({
      where: { user_id: userId },
    }).catch(() => {
      // Config doesn't exist, that's fine
    });

    return {
      ...DEFAULT_BRAND_CONFIG,
      userId,
    };
  }
}

export const brandConfigService = new BrandConfigService();

import { prisma } from '../db/prisma.js';

export interface LayoutPreferences {
  // Feed preferences
  feedShowTitle: boolean;
  feedShowDescription: boolean;
  feedShowPrice: boolean;
  feedShowOriginalPrice: boolean;
  feedShowProductUrl: boolean;
  feedShowCoupon: boolean;
  feedShowDisclaimer: boolean;
  feedShowSalesQuantity: boolean;
  feedShowCustomText: boolean;
  feedOrder: string[];

  // Story preferences
  storyShowTitle: boolean;
  storyShowPrice: boolean;
  storyShowOriginalPrice: boolean;
  storyShowCoupon: boolean;
  storyShowCustomText: boolean;
  storyOrder: string[];
}

export interface LayoutPreferencesUpdate extends Partial<LayoutPreferences> {}

export const DEFAULT_LAYOUT_PREFERENCES: LayoutPreferences = {
  // Feed defaults
  feedShowTitle: true,
  feedShowDescription: true,
  feedShowPrice: true,
  feedShowOriginalPrice: true,
  feedShowProductUrl: true,
  feedShowCoupon: true,
  feedShowDisclaimer: false,
  feedShowSalesQuantity: false,
  feedShowCustomText: false,
  feedOrder: [
    'title',
    'description',
    'price',
    'originalPrice',
    'productUrl',
    'coupon',
    'disclaimer',
    'salesQuantity',
    'customText',
  ],

  // Story defaults
  storyShowTitle: true,
  storyShowPrice: true,
  storyShowOriginalPrice: true,
  storyShowCoupon: true,
  storyShowCustomText: false,
  storyOrder: ['title', 'price', 'originalPrice', 'coupon', 'customText'],
};

export class LayoutPreferencesService {
  /**
   * Get layout preferences for a user
   * Returns defaults if user has no preferences
   */
  async getPreferences(userId: string): Promise<LayoutPreferences> {
    const prefs = await prisma.user_layout_preferences.findUnique({
      where: { user_id: userId },
    });

    if (!prefs) {
      return DEFAULT_LAYOUT_PREFERENCES;
    }

    return {
      feedShowTitle: prefs.feed_show_title,
      feedShowDescription: prefs.feed_show_description,
      feedShowPrice: prefs.feed_show_price,
      feedShowOriginalPrice: prefs.feed_show_original_price,
      feedShowProductUrl: prefs.feed_show_product_url,
      feedShowCoupon: prefs.feed_show_coupon,
      feedShowDisclaimer: prefs.feed_show_disclaimer,
      feedShowSalesQuantity: prefs.feed_show_sales_quantity,
      feedShowCustomText: prefs.feed_show_custom_text,
      feedOrder: Array.isArray(prefs.feed_order)
        ? (prefs.feed_order as string[])
        : DEFAULT_LAYOUT_PREFERENCES.feedOrder,

      storyShowTitle: prefs.story_show_title,
      storyShowPrice: prefs.story_show_price,
      storyShowOriginalPrice: prefs.story_show_original_price,
      storyShowCoupon: prefs.story_show_coupon,
      storyShowCustomText: prefs.story_show_custom_text,
      storyOrder: Array.isArray(prefs.story_order)
        ? (prefs.story_order as string[])
        : DEFAULT_LAYOUT_PREFERENCES.storyOrder,
    };
  }

  /**
   * Update layout preferences for a user
   * Creates new preferences if doesn't exist
   */
  async updatePreferences(
    userId: string,
    data: LayoutPreferencesUpdate
  ): Promise<LayoutPreferences> {
    const updateData: any = {};

    // Feed preferences
    if (data.feedShowTitle !== undefined) updateData.feed_show_title = data.feedShowTitle;
    if (data.feedShowDescription !== undefined) updateData.feed_show_description = data.feedShowDescription;
    if (data.feedShowPrice !== undefined) updateData.feed_show_price = data.feedShowPrice;
    if (data.feedShowOriginalPrice !== undefined) updateData.feed_show_original_price = data.feedShowOriginalPrice;
    if (data.feedShowProductUrl !== undefined) updateData.feed_show_product_url = data.feedShowProductUrl;
    if (data.feedShowCoupon !== undefined) updateData.feed_show_coupon = data.feedShowCoupon;
    if (data.feedShowDisclaimer !== undefined) updateData.feed_show_disclaimer = data.feedShowDisclaimer;
    if (data.feedShowSalesQuantity !== undefined) updateData.feed_show_sales_quantity = data.feedShowSalesQuantity;
    if (data.feedShowCustomText !== undefined) updateData.feed_show_custom_text = data.feedShowCustomText;
    if (data.feedOrder !== undefined) updateData.feed_order = data.feedOrder;

    // Story preferences
    if (data.storyShowTitle !== undefined) updateData.story_show_title = data.storyShowTitle;
    if (data.storyShowPrice !== undefined) updateData.story_show_price = data.storyShowPrice;
    if (data.storyShowOriginalPrice !== undefined) updateData.story_show_original_price = data.storyShowOriginalPrice;
    if (data.storyShowCoupon !== undefined) updateData.story_show_coupon = data.storyShowCoupon;
    if (data.storyShowCustomText !== undefined) updateData.story_show_custom_text = data.storyShowCustomText;
    if (data.storyOrder !== undefined) updateData.story_order = data.storyOrder;

    const prefs = await prisma.user_layout_preferences.upsert({
      where: { user_id: userId },
      update: updateData,
      create: {
        user_id: userId,
        ...updateData,
      },
    });

    return {
      feedShowTitle: prefs.feed_show_title,
      feedShowDescription: prefs.feed_show_description,
      feedShowPrice: prefs.feed_show_price,
      feedShowOriginalPrice: prefs.feed_show_original_price,
      feedShowProductUrl: prefs.feed_show_product_url,
      feedShowCoupon: prefs.feed_show_coupon,
      feedShowDisclaimer: prefs.feed_show_disclaimer,
      feedShowSalesQuantity: prefs.feed_show_sales_quantity,
      feedShowCustomText: prefs.feed_show_custom_text,
      feedOrder: Array.isArray(prefs.feed_order)
        ? (prefs.feed_order as string[])
        : DEFAULT_LAYOUT_PREFERENCES.feedOrder,

      storyShowTitle: prefs.story_show_title,
      storyShowPrice: prefs.story_show_price,
      storyShowOriginalPrice: prefs.story_show_original_price,
      storyShowCoupon: prefs.story_show_coupon,
      storyShowCustomText: prefs.story_show_custom_text,
      storyOrder: Array.isArray(prefs.story_order)
        ? (prefs.story_order as string[])
        : DEFAULT_LAYOUT_PREFERENCES.storyOrder,
    };
  }

  /**
   * Reset layout preferences to defaults for a user
   */
  async resetPreferences(userId: string): Promise<LayoutPreferences> {
    await prisma.user_layout_preferences
      .delete({
        where: { user_id: userId },
      })
      .catch(() => {
        // Preferences don't exist, that's fine
      });

    return DEFAULT_LAYOUT_PREFERENCES;
  }
}

export const layoutPreferencesService = new LayoutPreferencesService();

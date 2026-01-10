import { prisma } from '../../db/prisma.js';

export interface PinterestBotConfigData {
  enabled?: boolean;
  autoPublish?: boolean;
  defaultCategory?: string | null;
}

export class PinterestBotConfigService {
  /**
   * Get Pinterest bot config by userId
   */
  static async getByUserId(userId: string) {
    return await prisma.pinterest_bot_configs.findUnique({
      where: { user_id: userId }
    });
  }

  /**
   * Get or create Pinterest bot config for user
   * Creates default config if not exists
   */
  static async getOrCreate(userId: string) {
    let config = await prisma.pinterest_bot_configs.findUnique({
      where: { user_id: userId }
    });

    if (!config) {
      config = await prisma.pinterest_bot_configs.create({
        data: {
          user_id: userId,
          enabled: true,
          auto_publish: true,
          default_category: null
        }
      });
    }

    return config;
  }

  /**
   * Update Pinterest bot config
   */
  static async update(userId: string, data: PinterestBotConfigData) {
    // Get or create config first
    await this.getOrCreate(userId);

    return await prisma.pinterest_bot_configs.update({
      where: { user_id: userId },
      data: {
        enabled: data.enabled,
        auto_publish: data.autoPublish,
        default_category: data.defaultCategory,
        updated_at: new Date()
      }
    });
  }

  /**
   * Check if bot is enabled for user
   */
  static async isEnabled(userId: string): Promise<boolean> {
    const config = await this.getByUserId(userId);
    return config?.enabled ?? true;
  }

  /**
   * Check if auto-publish is enabled for user
   */
  static async isAutoPublishEnabled(userId: string): Promise<boolean> {
    const config = await this.getByUserId(userId);
    return config?.auto_publish ?? true;
  }

  /**
   * Get default category for user
   */
  static async getDefaultCategory(userId: string): Promise<string | null> {
    const config = await this.getByUserId(userId);
    return config?.default_category ?? null;
  }

  /**
   * Delete Pinterest bot config (called when user is deleted or bot is unlinked)
   */
  static async delete(userId: string) {
    return await prisma.pinterest_bot_configs.delete({
      where: { user_id: userId }
    }).catch(() => null); // Ignore error if config doesn't exist
  }
}

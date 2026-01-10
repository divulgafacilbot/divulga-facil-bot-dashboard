import { prisma } from '../../db/prisma.js';
import { generateUniqueSlug } from '../../utils/slug.util.js';

export class PublicPageService {
  /**
   * Get public page settings by slug
   */
  static async getBySlug(slug: string) {
    const settings = await prisma.public_page_settings.findUnique({
      where: { public_slug: slug },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true
          }
        }
      }
    });

    if (!settings) {
      return null;
    }

    // Check if user is active
    if (settings.user.isActive === false) {
      return null;
    }

    return settings;
  }

  /**
   * Get public page settings by userId
   */
  static async getByUserId(userId: string) {
    return await prisma.public_page_settings.findUnique({
      where: { user_id: userId }
    });
  }

  /**
   * Create public page settings (called on signup)
   */
  static async create(userId: string, emailLocalPart: string) {
    const publicSlug = await generateUniqueSlug(emailLocalPart);

    return await prisma.public_page_settings.create({
      data: {
        user_id: userId,
        public_slug: publicSlug,
        display_name: publicSlug
      }
    });
  }

  /**
   * Update public page settings
   */
  static async update(
    userId: string,
    data: {
      display_name?: string;
      header_color?: string;
      title_color?: string;
      header_image_url?: string;
      bio?: string;
    }
  ) {
    return await prisma.public_page_settings.update({
      where: { user_id: userId },
      data: {
        ...data,
        updated_at: new Date()
      }
    });
  }

  /**
   * Check if slug exists (for validation)
   */
  static async slugExists(slug: string): Promise<boolean> {
    const count = await prisma.public_page_settings.count({
      where: { public_slug: slug }
    });
    return count > 0;
  }
}

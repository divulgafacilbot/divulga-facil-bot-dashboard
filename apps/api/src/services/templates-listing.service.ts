import { prisma } from '../db/prisma.js';

export const TEMPLATE_CATEGORIES = [
  'Mercado Livre',
  'Magalu',
  'Shopee',
  'Amazon',
  'Datas especiais',
  'Diversos',
  'Templates Personalizados',
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

interface GetTemplatesOptions {
  userId?: string;
  category?: string;
  includeUserTemplates?: boolean;
}

export class TemplatesListingService {
  static async getAvailableTemplates(options: GetTemplatesOptions = {}) {
    const { userId, category, includeUserTemplates = true } = options;

    const where: any = {
      is_active: true,
    };

    if (category) {
      where.category = category;
    }

    if (includeUserTemplates && userId) {
      where.OR = [
        { owner_user_id: null },
        { owner_user_id: userId },
      ];
    } else {
      where.owner_user_id = null;
    }

    const templates = await prisma.templates.findMany({
      where,
      orderBy: [
        { owner_user_id: 'asc' },
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    return templates;
  }

  static async getTemplatesByCategory(userId?: string) {
    const templates = await this.getAvailableTemplates({
      userId,
      includeUserTemplates: true,
    });

    const grouped: Record<string, any[]> = {};

    for (const category of TEMPLATE_CATEGORIES) {
      grouped[category] = templates.filter((t) => t.category === category);
    }

    return grouped;
  }

  static async getTemplateById(templateId: string, userId?: string) {
    const template = await prisma.templates.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    if (!template.is_active) {
      throw new Error('Template is not active');
    }

    if (template.owner_user_id && template.owner_user_id !== userId) {
      throw new Error('Unauthorized: Cannot access another user\'s template');
    }

    return template;
  }

  static getCategories() {
    return TEMPLATE_CATEGORIES;
  }
}

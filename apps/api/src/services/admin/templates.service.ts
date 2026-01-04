import { prisma } from '../../db/prisma.js';
import fs from 'fs';
import path from 'path';

interface CreateTemplateData {
  name: string;
  story_image: string;
  feed_image: string;
  category: string;
  owner_user_id?: string | null;
}

interface UpdateTemplateData {
  name?: string;
  story_image?: string;
  feed_image?: string;
  category?: string;
  is_active?: boolean;
}

export class AdminTemplatesService {
  static async getAllTemplates(filters: { category?: string; is_active?: boolean } = {}) {
    const where: any = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
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

  static async getTemplateById(templateId: string) {
    const template = await prisma.templates.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    return template;
  }

  static async createTemplate(data: CreateTemplateData) {
    const template = await prisma.templates.create({
      data: {
        name: data.name,
        story_image: data.story_image,
        feed_image: data.feed_image,
        category: data.category,
        owner_user_id: data.owner_user_id || null,
        is_active: true,
      },
    });

    return template;
  }

  static async updateTemplate(templateId: string, data: UpdateTemplateData) {
    const template = await prisma.templates.update({
      where: { id: templateId },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });

    return template;
  }

  static async deleteTemplate(templateId: string) {
    const template = await prisma.templates.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    await prisma.templates.delete({
      where: { id: templateId },
    });

    return { success: true, message: 'Template deleted successfully' };
  }

  static async deactivateTemplate(templateId: string) {
    const template = await prisma.templates.update({
      where: { id: templateId },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    return template;
  }

  static async activateTemplate(templateId: string) {
    const template = await prisma.templates.update({
      where: { id: templateId },
      data: {
        is_active: true,
        updated_at: new Date(),
      },
    });

    return template;
  }

  static async getTemplateStats() {
    const [total, active, byCategory] = await Promise.all([
      prisma.templates.count(),
      prisma.templates.count({ where: { is_active: true } }),
      prisma.templates.groupBy({
        by: ['category'],
        _count: true,
        orderBy: { _count: { category: 'desc' } },
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      byCategory: byCategory.map(({ category, _count }) => ({
        category,
        count: _count,
      })),
    };
  }

  static async importBaseTemplates() {
    const sourceDir = path.resolve(process.cwd(), '../web/public/templates');
    const uploadDir = path.resolve(process.cwd(), 'uploads/templates');
    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Templates folder not found: ${sourceDir}`);
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const files = fs.readdirSync(sourceDir).filter((file) => file.endsWith('.png') || file.endsWith('.jpg'));
    const grouped = new Map<string, { feed?: string; story?: string }>();

    files.forEach((file) => {
      const match = file.match(/^(.*)-(feed|story)\.(png|jpg)$/i);
      if (!match) return;
      const [, name, type] = match;
      const current = grouped.get(name) || {};
      if (type === 'feed') current.feed = file;
      if (type === 'story') current.story = file;
      grouped.set(name, current);
    });

    let imported = 0;
    let skipped = 0;

    for (const [name, pair] of grouped.entries()) {
      if (!pair.feed || !pair.story) continue;
      const existing = await prisma.templates.findFirst({
        where: { name, owner_user_id: null },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const category = this.resolveCategory(name);
      const feedDest = `${name}-feed-${Date.now()}.png`;
      const storyDest = `${name}-story-${Date.now()}.png`;
      fs.copyFileSync(path.join(sourceDir, pair.feed), path.join(uploadDir, feedDest));
      fs.copyFileSync(path.join(sourceDir, pair.story), path.join(uploadDir, storyDest));

      await prisma.templates.create({
        data: {
          name,
          category,
          feed_image: `/uploads/templates/${feedDest}`,
          story_image: `/uploads/templates/${storyDest}`,
          owner_user_id: null,
          is_active: true,
        },
      });
      imported++;
    }

    return { imported, skipped };
  }

  private static resolveCategory(name: string) {
    const lower = name.toLowerCase();
    if (lower.startsWith('amazon')) return 'Amazon';
    if (lower.startsWith('shopee')) return 'Shopee';
    if (lower.startsWith('meli')) return 'Mercado Livre';
    if (lower.startsWith('magalu')) return 'Magalu';
    return 'Diversos';
  }
}

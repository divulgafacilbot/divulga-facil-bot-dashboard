import { prisma } from '../../db/prisma.js';

interface UploadTemplateData {
  userId: string;
  name: string;
  story_image: string;
  feed_image: string;
  category: string;
}

export class UserTemplatesService {
  static async getUserTemplates(userId: string) {
    const templates = await prisma.templates.findMany({
      where: {
        owner_user_id: userId,
        is_active: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return templates;
  }

  static async uploadTemplate(data: UploadTemplateData) {
    const template = await prisma.templates.create({
      data: {
        name: data.name,
        story_image: data.story_image,
        feed_image: data.feed_image,
        category: 'Templates Personalizados',
        owner_user_id: data.userId,
        is_active: true,
      },
    });

    return template;
  }

  static async deleteUserTemplate(userId: string, templateId: string) {
    const template = await prisma.templates.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    if (template.owner_user_id !== userId) {
      throw new Error('Unauthorized: You can only delete your own templates');
    }

    await prisma.templates.delete({
      where: { id: templateId },
    });

    return { success: true, message: 'Template deleted successfully' };
  }

  static async updateUserTemplate(
    userId: string,
    templateId: string,
    data: { name?: string; story_image?: string; feed_image?: string }
  ) {
    const template = await prisma.templates.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    if (template.owner_user_id !== userId) {
      throw new Error('Unauthorized: You can only update your own templates');
    }

    const updated = await prisma.templates.update({
      where: { id: templateId },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });

    return updated;
  }
}

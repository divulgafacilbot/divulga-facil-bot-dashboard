import { Request, Response } from 'express';
import { z } from 'zod';
import path from 'node:path';
import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { prisma } from '../db/prisma.js';

const nameSchema = z.string().min(1).max(120);
const allowedMimeTypes: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');

const toPublicUrl = (req: Request, filePath: string) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}${filePath}`;
};

export class TemplatesController {
  static async list(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const templates = await prisma.user_templates.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      });

      return res.json({
        templates: templates.map((template) => ({
          id: template.id,
          name: template.name,
          type: template.type,
          feedUrl: toPublicUrl(req, template.feed_url),
          storyUrl: toPublicUrl(req, template.story_url),
          source: 'custom',
        })),
      });
    } catch (error) {
      console.error('List templates error:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const name = nameSchema.parse(req.body?.name);

      const files = req.files as
        | Record<string, Express.Multer.File[]>
        | undefined;
      const feedFile = files?.feed?.[0];
      const storyFile = files?.story?.[0];

      if (!feedFile || !storyFile) {
        return res.status(400).json({ error: 'Envie os arquivos de feed e story' });
      }

      const feedExt = allowedMimeTypes[feedFile.mimetype];
      const storyExt = allowedMimeTypes[storyFile.mimetype];

      if (!feedExt || !storyExt) {
        return res.status(400).json({ error: 'Formato de arquivo não suportado' });
      }

      const templateId = crypto.randomUUID();
      const templateDir = path.join(
        UPLOADS_ROOT,
        'templates',
        userId,
        templateId
      );

      await mkdir(templateDir, { recursive: true });

      const feedFilename = `feed${feedExt}`;
      const storyFilename = `story${storyExt}`;

      await writeFile(path.join(templateDir, feedFilename), feedFile.buffer);
      await writeFile(path.join(templateDir, storyFilename), storyFile.buffer);

      const feedPath = `/uploads/templates/${userId}/${templateId}/${feedFilename}`;
      const storyPath = `/uploads/templates/${userId}/${templateId}/${storyFilename}`;

      const template = await prisma.user_templates.create({
        data: {
          id: templateId,
          user_id: userId,
          name,
          feed_url: feedPath,
          story_url: storyPath,
          type: 'custom',
        },
      });

      return res.status(201).json({
        template: {
          id: template.id,
          name: template.name,
          type: template.type,
          feedUrl: toPublicUrl(req, template.feed_url),
          storyUrl: toPublicUrl(req, template.story_url),
          source: 'custom',
        },
      });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ error: 'Nome do template inválido' });
      }

      console.error('Create template error:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const templateId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const template = await prisma.user_templates.findFirst({
        where: { id: templateId, user_id: userId },
      });

      if (!template) {
        return res.status(404).json({ error: 'Template não encontrado' });
      }

      const name = req.body?.name ? nameSchema.parse(req.body.name) : template.name;

      const files = req.files as
        | Record<string, Express.Multer.File[]>
        | undefined;
      const feedFile = files?.feed?.[0];
      const storyFile = files?.story?.[0];

      const updatedFields: {
        name: string;
        feed_url: string;
        story_url: string;
      } = {
        name,
        feed_url: template.feed_url,
        story_url: template.story_url,
      };

      const templateDir = path.join(
        UPLOADS_ROOT,
        'templates',
        userId,
        templateId
      );
      await mkdir(templateDir, { recursive: true });

      if (feedFile) {
        const feedExt = allowedMimeTypes[feedFile.mimetype];
        if (!feedExt) {
          return res.status(400).json({ error: 'Formato de feed não suportado' });
        }
        const feedFilename = `feed${feedExt}`;
        await writeFile(path.join(templateDir, feedFilename), feedFile.buffer);
        updatedFields.feed_url = `/uploads/templates/${userId}/${templateId}/${feedFilename}`;
      }

      if (storyFile) {
        const storyExt = allowedMimeTypes[storyFile.mimetype];
        if (!storyExt) {
          return res.status(400).json({ error: 'Formato de story não suportado' });
        }
        const storyFilename = `story${storyExt}`;
        await writeFile(path.join(templateDir, storyFilename), storyFile.buffer);
        updatedFields.story_url = `/uploads/templates/${userId}/${templateId}/${storyFilename}`;
      }

      const updatedTemplate = await prisma.user_templates.update({
        where: { id: templateId },
        data: updatedFields,
      });

      return res.json({
        template: {
          id: updatedTemplate.id,
          name: updatedTemplate.name,
          type: updatedTemplate.type,
          feedUrl: toPublicUrl(req, updatedTemplate.feed_url),
          storyUrl: toPublicUrl(req, updatedTemplate.story_url),
          source: 'custom',
        },
      });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ error: 'Nome do template inválido' });
      }
      console.error('Update template error:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (ids.length === 0) {
        return res.status(400).json({ error: 'Nenhum template selecionado' });
      }

      const deleted = await prisma.user_templates.deleteMany({
        where: {
          user_id: userId,
          id: { in: ids },
        },
      });

      return res.json({ deleted: deleted.count });
    } catch (error) {
      console.error('Delete templates error:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

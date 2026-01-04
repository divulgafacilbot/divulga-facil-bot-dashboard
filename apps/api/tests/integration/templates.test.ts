import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server.js';

describe('Templates Module Tests', () => {
  let adminToken: string;

  const adminCredentials = {
    email: 'divulgafacilbot@gmail.com',
    password: 'DivulgaFacil123',
  };

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const res = await request(app)
      .post('/api/admin/auth/login')
      .send(adminCredentials);

    adminToken = res.body.token;
  });

  describe('Public Templates Routes', () => {
    it('should list all available templates', async () => {
      const res = await request(app)
        .get('/api/templates')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should get template categories', async () => {
      const res = await request(app)
        .get('/api/templates/categories')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data).toContain('Mercado Livre');
      expect(res.body.data).toContain('Amazon');
      expect(res.body.data).toContain('Shopee');
    });

    it('should get templates grouped by category', async () => {
      const res = await request(app)
        .get('/api/templates/by-category')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('Mercado Livre');
      expect(res.body.data).toHaveProperty('Amazon');
      expect(res.body.data).toHaveProperty('Shopee');
    });

    it('should filter templates by category', async () => {
      const res = await request(app)
        .get('/api/templates?category=Amazon')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);

      res.body.data.forEach((template: any) => {
        expect(template.category).toBe('Amazon');
      });
    });
  });

  describe('Admin Templates Routes', () => {
    it('should get all templates as admin', async () => {
      const res = await request(app)
        .get('/api/admin/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should get template statistics', async () => {
      const res = await request(app)
        .get('/api/admin/templates/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('active');
      expect(res.body.data).toHaveProperty('inactive');
      expect(res.body.data).toHaveProperty('byCategory');
      expect(res.body.data.byCategory).toBeInstanceOf(Array);
    });

    it('should require admin auth for admin routes', async () => {
      await request(app)
        .get('/api/admin/templates')
        .expect(401);

      await request(app)
        .get('/api/admin/templates/stats')
        .expect(401);
    });

    it('should deactivate and activate templates', async () => {
      const templatesRes = await request(app)
        .get('/api/admin/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const template = templatesRes.body.data[0];
      if (!template) {
        console.log('No templates available for test');
        return;
      }

      const deactivateRes = await request(app)
        .patch(`/api/admin/templates/${template.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deactivateRes.body.success).toBe(true);
      expect(deactivateRes.body.data.is_active).toBe(false);

      const activateRes = await request(app)
        .patch(`/api/admin/templates/${template.id}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(activateRes.body.success).toBe(true);
      expect(activateRes.body.data.is_active).toBe(true);
    });
  });

  describe('Template Data Structure', () => {
    it('should return templates with correct fields', async () => {
      const res = await request(app)
        .get('/api/templates')
        .expect(200);

      if (res.body.data.length > 0) {
        const template = res.body.data[0];

        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('story_image');
        expect(template).toHaveProperty('feed_image');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('owner_user_id');
        expect(template).toHaveProperty('is_active');
        expect(template).toHaveProperty('created_at');
        expect(template).toHaveProperty('updated_at');
      }
    });
  });

  describe('Template Categories', () => {
    const expectedCategories = [
      'Mercado Livre',
      'Magalu',
      'Shopee',
      'Amazon',
      'Datas especiais',
      'Diversos',
      'Templates Personalizados',
    ];

    it('should have all expected categories available', async () => {
      const res = await request(app)
        .get('/api/templates/categories')
        .expect(200);

      expectedCategories.forEach((category) => {
        expect(res.body.data).toContain(category);
      });
    });
  });
});

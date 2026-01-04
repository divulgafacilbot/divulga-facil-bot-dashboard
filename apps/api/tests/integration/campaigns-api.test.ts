import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/server.js';
import { prisma } from '../../src/db/prisma.js';

/**
 * Promotional Campaigns API Integration Tests
 *
 * Tests both admin and user-facing campaign endpoints including:
 * - Campaign CRUD operations (admin)
 * - File upload validation
 * - Pagination and search
 * - ZIP download generation
 * - Download tracking
 * - Authentication and authorization
 */

describe('Campaigns API Integration Tests', () => {
  let adminToken: string;
  let testCampaignId: string;
  let testUserId: string;
  let userToken: string;

  // Admin credentials from seed
  const adminCredentials = {
    email: 'divulgafacilbot@gmail.com',
    password: 'admin123',
  };

  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Login as admin
    const adminRes = await request(app)
      .post('/api/admin/auth/login')
      .send(adminCredentials);

    adminToken = adminRes.body.token;

    // Create or find test user for user endpoints
    let testUser = await prisma.user.findUnique({
      where: { email: 'testcampaigns@example.com' },
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'testcampaigns@example.com',
          passwordHash: 'hashed_password',
          isActive: true,
          emailVerified: true,
        },
      });
    }
    testUserId = testUser.id;

    // Create a proper user JWT token
    const jwtSecret = process.env.JWT_SECRET || '11754665eebb31087a53ee8d05f66b24a6052e1e62f368eef42973e140c521e4';
    userToken = jwt.sign(
      {
        userId: testUser.id,
        email: testUser.email,
        role: 'USER'
      },
      jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // Clean up test campaigns after each test
    if (testCampaignId) {
      try {
        await prisma.campaigns.delete({
          where: { id: testCampaignId },
        });
      } catch (error) {
        // Campaign might already be deleted in the test
      }
      testCampaignId = '';
    }
  });

  describe('Admin Endpoints', () => {
    describe('POST /api/admin/campaigns', () => {
      it('should create campaign with valid data and files', async () => {
        const res = await request(app)
          .post('/api/admin/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('name', 'Test Campaign')
          .field('price', '99.99')
          .field('product_url', 'https://example.com/product')
          .attach('main_video', Buffer.from('fake video content'), {
            filename: 'video.mp4',
            contentType: 'video/mp4',
          })
          .attach('assets', Buffer.from('fake image content'), {
            filename: 'image1.jpg',
            contentType: 'image/jpeg',
          })
          .attach('assets', Buffer.from('fake image content 2'), {
            filename: 'image2.png',
            contentType: 'image/png',
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Test Campaign');
        expect(res.body.price).toBe(99.99);
        expect(res.body.product_url).toBe('https://example.com/product');
        expect(res.body).toHaveProperty('main_video_url');
        expect(res.body.assets).toBeInstanceOf(Array);
        expect(res.body.assets.length).toBeGreaterThanOrEqual(2);

        testCampaignId = res.body.id;
      });

      it('should return 400 for missing required name field', async () => {
        const res = await request(app)
          .post('/api/admin/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('price', '99.99')
          .field('product_url', 'https://example.com/product')
          .attach('main_video', Buffer.from('fake video content'), {
            filename: 'video.mp4',
            contentType: 'video/mp4',
          });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('Validation failed');
      });

      it('should return 400 for missing required price field', async () => {
        const res = await request(app)
          .post('/api/admin/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('name', 'Test Campaign')
          .field('product_url', 'https://example.com/product')
          .attach('main_video', Buffer.from('fake video content'), {
            filename: 'video.mp4',
            contentType: 'video/mp4',
          });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
      });

      it('should return 400 for missing required product_url field', async () => {
        const res = await request(app)
          .post('/api/admin/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('name', 'Test Campaign')
          .field('price', '99.99')
          .attach('main_video', Buffer.from('fake video content'), {
            filename: 'video.mp4',
            contentType: 'video/mp4',
          });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
      });

      it('should return 400 for invalid product_url format', async () => {
        const res = await request(app)
          .post('/api/admin/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('name', 'Test Campaign')
          .field('price', '99.99')
          .field('product_url', 'not-a-valid-url')
          .attach('main_video', Buffer.from('fake video content'), {
            filename: 'video.mp4',
            contentType: 'video/mp4',
          });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
      });

      it('should return 400 for missing main_video file', async () => {
        const res = await request(app)
          .post('/api/admin/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('name', 'Test Campaign')
          .field('price', '99.99')
          .field('product_url', 'https://example.com/product');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        // Error can be either "File validation failed" or "Main video is required"
        expect(['File validation failed', 'Main video is required']).toContain(res.body.error);
      });

      it('should return 400 for invalid main_video file type', async () => {
        const res = await request(app)
          .post('/api/admin/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('name', 'Test Campaign')
          .field('price', '99.99')
          .field('product_url', 'https://example.com/product')
          .attach('main_video', Buffer.from('fake text content'), {
            filename: 'document.txt',
            contentType: 'text/plain',
          });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('File validation failed');
      });

      it('should return 400 for invalid asset file types', async () => {
        const res = await request(app)
          .post('/api/admin/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('name', 'Test Campaign')
          .field('price', '99.99')
          .field('product_url', 'https://example.com/product')
          .attach('main_video', Buffer.from('fake video content'), {
            filename: 'video.mp4',
            contentType: 'video/mp4',
          })
          .attach('assets', Buffer.from('fake text content'), {
            filename: 'document.pdf',
            contentType: 'application/pdf',
          });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('File validation failed');
      });

      it('should return 401 without admin authentication', async () => {
        const res = await request(app)
          .post('/api/admin/campaigns')
          .field('name', 'Test Campaign')
          .field('price', '99.99')
          .field('product_url', 'https://example.com/product')
          .attach('main_video', Buffer.from('fake video content'), {
            filename: 'video.mp4',
            contentType: 'video/mp4',
          });

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/admin/campaigns', () => {
      beforeAll(async () => {
        // Create test campaign for listing tests
        const campaign = await prisma.campaigns.create({
          data: {
            name: 'List Test Campaign',
            price: 49.99,
            product_url: 'https://example.com/list-test',
            main_video_url: 'https://storage.example.com/video.mp4',
          },
        });
        testCampaignId = campaign.id;
      });

      it('should return all campaigns', async () => {
        const res = await request(app)
          .get('/api/admin/campaigns')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('campaigns');
        expect(res.body.campaigns).toBeInstanceOf(Array);
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('page');
        expect(res.body).toHaveProperty('limit');

        if (res.body.campaigns.length > 0) {
          const campaign = res.body.campaigns[0];
          expect(campaign).toHaveProperty('id');
          expect(campaign).toHaveProperty('name');
          expect(campaign).toHaveProperty('price');
          expect(campaign).toHaveProperty('product_url');
          expect(campaign).toHaveProperty('main_video_url');
          expect(campaign).toHaveProperty('asset_count');
        }
      });

      it('should support pagination', async () => {
        const res = await request(app)
          .get('/api/admin/campaigns')
          .query({ page: 1, limit: 5 })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(5);
        expect(res.body.campaigns.length).toBeLessThanOrEqual(5);
      });

      it('should support search filter by name', async () => {
        const res = await request(app)
          .get('/api/admin/campaigns')
          .query({ search: 'List Test' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.campaigns).toBeInstanceOf(Array);

        if (res.body.campaigns.length > 0) {
          const foundCampaign = res.body.campaigns.find(
            (c: any) => c.name === 'List Test Campaign'
          );
          expect(foundCampaign).toBeDefined();
        }
      });

      it('should support sorting', async () => {
        const res = await request(app)
          .get('/api/admin/campaigns')
          .query({ sortBy: 'name', sortOrder: 'asc' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.campaigns).toBeInstanceOf(Array);
      });

      it('should return 401 without admin authentication', async () => {
        const res = await request(app)
          .get('/api/admin/campaigns');

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/admin/campaigns/:id', () => {
      beforeAll(async () => {
        // Create test campaign with assets
        const campaign = await prisma.campaigns.create({
          data: {
            name: 'Detail Test Campaign',
            price: 79.99,
            product_url: 'https://example.com/detail-test',
            main_video_url: 'https://storage.example.com/video.mp4',
          },
        });

        await prisma.campaign_assets.createMany({
          data: [
            {
              campaign_id: campaign.id,
              asset_url: 'https://storage.example.com/image1.jpg',
              asset_type: 'image',
            },
            {
              campaign_id: campaign.id,
              asset_url: 'https://storage.example.com/video2.mp4',
              asset_type: 'video',
            },
          ],
        });

        testCampaignId = campaign.id;
      });

      it('should return campaign with assets', async () => {
        const res = await request(app)
          .get(`/api/admin/campaigns/${testCampaignId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id', testCampaignId);
        expect(res.body).toHaveProperty('name', 'Detail Test Campaign');
        expect(res.body).toHaveProperty('price', 79.99);
        expect(res.body).toHaveProperty('product_url');
        expect(res.body).toHaveProperty('main_video_url');
        expect(res.body).toHaveProperty('assets');
        expect(res.body.assets).toBeInstanceOf(Array);
        expect(res.body.assets.length).toBe(2);

        res.body.assets.forEach((asset: any) => {
          expect(asset).toHaveProperty('id');
          expect(asset).toHaveProperty('asset_url');
          expect(asset).toHaveProperty('asset_type');
          expect(['image', 'video']).toContain(asset.asset_type);
        });
      });

      it('should return 404 for non-existent campaign', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await request(app)
          .get(`/api/admin/campaigns/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('Campaign not found');
      });

      it('should return 401 without admin authentication', async () => {
        const res = await request(app)
          .get(`/api/admin/campaigns/${testCampaignId}`);

        expect(res.status).toBe(401);
      });
    });

    describe('DELETE /api/admin/campaigns/:id', () => {
      it('should delete campaign successfully', async () => {
        // Create a campaign to delete
        const campaign = await prisma.campaigns.create({
          data: {
            name: 'Delete Test Campaign',
            price: 39.99,
            product_url: 'https://example.com/delete-test',
            main_video_url: 'https://storage.example.com/video.mp4',
          },
        });

        const res = await request(app)
          .delete(`/api/admin/campaigns/${campaign.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(204);

        // Verify campaign is deleted
        const deletedCampaign = await prisma.campaigns.findUnique({
          where: { id: campaign.id },
        });
        expect(deletedCampaign).toBeNull();
      });

      it('should delete campaign and cascade delete assets', async () => {
        // Create campaign with assets
        const campaign = await prisma.campaigns.create({
          data: {
            name: 'Cascade Delete Test',
            price: 59.99,
            product_url: 'https://example.com/cascade-test',
            main_video_url: 'https://storage.example.com/video.mp4',
          },
        });

        await prisma.campaign_assets.create({
          data: {
            campaign_id: campaign.id,
            asset_url: 'https://storage.example.com/asset.jpg',
            asset_type: 'image',
          },
        });

        const res = await request(app)
          .delete(`/api/admin/campaigns/${campaign.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(204);

        // Verify assets are deleted
        const assets = await prisma.campaign_assets.findMany({
          where: { campaign_id: campaign.id },
        });
        expect(assets.length).toBe(0);
      });

      it('should return 404 for non-existent campaign', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await request(app)
          .delete(`/api/admin/campaigns/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('Campaign not found');
      });

      it('should return 401 without admin authentication', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await request(app)
          .delete(`/api/admin/campaigns/${fakeId}`);

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/admin/campaigns/:id/download', () => {
      beforeAll(async () => {
        // Create test campaign for download
        const campaign = await prisma.campaigns.create({
          data: {
            name: 'Download Test Campaign',
            price: 89.99,
            product_url: 'https://example.com/download-test',
            main_video_url: 'https://storage.example.com/video.mp4',
          },
        });
        testCampaignId = campaign.id;
      });

      it('should return ZIP file with correct headers', async () => {
        const res = await request(app)
          .get(`/api/admin/campaigns/${testCampaignId}/download`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBe('application/zip');
        expect(res.headers['content-disposition']).toContain('attachment');
        expect(res.headers['content-disposition']).toContain('.zip');
      });

      it('should return 404 for non-existent campaign', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await request(app)
          .get(`/api/admin/campaigns/${fakeId}/download`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('Campaign not found');
      });

      it('should return 401 without admin authentication', async () => {
        const res = await request(app)
          .get(`/api/admin/campaigns/${testCampaignId}/download`);

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/admin/campaigns/stats', () => {
      it('should return stats object with correct properties', async () => {
        const res = await request(app)
          .get('/api/admin/campaigns/stats')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('total_campaigns');
        expect(res.body).toHaveProperty('total_assets');
        expect(res.body).toHaveProperty('total_downloads');
        expect(res.body).toHaveProperty('avg_assets_per_campaign');

        expect(typeof res.body.total_campaigns).toBe('number');
        expect(typeof res.body.total_assets).toBe('number');
        expect(typeof res.body.total_downloads).toBe('number');
        expect(typeof res.body.avg_assets_per_campaign).toBe('number');

        expect(res.body.total_campaigns).toBeGreaterThanOrEqual(0);
        expect(res.body.total_assets).toBeGreaterThanOrEqual(0);
        expect(res.body.total_downloads).toBeGreaterThanOrEqual(0);
        expect(res.body.avg_assets_per_campaign).toBeGreaterThanOrEqual(0);
      });

      it('should return 401 without admin authentication', async () => {
        const res = await request(app)
          .get('/api/admin/campaigns/stats');

        expect(res.status).toBe(401);
      });
    });
  });

  describe('User Endpoints', () => {
    describe('GET /api/user/campaigns', () => {
      beforeAll(async () => {
        // Create test campaign for user listing
        const campaign = await prisma.campaigns.create({
          data: {
            name: 'User List Test Campaign',
            price: 69.99,
            product_url: 'https://example.com/user-list-test',
            main_video_url: 'https://storage.example.com/video.mp4',
          },
        });
        testCampaignId = campaign.id;
      });

      it('should return available campaigns for authenticated user', async () => {
        const res = await request(app)
          .get('/api/user/campaigns')
          .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Array);

        if (res.body.length > 0) {
          const campaign = res.body[0];
          expect(campaign).toHaveProperty('id');
          expect(campaign).toHaveProperty('name');
          expect(campaign).toHaveProperty('price');
          expect(campaign).toHaveProperty('product_url');
          expect(campaign).toHaveProperty('main_video_url');
        }
      });

      it('should return 401 without user authentication', async () => {
        const res = await request(app)
          .get('/api/user/campaigns');

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/user/campaigns/:id/download', () => {
      beforeAll(async () => {
        // Create test campaign for user download
        const campaign = await prisma.campaigns.create({
          data: {
            name: 'User Download Test Campaign',
            price: 99.99,
            product_url: 'https://example.com/user-download-test',
            main_video_url: 'https://storage.example.com/video.mp4',
          },
        });
        testCampaignId = campaign.id;
      });

      it('should return ZIP file and track download', async () => {
        const res = await request(app)
          .get(`/api/user/campaigns/${testCampaignId}/download`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBe('application/zip');
        expect(res.headers['content-disposition']).toContain('attachment');
        expect(res.headers['content-disposition']).toContain('.zip');

        // Verify download was tracked
        const downloads = await prisma.campaign_downloads.findMany({
          where: {
            campaign_id: testCampaignId,
            user_id: testUserId,
          },
        });
        expect(downloads.length).toBeGreaterThan(0);
      });

      it('should return 404 for non-existent campaign', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await request(app)
          .get(`/api/user/campaigns/${fakeId}/download`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('Campaign not found');
      });

      it('should return 401 without user authentication', async () => {
        const res = await request(app)
          .get(`/api/user/campaigns/${testCampaignId}/download`);

        expect(res.status).toBe(401);
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate price is positive number', async () => {
      const res = await request(app)
        .post('/api/admin/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Test Campaign')
        .field('price', '-10.00')
        .field('product_url', 'https://example.com/product')
        .attach('main_video', Buffer.from('fake video content'), {
          filename: 'video.mp4',
          contentType: 'video/mp4',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should validate price has at most 2 decimal places', async () => {
      const res = await request(app)
        .post('/api/admin/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Test Campaign')
        .field('price', '99.999')
        .field('product_url', 'https://example.com/product')
        .attach('main_video', Buffer.from('fake video content'), {
          filename: 'video.mp4',
          contentType: 'video/mp4',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should validate name is not empty', async () => {
      const res = await request(app)
        .post('/api/admin/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', '')
        .field('price', '99.99')
        .field('product_url', 'https://example.com/product')
        .attach('main_video', Buffer.from('fake video content'), {
          filename: 'video.mp4',
          contentType: 'video/mp4',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should validate product_url is valid URL', async () => {
      const res = await request(app)
        .post('/api/admin/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Test Campaign')
        .field('price', '99.99')
        .field('product_url', 'invalid-url')
        .attach('main_video', Buffer.from('fake video content'), {
          filename: 'video.mp4',
          contentType: 'video/mp4',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle campaign creation without optional assets', async () => {
      const res = await request(app)
        .post('/api/admin/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'No Assets Campaign')
        .field('price', '49.99')
        .field('product_url', 'https://example.com/no-assets')
        .attach('main_video', Buffer.from('fake video content'), {
          filename: 'video.mp4',
          contentType: 'video/mp4',
        });

      expect(res.status).toBe(201);
      expect(res.body.assets).toBeInstanceOf(Array);
      expect(res.body.assets.length).toBe(0);

      testCampaignId = res.body.id;
    });

    it('should handle pagination with page beyond available data', async () => {
      const res = await request(app)
        .get('/api/admin/campaigns')
        .query({ page: 999, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.campaigns).toBeInstanceOf(Array);
      expect(res.body.page).toBe(999);
    });

    it('should handle search with no results', async () => {
      const res = await request(app)
        .get('/api/admin/campaigns')
        .query({ search: 'nonexistentcampaignname12345' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.campaigns).toBeInstanceOf(Array);
      expect(res.body.campaigns.length).toBe(0);
    });

    it('should handle multiple video assets', async () => {
      const res = await request(app)
        .post('/api/admin/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Multiple Videos Campaign')
        .field('price', '149.99')
        .field('product_url', 'https://example.com/multi-video')
        .attach('main_video', Buffer.from('fake video content'), {
          filename: 'main.mp4',
          contentType: 'video/mp4',
        })
        .attach('assets', Buffer.from('fake video content 2'), {
          filename: 'extra1.mp4',
          contentType: 'video/mp4',
        })
        .attach('assets', Buffer.from('fake video content 3'), {
          filename: 'extra2.mov',
          contentType: 'video/quicktime',
        });

      expect(res.status).toBe(201);
      expect(res.body.assets).toBeInstanceOf(Array);
      expect(res.body.assets.length).toBe(2);
      expect(res.body.assets.every((a: any) => a.asset_type === 'video')).toBe(true);

      testCampaignId = res.body.id;
    });

    it('should handle mixed image and video assets', async () => {
      const res = await request(app)
        .post('/api/admin/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Mixed Assets Campaign')
        .field('price', '129.99')
        .field('product_url', 'https://example.com/mixed-assets')
        .attach('main_video', Buffer.from('fake video content'), {
          filename: 'main.mp4',
          contentType: 'video/mp4',
        })
        .attach('assets', Buffer.from('fake image content'), {
          filename: 'image1.jpg',
          contentType: 'image/jpeg',
        })
        .attach('assets', Buffer.from('fake video content 2'), {
          filename: 'video2.mp4',
          contentType: 'video/mp4',
        })
        .attach('assets', Buffer.from('fake image content 2'), {
          filename: 'image2.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(201);
      expect(res.body.assets).toBeInstanceOf(Array);
      expect(res.body.assets.length).toBe(3);

      const imageAssets = res.body.assets.filter((a: any) => a.asset_type === 'image');
      const videoAssets = res.body.assets.filter((a: any) => a.asset_type === 'video');

      expect(imageAssets.length).toBe(2);
      expect(videoAssets.length).toBe(1);

      testCampaignId = res.body.id;
    });
  });
});

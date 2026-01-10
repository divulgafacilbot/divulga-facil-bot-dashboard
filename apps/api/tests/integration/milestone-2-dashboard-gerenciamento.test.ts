import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

/**
 * Integration tests for Milestone 2: Dashboard de Gerenciamento
 *
 * Tests:
 * - Telegram bot linking with 4 bots (ARTS, DOWNLOAD, PINTEREST, SUGGESTION)
 * - Pinterest settings management
 * - Manual card CRUD operations
 * - Analytics endpoints
 */

describe('Milestone 2: Dashboard de Gerenciamento - Integration Tests', () => {
  let testUserId: string;
  let authToken: string;
  let authCookie: string;

  beforeAll(async () => {
    // Create test user
    const testUser = await prisma.users.create({
      data: {
        email: 'milestone2-test@example.com',
        password_hash: 'hashed_password',
        role: 'USER',
        is_active: true,
      },
    });

    testUserId = testUser.id;

    // Generate auth token
    authToken = jwt.sign(
      { id: testUserId, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    authCookie = `token=${authToken}`;

    // Create public page settings
    await prisma.public_page_settings.create({
      data: {
        user_id: testUserId,
        public_slug: 'milestone2-test-slug',
        display_name: 'Test User',
        header_color: '#FF006B',
        bio: 'Test bio',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.public_cards.deleteMany({ where: { user_id: testUserId } });
    await prisma.telegram_link_tokens.deleteMany({ where: { user_id: testUserId } });
    await prisma.analytics_events.deleteMany({ where: { user_id: testUserId } });
    await prisma.public_page_settings.deleteMany({ where: { user_id: testUserId } });
    await prisma.users.delete({ where: { id: testUserId } });
  });

  beforeEach(async () => {
    // Clean tokens between tests
    await prisma.telegram_link_tokens.deleteMany({ where: { user_id: testUserId } });
    await prisma.public_cards.deleteMany({ where: { user_id: testUserId } });
  });

  describe('POST /api/telegram/generate-link', () => {
    it('should generate token for ARTS bot', async () => {
      const response = await request(app)
        .post('/api/telegram/generate-link')
        .set('Cookie', authCookie)
        .send({ botType: 'ARTS' })
        .expect(200);

      expect(response.body).toHaveProperty('link');
      expect(response.body.link).toHaveProperty('token');
      expect(response.body.link.token).toHaveLength(10);
      expect(response.body.link.botType).toBe('ARTS');
      expect(response.body.link.botName).toBe('Bot de Artes');
      expect(response.body.link.telegramHandle).toBe('@DivulgaFacilArtesBot');
    });

    it('should generate token for DOWNLOAD bot', async () => {
      const response = await request(app)
        .post('/api/telegram/generate-link')
        .set('Cookie', authCookie)
        .send({ botType: 'DOWNLOAD' })
        .expect(200);

      expect(response.body.link.botType).toBe('DOWNLOAD');
      expect(response.body.link.botName).toBe('Bot de Download');
    });

    it('should generate token for PINTEREST bot', async () => {
      const response = await request(app)
        .post('/api/telegram/generate-link')
        .set('Cookie', authCookie)
        .send({ botType: 'PINTEREST' })
        .expect(200);

      expect(response.body.link.botType).toBe('PINTEREST');
      expect(response.body.link.botName).toBe('Bot de Pinterest');
      expect(response.body.link.telegramHandle).toBe('@DivulgaFacilPinterestBot');
    });

    it('should generate token for SUGGESTION bot', async () => {
      const response = await request(app)
        .post('/api/telegram/generate-link')
        .set('Cookie', authCookie)
        .send({ botType: 'SUGGESTION' })
        .expect(200);

      expect(response.body.link.botType).toBe('SUGGESTION');
      expect(response.body.link.botName).toBe('Bot de Sugestões');
      expect(response.body.link.telegramHandle).toBe('@DivulgaFacilSugestaoBot');
    });

    it('should reject invalid bot type', async () => {
      await request(app)
        .post('/api/telegram/generate-link')
        .set('Cookie', authCookie)
        .send({ botType: 'INVALID_BOT' })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/telegram/generate-link')
        .send({ botType: 'ARTS' })
        .expect(401);
    });

    it('should generate unique tokens for same user and bot type', async () => {
      const response1 = await request(app)
        .post('/api/telegram/generate-link')
        .set('Cookie', authCookie)
        .send({ botType: 'ARTS' })
        .expect(200);

      const response2 = await request(app)
        .post('/api/telegram/generate-link')
        .set('Cookie', authCookie)
        .send({ botType: 'ARTS' })
        .expect(200);

      expect(response1.body.link.token).not.toBe(response2.body.link.token);
    });
  });

  describe('GET /api/telegram/linked-bots', () => {
    it('should return empty array when no bots linked', async () => {
      const response = await request(app)
        .get('/api/telegram/linked-bots')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.bots).toEqual([]);
    });

    it('should return linked bots', async () => {
      // Create telegram bot links
      await prisma.telegram_bot_links.createMany({
        data: [
          { user_id: testUserId, telegram_user_id: 'tg-123', bot_type: 'ARTS' },
          { user_id: testUserId, telegram_user_id: 'tg-456', bot_type: 'PINTEREST' },
        ],
      });

      const response = await request(app)
        .get('/api/telegram/linked-bots')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.bots).toHaveLength(2);
      expect(response.body.bots.map((b: any) => b.botType)).toContain('ARTS');
      expect(response.body.bots.map((b: any) => b.botType)).toContain('PINTEREST');

      // Cleanup
      await prisma.telegram_bot_links.deleteMany({ where: { user_id: testUserId } });
    });
  });

  describe('GET /api/telegram/bot-configs', () => {
    it('should return all 4 bot configurations', async () => {
      const response = await request(app)
        .get('/api/telegram/bot-configs')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.configs).toHaveLength(4);
      expect(response.body.configs.map((c: any) => c.botType)).toContain('ARTS');
      expect(response.body.configs.map((c: any) => c.botType)).toContain('DOWNLOAD');
      expect(response.body.configs.map((c: any) => c.botType)).toContain('PINTEREST');
      expect(response.body.configs.map((c: any) => c.botType)).toContain('SUGGESTION');
    });
  });

  describe('GET /api/pinterest/settings', () => {
    it('should return user public page settings', async () => {
      const response = await request(app)
        .get('/api/pinterest/settings')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.settings).toHaveProperty('display_name', 'Test User');
      expect(response.body.settings).toHaveProperty('header_color', '#FF006B');
      expect(response.body.settings).toHaveProperty('public_slug');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/pinterest/settings').expect(401);
    });
  });

  describe('PATCH /api/pinterest/settings', () => {
    it('should update display name', async () => {
      const response = await request(app)
        .patch('/api/pinterest/settings')
        .set('Cookie', authCookie)
        .send({ displayName: 'New Display Name' })
        .expect(200);

      expect(response.body.settings.display_name).toBe('New Display Name');
    });

    it('should update header color', async () => {
      const response = await request(app)
        .patch('/api/pinterest/settings')
        .set('Cookie', authCookie)
        .send({ headerColor: '#00FF00' })
        .expect(200);

      expect(response.body.settings.header_color).toBe('#00FF00');
    });

    it('should update bio', async () => {
      const newBio = 'This is my new bio with detailed information.';
      const response = await request(app)
        .patch('/api/pinterest/settings')
        .set('Cookie', authCookie)
        .send({ bio: newBio })
        .expect(200);

      expect(response.body.settings.bio).toBe(newBio);
    });

    it('should reject bio longer than 500 characters', async () => {
      const longBio = 'a'.repeat(501);
      await request(app)
        .patch('/api/pinterest/settings')
        .set('Cookie', authCookie)
        .send({ bio: longBio })
        .expect(400);
    });
  });

  describe('POST /api/pinterest/cards', () => {
    it('should create a manual card with image', async () => {
      // Create a test image buffer (1x1 white PNG)
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64'
      );

      const response = await request(app)
        .post('/api/pinterest/cards')
        .set('Cookie', authCookie)
        .field(
          'data',
          JSON.stringify({
            title: 'Test Product',
            price: 'R$ 99,90',
            originalPrice: 'R$ 149,90',
            description: 'Test description',
            affiliateUrl: 'https://example.com/product',
            marketplace: 'MERCADO_LIVRE',
            coupon: 'SAVE10',
            category: 'Eletrônicos',
          })
        )
        .attach('image', testImageBuffer, 'test-image.png')
        .expect(201);

      expect(response.body.card).toHaveProperty('id');
      expect(response.body.card.title).toBe('Test Product');
      expect(response.body.card.price).toBe('R$ 99,90');
      expect(response.body.card.source).toBe('MANUAL');
      expect(response.body.card.status).toBe('ACTIVE');
      expect(response.body.card.image_url).toMatch(/^\/uploads\/cards\/.+\.webp$/);
    });

    it('should require image upload', async () => {
      await request(app)
        .post('/api/pinterest/cards')
        .set('Cookie', authCookie)
        .field(
          'data',
          JSON.stringify({
            title: 'Test Product',
            price: 'R$ 99,90',
            affiliateUrl: 'https://example.com/product',
          })
        )
        .expect(400);
    });

    it('should validate required fields', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');

      await request(app)
        .post('/api/pinterest/cards')
        .set('Cookie', authCookie)
        .field('data', JSON.stringify({ title: 'Test' }))
        .attach('image', testImageBuffer, 'test.png')
        .expect(400);
    });
  });

  describe('GET /api/pinterest/cards', () => {
    it('should return user cards', async () => {
      // Create test cards
      await prisma.public_cards.createMany({
        data: [
          {
            user_id: testUserId,
            card_slug: 'card-1',
            source: 'MANUAL',
            marketplace: 'MERCADO_LIVRE',
            title: 'Card 1',
            price: 'R$ 50,00',
            image_url: '/test1.jpg',
            affiliate_url: 'https://example.com/1',
            status: 'ACTIVE',
          },
          {
            user_id: testUserId,
            card_slug: 'card-2',
            source: 'BOT',
            marketplace: 'SHOPEE',
            title: 'Card 2',
            price: 'R$ 75,00',
            image_url: '/test2.jpg',
            affiliate_url: 'https://example.com/2',
            status: 'ACTIVE',
          },
        ],
      });

      const response = await request(app)
        .get('/api/pinterest/cards')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.cards).toHaveLength(2);
      expect(response.body.cards[0].title).toBe('Card 1');
    });

    it('should return empty array when no cards exist', async () => {
      const response = await request(app)
        .get('/api/pinterest/cards')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.cards).toEqual([]);
    });
  });

  describe('PATCH /api/pinterest/cards/:id/status', () => {
    it('should toggle card status from ACTIVE to HIDDEN', async () => {
      const card = await prisma.public_cards.create({
        data: {
          user_id: testUserId,
          card_slug: 'toggle-card',
          source: 'MANUAL',
          marketplace: 'MERCADO_LIVRE',
          title: 'Toggle Card',
          price: 'R$ 100,00',
          image_url: '/test.jpg',
          affiliate_url: 'https://example.com/toggle',
          status: 'ACTIVE',
        },
      });

      const response = await request(app)
        .patch(`/api/pinterest/cards/${card.id}/status`)
        .set('Cookie', authCookie)
        .send({ status: 'HIDDEN' })
        .expect(200);

      expect(response.body.card.status).toBe('HIDDEN');
    });
  });

  describe('DELETE /api/pinterest/cards/:id', () => {
    it('should delete a card', async () => {
      const card = await prisma.public_cards.create({
        data: {
          user_id: testUserId,
          card_slug: 'delete-card',
          source: 'MANUAL',
          marketplace: 'MERCADO_LIVRE',
          title: 'Delete Card',
          price: 'R$ 100,00',
          image_url: '/test.jpg',
          affiliate_url: 'https://example.com/delete',
          status: 'ACTIVE',
        },
      });

      await request(app)
        .delete(`/api/pinterest/cards/${card.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      const deletedCard = await prisma.public_cards.findUnique({
        where: { id: card.id },
      });

      expect(deletedCard).toBeNull();
    });

    it('should not delete another user\'s card', async () => {
      const otherUser = await prisma.users.create({
        data: {
          email: 'other-user@example.com',
          password_hash: 'hashed',
          role: 'USER',
        },
      });

      const card = await prisma.public_cards.create({
        data: {
          user_id: otherUser.id,
          card_slug: 'other-card',
          source: 'MANUAL',
          marketplace: 'MERCADO_LIVRE',
          title: 'Other Card',
          price: 'R$ 100,00',
          image_url: '/test.jpg',
          affiliate_url: 'https://example.com/other',
          status: 'ACTIVE',
        },
      });

      await request(app)
        .delete(`/api/pinterest/cards/${card.id}`)
        .set('Cookie', authCookie)
        .expect(404);

      // Cleanup
      await prisma.public_cards.delete({ where: { id: card.id } });
      await prisma.users.delete({ where: { id: otherUser.id } });
    });
  });

  describe('GET /api/analytics/dashboard', () => {
    it('should return dashboard metrics with default 30d range', async () => {
      // Create test analytics events
      await prisma.analytics_events.createMany({
        data: [
          {
            user_id: testUserId,
            event_type: 'PUBLIC_PROFILE_VIEW',
            visitor_ip: '1.1.1.1',
            visitor_user_agent: 'Mozilla/5.0',
          },
          {
            user_id: testUserId,
            event_type: 'PUBLIC_CARD_CLICK',
            visitor_ip: '2.2.2.2',
            visitor_user_agent: 'Mozilla/5.0',
          },
        ],
      });

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toHaveProperty('publicPage');
      expect(response.body.publicPage).toHaveProperty('profileViews');
      expect(response.body.publicPage).toHaveProperty('cardClicks');
      expect(response.body.publicPage).toHaveProperty('ctr');
      expect(response.body.timeRange).toBe('30d');
    });

    it('should accept custom time range', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard?timeRange=7d')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.timeRange).toBe('7d');
    });
  });

  describe('GET /api/analytics/top-cards', () => {
    it('should return top performing cards', async () => {
      const card = await prisma.public_cards.create({
        data: {
          user_id: testUserId,
          card_slug: 'top-card',
          source: 'MANUAL',
          marketplace: 'MERCADO_LIVRE',
          title: 'Top Card',
          price: 'R$ 100,00',
          image_url: '/test.jpg',
          affiliate_url: 'https://example.com/top',
          status: 'ACTIVE',
        },
      });

      await prisma.analytics_events.createMany({
        data: Array.from({ length: 5 }, () => ({
          user_id: testUserId,
          event_type: 'PUBLIC_CARD_CLICK',
          card_id: card.id,
          visitor_ip: '1.1.1.1',
          visitor_user_agent: 'Mozilla/5.0',
        })),
      });

      const response = await request(app)
        .get('/api/analytics/top-cards')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.cards).toBeInstanceOf(Array);
      if (response.body.cards.length > 0) {
        expect(response.body.cards[0]).toHaveProperty('clickCount');
      }
    });
  });

  describe('GET /api/analytics/visitors', () => {
    it('should return visitor statistics', async () => {
      await prisma.analytics_events.createMany({
        data: [
          {
            user_id: testUserId,
            event_type: 'PUBLIC_PROFILE_VIEW',
            visitor_ip: '1.1.1.1',
            visitor_user_agent: 'Chrome',
          },
          {
            user_id: testUserId,
            event_type: 'PUBLIC_PROFILE_VIEW',
            visitor_ip: '1.1.1.1',
            visitor_user_agent: 'Chrome',
          },
          {
            user_id: testUserId,
            event_type: 'PUBLIC_PROFILE_VIEW',
            visitor_ip: '2.2.2.2',
            visitor_user_agent: 'Firefox',
          },
        ],
      });

      const response = await request(app)
        .get('/api/analytics/visitors')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toHaveProperty('uniqueVisitors');
      expect(response.body).toHaveProperty('totalVisits');
      expect(response.body.totalVisits).toBeGreaterThanOrEqual(response.body.uniqueVisitors);
    });
  });
});

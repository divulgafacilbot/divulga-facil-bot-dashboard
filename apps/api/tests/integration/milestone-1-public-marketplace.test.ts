/**
 * MILESTONE 1 - Public Marketplace Integration Tests
 *
 * Tests all functionality from Feature 1: Public Marketplace Page
 * - Public page settings (slug generation, profile customization)
 * - Public cards (CRUD operations, filtering, pagination)
 * - Tracking system (events, deduplication, privacy)
 * - Public API endpoints
 *
 * SETUP REQUIRED:
 * - PostgreSQL running with schema migrated
 * - Redis running for rate limiting
 * - Environment variables configured (.env)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/db/prisma.js';
import { generateUniqueSlug, normalizeSlug } from '../../src/utils/slug.util.js';
import { encodeCursor, decodeCursor } from '../../src/utils/cursor.util.js';
import { truncateIP, hashIP, isBot } from '../../src/utils/tracking.util.js';
import { PublicPageService } from '../../src/services/pinterest/public-page.service.js';
import { PublicCardService } from '../../src/services/pinterest/public-card.service.js';
import { TrackingService } from '../../src/services/pinterest/tracking.service.js';

describe('MILESTONE 1 - Public Marketplace Integration', () => {
  let testUserId: string;
  let testUserEmail: string;
  let testPublicSlug: string;
  let testCardId: string;
  let testCardSlug: string;

  beforeAll(async () => {
    // Create test user
    const timestamp = Date.now();
    testUserEmail = `test-milestone1-${timestamp}@example.com`;

    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        passwordHash: 'hashed-password-placeholder',
        role: 'USER',
        emailVerified: true,
      },
    });

    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup: delete test user and all related data (cascade)
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId },
      });
    }

    await prisma.$disconnect();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // UTILS TESTS (T003, T004, T005)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('Slug Utility (T003)', () => {
    it('should normalize email to valid slug', () => {
      const slug = normalizeSlug('João.Silva+test@example.com');
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(slug.length).toBeGreaterThanOrEqual(3);
      expect(slug.length).toBeLessThanOrEqual(24);
    });

    it('should handle accented characters', () => {
      const slug = normalizeSlug('José.García');
      expect(slug).toBe('jose-garcia');
    });

    it('should prefix reserved words', () => {
      const slug = normalizeSlug('admin');
      expect(slug).toBe('u-admin');
    });

    it('should generate unique slug on collision', async () => {
      const baseEmail = 'collision-test';
      const slug1 = await generateUniqueSlug(baseEmail);

      // Create public page with slug1
      await prisma.public_page_settings.create({
        data: {
          user_id: testUserId,
          public_slug: slug1,
          display_name: 'Test User',
          header_color: '#FF006B',
        },
      });

      // Try to generate again - should get different slug
      const slug2 = await generateUniqueSlug(baseEmail);
      expect(slug2).not.toBe(slug1);
    });
  });

  describe('Cursor Utility (T004)', () => {
    it('should encode and decode cursor correctly', () => {
      const createdAt = new Date().toISOString();
      const id = 'test-id-123';

      const cursor = encodeCursor({ createdAt, id });
      expect(cursor).toBeTruthy();
      expect(typeof cursor).toBe('string');

      const decoded = decodeCursor(cursor);
      expect(decoded).toBeTruthy();
      expect(decoded?.createdAt).toBe(createdAt);
      expect(decoded?.id).toBe(id);
    });

    it('should return null for invalid cursor', () => {
      const decoded = decodeCursor('invalid-cursor');
      expect(decoded).toBeNull();
    });

    it('should handle empty cursor', () => {
      const decoded = decodeCursor('');
      expect(decoded).toBeNull();
    });
  });

  describe('Tracking Utility (T005)', () => {
    it('should truncate IPv4 to /24', () => {
      const truncated = truncateIP('192.168.1.100');
      expect(truncated).toBe('192.168.1.0');
    });

    it('should truncate IPv6 to /64', () => {
      const truncated = truncateIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
      // IPv6 truncation keeps first 4 groups
      expect(truncated).toContain('2001');
      expect(truncated).toContain('0db8');
      expect(truncated).toContain('85a3');
      expect(truncated).toContain('::');
    });

    it('should hash IP deterministically', () => {
      const ip = '192.168.1.100';
      const ua = 'Mozilla/5.0';
      const hash1 = hashIP(ip, ua);
      const hash2 = hashIP(ip, ua);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex
    });

    it('should detect common bots', () => {
      expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
      expect(isBot('facebookexternalhit/1.1')).toBe(true);
      expect(isBot('WhatsApp/2.0')).toBe(true);
      expect(isBot('Mozilla/5.0 (Windows NT 10.0)')).toBe(false);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PUBLIC PAGE SERVICE TESTS (T006, T013)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('PublicPageService (T006)', () => {
    it('should create public page settings with unique slug', async () => {
      const emailLocalPart = testUserEmail.split('@')[0];
      const page = await PublicPageService.create(testUserId, emailLocalPart);

      expect(page.user_id).toBe(testUserId);
      expect(page.public_slug).toBeTruthy();
      expect(page.display_name).toBe(emailLocalPart);
      expect(page.header_color).toBe('#FF006B');

      testPublicSlug = page.public_slug;
    });

    it('should find page by slug', async () => {
      const page = await PublicPageService.getBySlug(testPublicSlug);
      expect(page).toBeTruthy();
      expect(page?.public_slug).toBe(testPublicSlug);
      expect(page?.user_id).toBe(testUserId);
    });

    it('should find page by user ID', async () => {
      const page = await PublicPageService.getByUserId(testUserId);
      expect(page).toBeTruthy();
      expect(page?.user_id).toBe(testUserId);
    });

    it('should update page settings', async () => {
      const updated = await PublicPageService.update(testUserId, {
        displayName: 'Updated Name',
        bio: 'This is my bio',
        headerColor: '#00FF00',
      });

      expect(updated.display_name).toBe('Updated Name');
      expect(updated.bio).toBe('This is my bio');
      expect(updated.header_color).toBe('#00FF00');
    });

    it('should return null for non-existent slug', async () => {
      const page = await PublicPageService.getBySlug('non-existent-slug-12345');
      expect(page).toBeNull();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PUBLIC CARD SERVICE TESTS (T007)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('PublicCardService (T007)', () => {
    beforeEach(async () => {
      // Create a test card
      const card = await PublicCardService.create({
        userId: testUserId,
        title: 'Test Product',
        description: 'This is a test product',
        price: 'R$ 99,90',
        originalPrice: 'R$ 199,90',
        imageUrl: '/test-image.jpg',
        affiliateLink: 'https://example.com/product',
        marketplace: 'MERCADO_LIVRE',
        source: 'MANUAL',
        coupon: 'TEST10',
      });

      testCardId = card.id;
      testCardSlug = card.card_slug;
    });

    it('should create card with auto-generated slug', async () => {
      const card = await PublicCardService.create({
        userId: testUserId,
        title: 'New Product 123',
        price: 'R$ 49,90',
        imageUrl: '/product.jpg',
        affiliateLink: 'https://example.com/new',
        marketplace: 'SHOPEE',
        source: 'BOT',
      });

      expect(card.id).toBeTruthy();
      expect(card.card_slug).toBeTruthy();
      expect(card.card_slug).toMatch(/^new-product-123/);
      expect(card.status).toBe('ACTIVE');
      expect(card.marketplace).toBe('SHOPEE');
    });

    it('should list active cards for user', async () => {
      const result = await PublicCardService.listCards({
        userId: testUserId,
        status: 'ACTIVE',
        limit: 10,
      });

      expect(result.cards.length).toBeGreaterThan(0);
      expect(result.cards[0].user_id).toBe(testUserId);
      expect(result.cards[0].status).toBe('ACTIVE');
    });

    it('should paginate cards with cursor', async () => {
      // Create multiple cards
      for (let i = 0; i < 5; i++) {
        await PublicCardService.create({
          userId: testUserId,
          title: `Product ${i}`,
          price: `R$ ${i * 10},00`,
          imageUrl: `/product-${i}.jpg`,
          affiliateLink: `https://example.com/${i}`,
          marketplace: 'AMAZON',
          source: 'BOT',
        });
      }

      // Get first page
      const page1 = await PublicCardService.listCards({
        userId: testUserId,
        limit: 3,
      });

      expect(page1.cards.length).toBe(3);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).toBeTruthy();

      // Get second page
      const page2 = await PublicCardService.listCards({
        userId: testUserId,
        limit: 3,
        cursor: page1.nextCursor,
      });

      expect(page2.cards.length).toBeGreaterThan(0);
      expect(page2.cards[0].id).not.toBe(page1.cards[0].id);
    });

    it('should find card by slug', async () => {
      const card = await PublicCardService.getBySlug(testUserId, testCardSlug);
      expect(card).toBeTruthy();
      expect(card?.card_slug).toBe(testCardSlug);
      expect(card?.title).toBe('Test Product');
    });

    it('should filter by marketplace', async () => {
      const result = await PublicCardService.listCards({
        userId: testUserId,
        marketplace: 'MERCADO_LIVRE',
      });

      expect(result.cards.length).toBeGreaterThan(0);
      result.cards.forEach((card) => {
        expect(card.marketplace).toBe('MERCADO_LIVRE');
      });
    });

    it('should update card', async () => {
      const updated = await PublicCardService.update(testCardId, {
        title: 'Updated Product',
        price: 'R$ 79,90',
        status: 'HIDDEN',
      });

      expect(updated.title).toBe('Updated Product');
      expect(updated.price).toBe('R$ 79,90');
      expect(updated.status).toBe('HIDDEN');
    });

    it('should delete card', async () => {
      await PublicCardService.delete(testCardId);

      const card = await prisma.public_cards.findUnique({
        where: { id: testCardId },
      });

      expect(card).toBeNull();
    });

    it('should increment clicks counter', async () => {
      const before = await PublicCardService.getBySlug(testUserId, testCardSlug);
      const clicksBefore = before?.clicks || 0;

      await PublicCardService.incrementClick(testCardId);

      const after = await PublicCardService.getBySlug(testUserId, testCardSlug);
      expect(after?.clicks).toBe(clicksBefore + 1);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TRACKING SERVICE TESTS (T008)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('TrackingService (T008)', () => {
    it('should track PUBLIC_PROFILE_VIEW event', async () => {
      const result = await TrackingService.trackEvent({
        userId: testUserId,
        eventType: 'PUBLIC_PROFILE_VIEW',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        visitorId: 'visitor-123',
        utmSource: 'google',
        utmMedium: 'cpc',
      });

      expect(result.tracked).toBe(true);

      // Verify event was stored
      const events = await prisma.public_events.findMany({
        where: {
          user_id: testUserId,
          event_type: 'PUBLIC_PROFILE_VIEW',
        },
        take: 1,
        orderBy: { created_at: 'desc' },
      });

      expect(events.length).toBe(1);
      expect(events[0].visitor_id).toBe('visitor-123');
      expect(events[0].utm_source).toBe('google');
      expect(events[0].ip_hash).toBeTruthy();
    });

    it('should track PUBLIC_CARD_VIEW event with card info', async () => {
      // Recreate card if deleted
      const card = await PublicCardService.create({
        userId: testUserId,
        title: 'Tracking Test Product',
        price: 'R$ 29,90',
        imageUrl: '/track.jpg',
        affiliateLink: 'https://example.com/track',
        marketplace: 'SHOPEE',
        source: 'BOT',
      });

      const result = await TrackingService.trackEvent({
        userId: testUserId,
        cardId: card.id,
        eventType: 'PUBLIC_CARD_VIEW',
        marketplace: 'SHOPEE',
        source: 'BOT',
        ip: '192.168.2.100',
        userAgent: 'Mozilla/5.0',
        visitorId: 'visitor-456',
      });

      expect(result.tracked).toBe(true);
    });

    it('should filter bot traffic', async () => {
      const result = await TrackingService.trackEvent({
        userId: testUserId,
        eventType: 'PUBLIC_PROFILE_VIEW',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)',
      });

      expect(result.tracked).toBe(false);
      expect(result.reason).toBe('bot_filtered');
    });

    it('should deduplicate events within time window', async () => {
      const eventData = {
        userId: testUserId,
        eventType: 'PUBLIC_PROFILE_VIEW' as const,
        ip: '192.168.3.100',
        userAgent: 'Mozilla/5.0',
        visitorId: 'visitor-dedup',
      };

      // First event should track
      const result1 = await TrackingService.trackEvent(eventData);
      expect(result1.tracked).toBe(true);

      // Immediate duplicate should be filtered
      const result2 = await TrackingService.trackEvent(eventData);
      expect(result2.tracked).toBe(false);
      expect(result2.reason).toBe('duplicate');
    });

    it('should hash IPs for privacy', async () => {
      await TrackingService.trackEvent({
        userId: testUserId,
        eventType: 'PUBLIC_CTA_CLICK',
        ip: '10.0.0.50',
        userAgent: 'Mozilla/5.0',
      });

      const events = await prisma.public_events.findMany({
        where: {
          user_id: testUserId,
          event_type: 'PUBLIC_CTA_CLICK',
        },
        take: 1,
        orderBy: { created_at: 'desc' },
      });

      // IP should be hashed, not stored directly
      expect(events[0].ip_hash).toBeTruthy();
      expect(events[0].ip_hash).toHaveLength(64); // SHA256 hex
      expect(events[0].ip_hash).not.toContain('10.0.0.50');
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INTEGRATION TESTS (Complete flows)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('Complete User Journey', () => {
    it('should handle complete flow: signup → create cards → track views', async () => {
      // 1. User signs up (public page auto-created via T013 hook)
      const newUserEmail = `journey-${Date.now()}@example.com`;
      const newUser = await prisma.user.create({
        data: {
          email: newUserEmail,
          passwordHash: 'hashed',
          role: 'USER',
          emailVerified: false,
        },
      });

      // 2. Create public page (simulating T013 post-signup hook)
      const emailLocalPart = newUserEmail.split('@')[0];
      const publicPage = await PublicPageService.create(newUser.id, emailLocalPart);
      expect(publicPage.user_id).toBe(newUser.id);

      // 3. User creates cards
      const card1 = await PublicCardService.create({
        userId: newUser.id,
        title: 'Journey Product 1',
        price: 'R$ 99,00',
        imageUrl: '/journey1.jpg',
        affiliateLink: 'https://example.com/j1',
        marketplace: 'MERCADO_LIVRE',
        source: 'MANUAL',
      });

      const card2 = await PublicCardService.create({
        userId: newUser.id,
        title: 'Journey Product 2',
        price: 'R$ 49,00',
        imageUrl: '/journey2.jpg',
        affiliateLink: 'https://example.com/j2',
        marketplace: 'SHOPEE',
        source: 'BOT',
      });

      // 4. Visitor views public page
      await TrackingService.trackEvent({
        userId: newUser.id,
        eventType: 'PUBLIC_PROFILE_VIEW',
        ip: '203.0.113.1',
        userAgent: 'Mozilla/5.0',
        visitorId: 'journey-visitor-1',
      });

      // 5. Visitor clicks on card
      await TrackingService.trackEvent({
        userId: newUser.id,
        cardId: card1.id,
        eventType: 'PUBLIC_CARD_CLICK',
        marketplace: 'MERCADO_LIVRE',
        source: 'MANUAL',
        ip: '203.0.113.1',
        userAgent: 'Mozilla/5.0',
        visitorId: 'journey-visitor-1',
      });

      // 6. Visitor views card detail
      await TrackingService.trackEvent({
        userId: newUser.id,
        cardId: card1.id,
        eventType: 'PUBLIC_CARD_VIEW',
        marketplace: 'MERCADO_LIVRE',
        source: 'MANUAL',
        ip: '203.0.113.1',
        userAgent: 'Mozilla/5.0',
        visitorId: 'journey-visitor-1',
      });

      // 7. Visitor clicks CTA (affiliate link)
      await TrackingService.trackEvent({
        userId: newUser.id,
        cardId: card1.id,
        eventType: 'PUBLIC_CTA_CLICK',
        marketplace: 'MERCADO_LIVRE',
        source: 'MANUAL',
        ip: '203.0.113.1',
        userAgent: 'Mozilla/5.0',
        visitorId: 'journey-visitor-1',
      });

      // Verify all events were tracked
      const events = await prisma.public_events.findMany({
        where: { user_id: newUser.id },
      });

      expect(events.length).toBeGreaterThanOrEqual(4); // At least profile view, card click, card view, CTA click

      // Cleanup
      await prisma.user.delete({ where: { id: newUser.id } });
    });
  });
});

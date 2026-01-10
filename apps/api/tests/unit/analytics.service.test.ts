import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '../../src/services/analytics.service.js';
import { prisma } from '../../src/db/prisma.js';

vi.mock('../../src/db/prisma.js', () => ({
  prisma: {
    analytics_events: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    public_cards: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardMetrics', () => {
    it('should return complete metrics for 30 day period', async () => {
      vi.mocked(prisma.analytics_events.count)
        .mockResolvedValueOnce(150) // profileViews
        .mockResolvedValueOnce(450) // cardViews
        .mockResolvedValueOnce(75) // cardClicks
        .mockResolvedValueOnce(25); // ctaClicks

      vi.mocked(prisma.public_cards.count)
        .mockResolvedValueOnce(20) // totalCards
        .mockResolvedValueOnce(15); // activeCards

      const result = await AnalyticsService.getDashboardMetrics('user-123', '30d');

      expect(result).toEqual({
        timeRange: '30d',
        publicPage: {
          profileViews: 150,
          cardViews: 450,
          cardClicks: 75,
          ctaClicks: 25,
          ctr: 50.0,
          totalCards: 20,
          activeCards: 15,
        },
      });
    });

    it('should return metrics for 7 day period', async () => {
      vi.mocked(prisma.analytics_events.count)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(150)
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(10);

      vi.mocked(prisma.public_cards.count)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(15);

      const result = await AnalyticsService.getDashboardMetrics('user-123', '7d');

      expect(result.timeRange).toBe('7d');
      expect(result.publicPage.profileViews).toBe(50);
    });

    it('should calculate CTR correctly', async () => {
      vi.mocked(prisma.analytics_events.count)
        .mockResolvedValueOnce(100) // profileViews
        .mockResolvedValueOnce(300)
        .mockResolvedValueOnce(33) // cardClicks
        .mockResolvedValueOnce(10);

      vi.mocked(prisma.public_cards.count)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8);

      const result = await AnalyticsService.getDashboardMetrics('user-123', '30d');

      expect(result.publicPage.ctr).toBe(33.0);
    });

    it('should return 0 CTR when no profile views', async () => {
      vi.mocked(prisma.analytics_events.count)
        .mockResolvedValueOnce(0) // profileViews
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      vi.mocked(prisma.public_cards.count)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);

      const result = await AnalyticsService.getDashboardMetrics('user-123', '30d');

      expect(result.publicPage.ctr).toBe(0.0);
    });

    it('should return metrics for all time', async () => {
      vi.mocked(prisma.analytics_events.count)
        .mockResolvedValueOnce(500)
        .mockResolvedValueOnce(1500)
        .mockResolvedValueOnce(250)
        .mockResolvedValueOnce(100);

      vi.mocked(prisma.public_cards.count)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(40);

      const result = await AnalyticsService.getDashboardMetrics('user-123', 'all');

      expect(result.timeRange).toBe('all');
      expect(result.publicPage.profileViews).toBe(500);
    });
  });

  describe('getTopCards', () => {
    it('should return top performing cards with click counts', async () => {
      const mockGroupData = [
        { card_id: 'card-1', _count: { id: 50 } },
        { card_id: 'card-2', _count: { id: 30 } },
        { card_id: 'card-3', _count: { id: 20 } },
      ];

      const mockCards = [
        {
          id: 'card-1',
          card_slug: 'card-1-slug',
          user_id: 'user-123',
          title: 'Product A',
          price: 'R$ 99,90',
          image_url: '/images/a.jpg',
          affiliate_url: 'https://example.com/a',
          status: 'ACTIVE',
        },
        {
          id: 'card-2',
          card_slug: 'card-2-slug',
          user_id: 'user-123',
          title: 'Product B',
          price: 'R$ 149,90',
          image_url: '/images/b.jpg',
          affiliate_url: 'https://example.com/b',
          status: 'ACTIVE',
        },
        {
          id: 'card-3',
          card_slug: 'card-3-slug',
          user_id: 'user-123',
          title: 'Product C',
          price: 'R$ 79,90',
          image_url: '/images/c.jpg',
          affiliate_url: 'https://example.com/c',
          status: 'ACTIVE',
        },
      ];

      vi.mocked(prisma.analytics_events.groupBy).mockResolvedValue(mockGroupData as any);
      vi.mocked(prisma.public_cards.findMany).mockResolvedValue(mockCards as any);

      const result = await AnalyticsService.getTopCards('user-123', 10);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        ...mockCards[0],
        clickCount: 50,
      });
      expect(result[1].clickCount).toBe(30);
      expect(result[2].clickCount).toBe(20);
    });

    it('should limit results to specified limit', async () => {
      const mockGroupData = Array.from({ length: 15 }, (_, i) => ({
        card_id: `card-${i}`,
        _count: { id: 100 - i },
      }));

      vi.mocked(prisma.analytics_events.groupBy).mockResolvedValue(mockGroupData as any);
      vi.mocked(prisma.public_cards.findMany).mockResolvedValue([]);

      const result = await AnalyticsService.getTopCards('user-123', 5);

      expect(prisma.analytics_events.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });

    it('should return empty array when no clicks recorded', async () => {
      vi.mocked(prisma.analytics_events.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.public_cards.findMany).mockResolvedValue([]);

      const result = await AnalyticsService.getTopCards('user-123', 10);

      expect(result).toHaveLength(0);
    });
  });

  describe('getVisitorStats', () => {
    it('should return unique visitor count and total visits for 30d', async () => {
      const mockEvents = [
        { user_id: 'user-123', visitor_ip: '1.1.1.1', visitor_user_agent: 'Agent1' },
        { user_id: 'user-123', visitor_ip: '1.1.1.1', visitor_user_agent: 'Agent1' },
        { user_id: 'user-123', visitor_ip: '2.2.2.2', visitor_user_agent: 'Agent2' },
        { user_id: 'user-123', visitor_ip: '3.3.3.3', visitor_user_agent: 'Agent3' },
      ];

      vi.mocked(prisma.analytics_events.findMany).mockResolvedValue(mockEvents as any);

      const result = await AnalyticsService.getVisitorStats('user-123', '30d');

      expect(result.uniqueVisitors).toBe(3);
      expect(result.totalVisits).toBe(4);
      expect(result.timeRange).toBe('30d');
    });

    it('should handle zero visitors', async () => {
      vi.mocked(prisma.analytics_events.findMany).mockResolvedValue([]);

      const result = await AnalyticsService.getVisitorStats('user-123', '7d');

      expect(result.uniqueVisitors).toBe(0);
      expect(result.totalVisits).toBe(0);
    });

    it('should count same IP with different user agents as different visitors', async () => {
      const mockEvents = [
        { user_id: 'user-123', visitor_ip: '1.1.1.1', visitor_user_agent: 'Chrome' },
        { user_id: 'user-123', visitor_ip: '1.1.1.1', visitor_user_agent: 'Firefox' },
      ];

      vi.mocked(prisma.analytics_events.findMany).mockResolvedValue(mockEvents as any);

      const result = await AnalyticsService.getVisitorStats('user-123', '30d');

      expect(result.uniqueVisitors).toBe(2);
    });
  });

  describe('getEventTimeSeries', () => {
    it('should return time series data grouped by day', async () => {
      const mockData = [
        { date: new Date('2026-01-01'), _count: { id: 10 } },
        { date: new Date('2026-01-02'), _count: { id: 15 } },
        { date: new Date('2026-01-03'), _count: { id: 8 } },
      ];

      vi.mocked(prisma.analytics_events.groupBy).mockResolvedValue(mockData as any);

      const result = await AnalyticsService.getEventTimeSeries(
        'user-123',
        'PUBLIC_PROFILE_VIEW',
        '7d'
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        date: expect.any(String),
        count: 10,
      });
      expect(result[1].count).toBe(15);
      expect(result[2].count).toBe(8);
    });

    it('should filter by event type', async () => {
      vi.mocked(prisma.analytics_events.groupBy).mockResolvedValue([]);

      await AnalyticsService.getEventTimeSeries('user-123', 'PUBLIC_CARD_CLICK', '30d');

      expect(prisma.analytics_events.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            event_type: 'PUBLIC_CARD_CLICK',
          }),
        })
      );
    });

    it('should return empty array when no events in time range', async () => {
      vi.mocked(prisma.analytics_events.groupBy).mockResolvedValue([]);

      const result = await AnalyticsService.getEventTimeSeries(
        'user-123',
        'PUBLIC_PROFILE_VIEW',
        '7d'
      );

      expect(result).toHaveLength(0);
    });
  });
});

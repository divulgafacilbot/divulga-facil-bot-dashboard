/**
 * Public Event Service - Unit Tests
 */

import { describe, it, expect } from 'vitest';

// Note: These are basic structure tests
// Full integration tests are in tests/integration/

describe('Public Event Service', () => {
  describe('Service Structure', () => {
    it('should export PublicEventService class', async () => {
      const module = await import('../../src/services/public-event.service.js');
      expect(module.PublicEventService).toBeDefined();
    });

    it('should have trackPageView method', async () => {
      const { PublicEventService } = await import('../../src/services/public-event.service.js');
      expect(typeof PublicEventService.trackPageView).toBe('function');
    });

    it('should have trackCtaClick method', async () => {
      const { PublicEventService } = await import('../../src/services/public-event.service.js');
      expect(typeof PublicEventService.trackCtaClick).toBe('function');
    });

    it('should have trackCardView method', async () => {
      const { PublicEventService } = await import('../../src/services/public-event.service.js');
      expect(typeof PublicEventService.trackCardView).toBe('function');
    });

    it('should have getUserEvents method', async () => {
      const { PublicEventService } = await import('../../src/services/public-event.service.js');
      expect(typeof PublicEventService.getUserEvents).toBe('function');
    });

    it('should have getUserEventCounts method', async () => {
      const { PublicEventService } = await import('../../src/services/public-event.service.js');
      expect(typeof PublicEventService.getUserEventCounts).toBe('function');
    });
  });
});

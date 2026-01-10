/**
 * Metrics Service - Unit Tests
 */

import { describe, it, expect } from 'vitest';

// Note: These are basic structure tests
// Full integration tests are in tests/integration/

describe('Metrics Service', () => {
  describe('Service Structure', () => {
    it('should export MetricsService class', async () => {
      const module = await import('../../src/services/metrics.service.js');
      expect(module.MetricsService).toBeDefined();
    });

    it('should have getUserMetrics method', async () => {
      const { MetricsService } = await import('../../src/services/metrics.service.js');
      expect(typeof MetricsService.getUserMetrics).toBe('function');
    });

    it('should have getCardMetrics method', async () => {
      const { MetricsService } = await import('../../src/services/metrics.service.js');
      expect(typeof MetricsService.getCardMetrics).toBe('function');
    });

    it('should have getTopCards method', async () => {
      const { MetricsService } = await import('../../src/services/metrics.service.js');
      expect(typeof MetricsService.getTopCards).toBe('function');
    });

    it('should have getMarketplaceMetrics method', async () => {
      const { MetricsService } = await import('../../src/services/metrics.service.js');
      expect(typeof MetricsService.getMarketplaceMetrics).toBe('function');
    });
  });
});

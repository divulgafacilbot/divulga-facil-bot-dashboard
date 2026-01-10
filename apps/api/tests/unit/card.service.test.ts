/**
 * Card Service - Unit Tests
 */

import { describe, it, expect } from 'vitest';

// Note: These are basic structure tests
// Full integration tests are in tests/integration/

describe('Card Service', () => {
  describe('Service Structure', () => {
    it('should export CardService class', async () => {
      const module = await import('../../src/services/card.service.js');
      expect(module.CardService).toBeDefined();
    });

    it('should have createCard method', async () => {
      const { CardService } = await import('../../src/services/card.service.js');
      expect(typeof CardService.createCard).toBe('function');
    });

    it('should have updateCard method', async () => {
      const { CardService } = await import('../../src/services/card.service.js');
      expect(typeof CardService.updateCard).toBe('function');
    });

    it('should have hideCard method (soft delete)', async () => {
      const { CardService } = await import('../../src/services/card.service.js');
      expect(typeof CardService.hideCard).toBe('function');
    });

    it('should have restoreCard method', async () => {
      const { CardService } = await import('../../src/services/card.service.js');
      expect(typeof CardService.restoreCard).toBe('function');
    });

    it('should have listCards method', async () => {
      const { CardService } = await import('../../src/services/card.service.js');
      expect(typeof CardService.listCards).toBe('function');
    });

    it('should have getCardById method', async () => {
      const { CardService } = await import('../../src/services/card.service.js');
      expect(typeof CardService.getCardById).toBe('function');
    });

    it('should have getCardBySlug method', async () => {
      const { CardService } = await import('../../src/services/card.service.js');
      expect(typeof CardService.getCardBySlug).toBe('function');
    });
  });
});

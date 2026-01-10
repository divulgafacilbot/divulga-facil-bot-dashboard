import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { SuggestionsController } from '../suggestions.controller';
import { SuggestionEngineService } from '../../services/suggestions/suggestion-engine.service';

vi.mock('../../services/suggestions/suggestion-engine.service');

describe('SuggestionsController', () => {
  let controller: SuggestionsController;
  let mockService: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockService = {
      generateSuggestions: vi.fn(),
      listSuggestions: vi.fn(),
      recordUserAction: vi.fn(),
      getPreferences: vi.fn(),
      updatePreferences: vi.fn(),
    };

    vi.mocked(SuggestionEngineService).mockImplementation(() => mockService);

    controller = new SuggestionsController();

    mockReq = {
      user: { userId: 'user1' },
      body: {},
      params: {},
      query: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    vi.clearAllMocks();
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions successfully', async () => {
      const mockResult = {
        generatedCount: 5,
        message: '5 sugestões geradas',
      };

      mockService.generateSuggestions.mockResolvedValue(mockResult);

      await controller.generateSuggestions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle errors', async () => {
      mockService.generateSuggestions.mockRejectedValue(new Error('Generation failed'));

      await controller.generateSuggestions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('listSuggestions', () => {
    it('should list suggestions with pagination', async () => {
      const mockResult = {
        suggestions: [
          { id: 'sugg1', suggested_title: 'Product 1' },
          { id: 'sugg2', suggested_title: 'Product 2' },
        ],
        pagination: {
          total: 10,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockReq.query = { page: '1', limit: '10' };

      mockService.listSuggestions.mockResolvedValue(mockResult);

      await controller.listSuggestions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should filter by action', async () => {
      mockReq.query = { actionFilter: 'PENDING' };

      const mockResult = {
        suggestions: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      mockService.listSuggestions.mockResolvedValue(mockResult);

      await controller.listSuggestions(mockReq as Request, mockRes as Response);

      expect(mockService.listSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({
          actionFilter: 'PENDING',
        })
      );
    });
  });

  describe('recordAction', () => {
    it('should record user action successfully', async () => {
      const mockSuggestion = {
        id: 'sugg1',
        user_action: 'ACCEPTED',
      };

      mockReq.params = { id: 'sugg1' };
      mockReq.body = { action: 'ACCEPTED' };

      mockService.recordUserAction.mockResolvedValue(mockSuggestion);

      await controller.recordAction(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ suggestion: mockSuggestion });
    });

    it('should validate action type', async () => {
      mockReq.params = { id: 'sugg1' };
      mockReq.body = { action: 'INVALID_ACTION' };

      await controller.recordAction(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('getPreferences', () => {
    it('should get user preferences', async () => {
      const mockPreferences = {
        user_id: 'user1',
        suggestions_enabled: true,
        frequency: 'DAILY',
        max_suggestions_per_batch: 5,
        preferred_categories: ['Eletrônicos'],
        excluded_marketplaces: [],
      };

      mockService.getPreferences.mockResolvedValue(mockPreferences);

      await controller.getPreferences(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockPreferences);
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      const mockPreferences = {
        user_id: 'user1',
        suggestions_enabled: true,
        frequency: 'WEEKLY',
        max_suggestions_per_batch: 10,
        preferred_categories: ['Moda', 'Beleza'],
        excluded_marketplaces: ['ALIEXPRESS'],
      };

      mockReq.body = {
        suggestionsEnabled: true,
        frequency: 'WEEKLY',
        maxSuggestionsPerBatch: 10,
        preferredCategories: ['Moda', 'Beleza'],
        excludedMarketplaces: ['ALIEXPRESS'],
      };

      mockService.updatePreferences.mockResolvedValue(mockPreferences);

      await controller.updatePreferences(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockPreferences);
    });

    it('should validate preferences input', async () => {
      mockReq.body = {
        frequency: 'INVALID',
      };

      await controller.updatePreferences(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });
});

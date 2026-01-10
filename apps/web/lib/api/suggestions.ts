import { apiClient } from './client';
import type {
  Suggestion,
  SuggestionPreferences,
  UpdateSuggestionPreferencesInput,
  SuggestionAction,
  ListSuggestionsFilters,
  SuggestionStats,
} from './types/suggestions';

/**
 * Suggestions API Client
 */
export const suggestionsApi = {
  /**
   * Generate new suggestions for current user
   */
  async generateSuggestions(): Promise<Suggestion[]> {
    const response = await apiClient.post<{ data: Suggestion[] }>('/suggestions/generate');
    return response.data.data;
  },

  /**
   * Get suggestion history
   */
  async getSuggestions(filters?: ListSuggestionsFilters): Promise<{
    suggestions: Suggestion[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams();

    if (filters?.category) params.append('category', filters.category);
    if (filters?.marketplace) params.append('marketplace', filters.marketplace);
    if (filters?.userAction) params.append('userAction', filters.userAction);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await apiClient.get<{
      suggestions: Suggestion[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/suggestions?${params.toString()}`);
    return {
      suggestions: response.data.suggestions,
      pagination: response.data.pagination,
    };
  },

  /**
   * Record user action on suggestion
   */
  async recordAction(suggestionId: string, action: SuggestionAction): Promise<Suggestion> {
    const response = await apiClient.post<{ data: Suggestion }>(`/suggestions/${suggestionId}/action`, { action });
    return response.data.data;
  },

  /**
   * Get suggestion statistics
   */
  async getSuggestionStats(): Promise<SuggestionStats> {
    const response = await apiClient.get<{ data: SuggestionStats }>('/suggestions/stats');
    return response.data.data;
  },

  /**
   * Get user suggestion preferences
   */
  async getPreferences(): Promise<SuggestionPreferences> {
    const response = await apiClient.get<{ data: SuggestionPreferences }>('/suggestions/preferences');
    return response.data.data;
  },

  /**
   * Update user suggestion preferences
   */
  async updatePreferences(data: UpdateSuggestionPreferencesInput): Promise<SuggestionPreferences> {
    const response = await apiClient.patch<{ data: SuggestionPreferences }>('/suggestions/preferences', data);
    return response.data.data;
  },
};

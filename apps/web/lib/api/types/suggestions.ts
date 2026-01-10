/**
 * Suggestion Types (Frontend)
 */

export type SuggestionAction = 'ACCEPTED' | 'REJECTED' | 'IGNORED';
export type SuggestionFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Suggestion {
  id: string;
  user_id: string;
  suggested_product_url: string;
  suggested_title: string;
  suggested_category: string;
  suggested_marketplace: string;
  suggested_at: string;
  user_action?: SuggestionAction;
  action_at?: string;
  score?: number;
}

export interface SuggestionPreferences {
  id: string;
  user_id: string;
  suggestions_enabled: boolean;
  frequency: SuggestionFrequency;
  max_suggestions_per_batch: number;
  preferred_categories: string[];
  excluded_marketplaces: string[];
  created_at: string;
  updated_at: string;
  last_suggestion_at?: string;
}

export interface UpdateSuggestionPreferencesInput {
  suggestionsEnabled?: boolean;
  frequency?: SuggestionFrequency;
  maxSuggestionsPerBatch?: number;
  preferredCategories?: string[];
  excludedMarketplaces?: string[];
}

export interface ListSuggestionsFilters {
  category?: string;
  marketplace?: string;
  userAction?: SuggestionAction;
  page?: number;
  limit?: number;
}

export interface SuggestionStats {
  total: number;
  accepted: number;
  rejected: number;
  ignored: number;
  pending: number;
  acceptanceRate: number;
  byCategory: Array<{ category: string; count: number }>;
  byMarketplace: Array<{ marketplace: string; count: number }>;
}

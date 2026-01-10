import { Marketplace, AllowedCategory } from '../constants/suggestions.constants.js';

// Re-export for convenience
export { Marketplace, AllowedCategory };

// ============================================================
// INPUT CONTEXT - Metrics Analysis
// ============================================================

export interface PersonaShare {
  name: string;
  share: number; // Percentage
}

export interface CategoryShare {
  name: string;
  share: number; // Percentage
}

export interface CTRPattern {
  pattern: string;
  ctr: number; // Percentage
  examples: string[];
}

export interface ProductPattern {
  pattern: string;
  clicks: number;
  examples: string[];
}

export interface PriceBand {
  range: string; // e.g., "R$ 20–80"
  count: number;
}

export interface MarketplaceDistribution {
  marketplace: Marketplace;
  productCount: number;
  avgCTR: number;
}

export interface InputContext {
  // Personas
  dominantPersonas: PersonaShare[];

  // Categories
  dominantCategories: CategoryShare[];
  secondaryCategories: CategoryShare[];
  avoidCategories: string[];

  // Patterns
  topCTRPatterns: CTRPattern[];
  topProductPatterns: ProductPattern[];

  // Marketplace data
  marketplaceDistributions: Record<Marketplace, {
    productCount: number;
    avgCTR: number;
    topCategories: CategoryShare[];
  }>;

  // Price bands
  targetPriceBands: Record<Marketplace, PriceBand[]>;
}

// ============================================================
// PRODUCT SUGGESTION
// ============================================================

export interface ProductSuggestion {
  title: string;
  search_term: string; // Search query to find this product
  url?: string; // Generated Google search URL (computed, not from AI)
  hook_angle: string; // Micro-gancho (e.g., "antes/depois")
  category: AllowedCategory;
  estimated_price: string; // e.g., "R$ 50–80"
}

export interface MarketplaceSuggestions {
  MERCADO_LIVRE: ProductSuggestion[];
  SHOPEE: ProductSuggestion[];
  AMAZON: ProductSuggestion[];
  MAGALU: ProductSuggestion[];
}

// ============================================================
// CACHE ENTRY
// ============================================================

export interface CacheEntry {
  id: string;
  cache_key: string;
  mercado_livre: ProductSuggestion[];
  shopee: ProductSuggestion[];
  amazon: ProductSuggestion[];
  magalu: ProductSuggestion[];
  input_context?: InputContext;
  created_at: Date;
  expires_at: Date;
}

// ============================================================
// PROMOTIONAL CAMPAIGN
// ============================================================

export interface PromotionalCampaign {
  id: string;
  name: string;
  product_title: string;
  product_url: string;
  category?: string;
  marketplace: Marketplace;
  hook_angle?: string;
  is_active: boolean;
  priority: number;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignRotationState {
  id: string;
  marketplace: Marketplace;
  last_campaign_id?: string;
  last_used_day_key?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================
// PERPLEXITY API
// ============================================================

export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface PerplexityResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================
// VALIDATION
// ============================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface RepairAttempt {
  attempt: number;
  errors: string[];
  repairedJSON?: MarketplaceSuggestions;
}

import { SUGGESTION_CONSTANTS } from '../../constants/suggestions.constants.js';
import type { MarketplaceSuggestions, ProductSuggestion, ValidationResult } from '../../types/suggestions.types.js';

export class JsonValidatorService {
  /**
   * Validate AI-generated suggestions JSON
   */
  validate(data: any): ValidationResult {
    console.log('[JsonValidator] validate called');
    const errors: string[] = [];

    // Check if data is an object
    if (typeof data !== 'object' || data === null) {
      console.error('[JsonValidator] Data is not a valid object');
      errors.push('Response is not a valid object');
      return { valid: false, errors };
    }

    console.log('[JsonValidator] Checking marketplaces...');
    // Check all marketplaces present
    for (const marketplace of SUGGESTION_CONSTANTS.MARKETPLACES) {
      console.log('[JsonValidator] Validating marketplace:', marketplace);
      if (!data[marketplace]) {
        errors.push(`Missing marketplace: ${marketplace}`);
      } else if (!Array.isArray(data[marketplace])) {
        errors.push(`${marketplace} is not an array`);
      } else if (data[marketplace].length !== SUGGESTION_CONSTANTS.SUGGESTIONS_PER_MARKETPLACE) {
        errors.push(`${marketplace} must have exactly ${SUGGESTION_CONSTANTS.SUGGESTIONS_PER_MARKETPLACE} suggestions, got ${data[marketplace].length}`);
      } else {
        // Validate each suggestion
        data[marketplace].forEach((suggestion: any, index: number) => {
          const suggestionErrors = this.validateSuggestion(suggestion, marketplace, index);
          errors.push(...suggestionErrors);
        });
      }
    }

    console.log('[JsonValidator] Validation complete. Errors:', errors.length);
    if (errors.length > 0) {
      console.log('[JsonValidator] Validation errors:', errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a single product suggestion
   */
  private validateSuggestion(suggestion: any, marketplace: string, index: number): string[] {
    const errors: string[] = [];
    const prefix = `${marketplace}[${index}]`;

    // Check required fields
    if (!suggestion.title || typeof suggestion.title !== 'string') {
      errors.push(`${prefix}: missing or invalid 'title'`);
    } else if (suggestion.title.length < 10) {
      errors.push(`${prefix}: 'title' too short (min 10 chars)`);
    } else if (suggestion.title.length > 500) {
      errors.push(`${prefix}: 'title' too long (max 500 chars)`);
    }

    // Validate search_term (used to generate Google Search URL)
    if (!suggestion.search_term || typeof suggestion.search_term !== 'string') {
      errors.push(`${prefix}: missing or invalid 'search_term'`);
    } else if (suggestion.search_term.length < 3) {
      errors.push(`${prefix}: 'search_term' too short (min 3 chars)`);
    } else if (suggestion.search_term.length > 200) {
      errors.push(`${prefix}: 'search_term' too long (max 200 chars)`);
    }

    if (!suggestion.hook_angle || typeof suggestion.hook_angle !== 'string') {
      errors.push(`${prefix}: missing or invalid 'hook_angle'`);
    } else if (suggestion.hook_angle.length < 5) {
      errors.push(`${prefix}: 'hook_angle' too short (min 5 chars)`);
    }

    if (!suggestion.category || typeof suggestion.category !== 'string') {
      errors.push(`${prefix}: missing or invalid 'category'`);
    } else if (!SUGGESTION_CONSTANTS.ALLOWED_CATEGORIES.includes(suggestion.category as any)) {
      errors.push(`${prefix}: 'category' must be one of: ${SUGGESTION_CONSTANTS.ALLOWED_CATEGORIES.join(', ')}`);
    }

    if (!suggestion.estimated_price || typeof suggestion.estimated_price !== 'string') {
      errors.push(`${prefix}: missing or invalid 'estimated_price'`);
    }

    return errors;
  }

  /**
   * Attempt to repair malformed JSON
   * Returns repaired data or null if unrepairable
   */
  repair(data: any): MarketplaceSuggestions | null {
    console.log('[JsonValidator] repair called');
    try {
      const repaired: Partial<MarketplaceSuggestions> = {};

      for (const marketplace of SUGGESTION_CONSTANTS.MARKETPLACES) {
        console.log('[JsonValidator] Repairing marketplace:', marketplace);
        if (data[marketplace] && Array.isArray(data[marketplace])) {
          // Filter and repair suggestions
          const suggestions: ProductSuggestion[] = data[marketplace]
            .slice(0, SUGGESTION_CONSTANTS.SUGGESTIONS_PER_MARKETPLACE)
            .map((s: any) => this.repairSuggestion(s))
            .filter((s: ProductSuggestion | null) => s !== null) as ProductSuggestion[];

          // Fill missing suggestions with placeholder
          while (suggestions.length < SUGGESTION_CONSTANTS.SUGGESTIONS_PER_MARKETPLACE) {
            suggestions.push(this.getPlaceholderSuggestion(marketplace));
          }

          repaired[marketplace] = suggestions;
          console.log('[JsonValidator] Marketplace', marketplace, 'repaired with', suggestions.length, 'suggestions');
        } else {
          // Missing marketplace, fill with placeholders
          console.log('[JsonValidator] Marketplace', marketplace, 'missing, filling with placeholders');
          repaired[marketplace] = Array(SUGGESTION_CONSTANTS.SUGGESTIONS_PER_MARKETPLACE)
            .fill(null)
            .map(() => this.getPlaceholderSuggestion(marketplace));
        }
      }

      console.log('[JsonValidator] Repair complete');
      return repaired as MarketplaceSuggestions;
    } catch (error) {
      console.error('[JsonValidator] Repair failed:', error);
      return null;
    }
  }

  /**
   * Repair a single suggestion
   */
  private repairSuggestion(suggestion: any): ProductSuggestion | null {
    if (!suggestion || typeof suggestion !== 'object') {
      return null;
    }

    // Check critical fields - need title and search_term
    if (!suggestion.title || !suggestion.search_term) {
      return null;
    }

    return {
      title: String(suggestion.title).substring(0, 500),
      search_term: String(suggestion.search_term).substring(0, 200),
      hook_angle: suggestion.hook_angle ? String(suggestion.hook_angle) : 'Produto recomendado',
      category: SUGGESTION_CONSTANTS.ALLOWED_CATEGORIES.includes(suggestion.category)
        ? suggestion.category
        : 'Outros',
      estimated_price: suggestion.estimated_price ? String(suggestion.estimated_price) : 'Varia',
    };
  }

  /**
   * Get placeholder suggestion
   */
  private getPlaceholderSuggestion(marketplace: string): ProductSuggestion {
    return {
      title: 'Produto Indisponível',
      search_term: 'produtos em alta',
      hook_angle: 'Sugestão não disponível no momento',
      category: 'Outros',
      estimated_price: 'N/A',
    };
  }
}

export const jsonValidatorService = new JsonValidatorService();

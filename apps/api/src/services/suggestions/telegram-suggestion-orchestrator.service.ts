import { suggestionCacheService } from './suggestion-cache.service';
import { metricsAnalyzerService } from './metrics-analyzer.service';
import { campaignInjectorService } from './campaign-injector.service';
import { jsonValidatorService } from './json-validator.service';
import { perplexityClientService } from './perplexity-client.service';
import { telemetryService } from '../telemetry.service.js';
import { SUGGESTION_CONSTANTS, Marketplace } from '../../constants/suggestions.constants';
import type { MarketplaceSuggestions, InputContext, PerplexityMessage, ProductSuggestion } from '../../types/suggestions.types';

const PERPLEXITY_MODEL = 'sonar-pro';
const MAX_REPAIR_ATTEMPTS = 3;

/**
 * Telegram Suggestion Orchestrator Service
 * Main orchestrator for Feature 6 - Intelligent Suggestions Bot
 *
 * This service coordinates all the suggestion-related services to:
 * 1. Check cache first
 * 2. Generate new suggestions via Perplexity AI if cache is expired
 * 3. Inject promotional campaigns
 * 4. Save to cache
 */
export class TelegramSuggestionOrchestratorService {
  /**
   * Main orchestrator: Get or generate suggestions
   */
  async getSuggestions(): Promise<MarketplaceSuggestions> {
    console.log('[TelegramSuggestionOrchestrator] Starting suggestion generation');

    // 1. Try cache first
    let suggestions = await suggestionCacheService.getCache();

    if (suggestions) {
      console.log('[TelegramSuggestionOrchestrator] Using cached suggestions');

      // Log cache hit telemetry
      await telemetryService.logEvent({
        eventType: 'SUGGESTION_BOT_CACHE_HIT',
        origin: 'suggestion-bot',
        metadata: { source: 'global-cache' }
      });

      // Inject campaigns into cached suggestions
      const injectionResult = await campaignInjectorService.injectCampaigns(suggestions);
      suggestions = injectionResult.suggestions;

      // Log campaign injection telemetry if any were injected
      if (injectionResult.injectedCount > 0) {
        await telemetryService.logEvent({
          eventType: 'SUGGESTION_BOT_CAMPAIGN_INJECTED',
          origin: 'suggestion-bot',
          metadata: { injectedCount: injectionResult.injectedCount, marketplaces: injectionResult.marketplaces }
        });
      }

      // Apply Google Search URLs before returning
      return this.applyGoogleSearchUrls(suggestions);
    }

    console.log('[TelegramSuggestionOrchestrator] Cache miss, generating new suggestions');

    // Log cache miss telemetry
    await telemetryService.logEvent({
      eventType: 'SUGGESTION_BOT_CACHE_MISS',
      origin: 'suggestion-bot',
      metadata: { reason: 'expired-or-not-found' }
    });

    // 2. Analyze metrics to build InputContext
    console.log('[TelegramSuggestionOrchestrator] Step 2: Analyzing metrics...');
    const inputContext = await metricsAnalyzerService.analyzeMetrics();
    console.log('[TelegramSuggestionOrchestrator] InputContext built:', {
      dominantCategories: inputContext.dominantCategories.length,
      dominantPersonas: inputContext.dominantPersonas.length,
    });

    // 3. Call Perplexity AI to generate suggestions
    console.log('[TelegramSuggestionOrchestrator] Step 3: Generating suggestions with AI...');
    suggestions = await this.generateSuggestionsWithAI(inputContext);
    console.log('[TelegramSuggestionOrchestrator] AI suggestions generated successfully');

    // 4. Inject promotional campaigns
    const injectionResult = await campaignInjectorService.injectCampaigns(suggestions);
    suggestions = injectionResult.suggestions;

    // Log campaign injection telemetry if any were injected
    if (injectionResult.injectedCount > 0) {
      await telemetryService.logEvent({
        eventType: 'SUGGESTION_BOT_CAMPAIGN_INJECTED',
        origin: 'suggestion-bot',
        metadata: { injectedCount: injectionResult.injectedCount, marketplaces: injectionResult.marketplaces }
      });
    }

    // 5. Save to cache
    await suggestionCacheService.saveCache(suggestions, inputContext);

    console.log('[TelegramSuggestionOrchestrator] Suggestions generated and cached successfully');

    // Apply Google Search URLs before returning
    return this.applyGoogleSearchUrls(suggestions);
  }

  /**
   * Generate suggestions using Perplexity AI
   */
  private async generateSuggestionsWithAI(inputContext: InputContext): Promise<MarketplaceSuggestions> {
    console.log('[TelegramSuggestionOrchestrator] Calling Perplexity AI');

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(inputContext);

    const messages: PerplexityMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let attempt = 0;
    let lastError: string[] = [];

    console.log('[TelegramSuggestionOrchestrator] Starting AI generation loop, max attempts:', MAX_REPAIR_ATTEMPTS);

    while (attempt < MAX_REPAIR_ATTEMPTS) {
      attempt++;
      console.log('[TelegramSuggestionOrchestrator] Attempt', attempt, 'of', MAX_REPAIR_ATTEMPTS);

      try {
        console.log('[TelegramSuggestionOrchestrator] Calling Perplexity API...');
        const responseContent = await perplexityClientService.callWithRetry({
          model: PERPLEXITY_MODEL,
          messages,
          temperature: 0.3,
          max_tokens: 4000,
        });

        // Extract JSON from response
        console.log('[TelegramSuggestionOrchestrator] Perplexity response received, extracting JSON...');
        const jsonData = this.extractJSON(responseContent);

        if (!jsonData) {
          console.error('[TelegramSuggestionOrchestrator] Failed to extract JSON from response');
          console.error('[TelegramSuggestionOrchestrator] Raw response (first 500 chars):', responseContent.substring(0, 500));
          throw new Error('Failed to extract JSON from AI response');
        }
        console.log('[TelegramSuggestionOrchestrator] JSON extracted successfully');

        // Validate JSON
        console.log('[TelegramSuggestionOrchestrator] Validating JSON...');
        const validation = jsonValidatorService.validate(jsonData);
        console.log('[TelegramSuggestionOrchestrator] Validation result:', validation.valid ? 'VALID' : 'INVALID');

        if (validation.valid) {
          console.log('[TelegramSuggestionOrchestrator] AI suggestions validated successfully');
          return jsonData as MarketplaceSuggestions;
        }

        // Validation failed
        console.warn(`[TelegramSuggestionOrchestrator] Validation failed (attempt ${attempt}/${MAX_REPAIR_ATTEMPTS}):`, validation.errors);
        lastError = validation.errors;

        // Log repair mode triggered telemetry
        await telemetryService.logEvent({
          eventType: 'SUGGESTION_BOT_REPAIR_MODE_TRIGGERED',
          origin: 'suggestion-bot',
          metadata: { attempt, maxAttempts: MAX_REPAIR_ATTEMPTS, errors: validation.errors }
        });

        // Try to repair
        console.log('[TelegramSuggestionOrchestrator] Attempting to repair JSON...');
        const repaired = jsonValidatorService.repair(jsonData);

        if (repaired) {
          console.log('[TelegramSuggestionOrchestrator] JSON repaired, validating repaired data...');

          // Validate repaired data
          const repairedValidation = jsonValidatorService.validate(repaired);
          console.log('[TelegramSuggestionOrchestrator] Repaired validation result:', repairedValidation.valid ? 'VALID' : 'INVALID');

          if (repairedValidation.valid) {
            // Log repair mode success telemetry
            await telemetryService.logEvent({
              eventType: 'SUGGESTION_BOT_REPAIR_MODE_SUCCEEDED',
              origin: 'suggestion-bot',
              metadata: { attempt, repairMethod: 'json-validator' }
            });
            return repaired;
          }
        }

        // If this was the last attempt, use repaired data anyway
        if (attempt >= MAX_REPAIR_ATTEMPTS && repaired) {
          console.warn('[TelegramSuggestionOrchestrator] Max repair attempts reached, using repaired data with potential issues');
          return repaired;
        }

        // Add repair instructions to messages and retry
        messages.push({
          role: 'assistant',
          content: responseContent,
        });
        messages.push({
          role: 'user',
          content: `Your previous response had validation errors:\n${validation.errors.join('\n')}\n\nPlease fix these issues and return a corrected JSON response.`,
        });

      } catch (error) {
        console.error(`[TelegramSuggestionOrchestrator] Error on attempt ${attempt}:`, error);

        if (attempt >= MAX_REPAIR_ATTEMPTS) {
          throw new Error(`Failed to generate suggestions after ${MAX_REPAIR_ATTEMPTS} attempts: ${error}`);
        }
      }
    }

    throw new Error(`Failed to generate valid suggestions after ${MAX_REPAIR_ATTEMPTS} attempts. Last errors: ${lastError.join(', ')}`);
  }

  /**
   * Build system prompt for Perplexity
   */
  private buildSystemPrompt(): string {
    return `You are a product suggestion expert for Brazilian affiliate marketers.

Your task is to research and suggest 5 trending products for each of these 4 Brazilian marketplaces:
- Mercado Livre
- Shopee
- Amazon Brasil
- Magazine Luiza (Magalu)

CRITICAL RULES:
1. Return ONLY valid JSON, no extra text
2. Each marketplace must have EXACTLY 5 products
3. Each product must include: title, search_term, hook_angle, category, estimated_price
4. search_term should be a concise search query to find this product (e.g., "fone bluetooth tws anker")
5. Categories must be one of: ${SUGGESTION_CONSTANTS.ALLOWED_CATEGORIES.join(', ')}
6. Focus on products with high affiliate potential (popular, good reviews, reasonable price)
7. hook_angle should be a creative angle for promoting the product in Portuguese (e.g., "antes/depois", "economia de até 50%", "o queridinho do TikTok")

JSON FORMAT:
{
  "MERCADO_LIVRE": [
    {
      "title": "Fone Bluetooth TWS Anker Soundcore",
      "search_term": "fone bluetooth tws anker soundcore",
      "hook_angle": "Qualidade premium por metade do preço",
      "category": "Eletrônicos",
      "estimated_price": "R$ 150–250"
    }
  ],
  "SHOPEE": [...],
  "AMAZON": [...],
  "MAGALU": [...]
}`;
  }

  /**
   * Build user prompt with InputContext
   */
  private buildUserPrompt(inputContext: InputContext): string {
    let prompt = `Research and suggest trending products for Brazilian affiliate marketers.\n\n`;

    // Add persona insights
    if (inputContext.dominantPersonas.length > 0) {
      prompt += `TARGET AUDIENCE:\n`;
      inputContext.dominantPersonas.forEach(p => {
        prompt += `- ${p.name}: ${p.share.toFixed(0)}%\n`;
      });
      prompt += `\n`;
    }

    // Add category preferences
    if (inputContext.dominantCategories.length > 0) {
      prompt += `PREFERRED CATEGORIES (prioritize these):\n`;
      inputContext.dominantCategories.forEach(c => {
        prompt += `- ${c.name}: ${c.share.toFixed(0)}%\n`;
      });
      prompt += `\n`;
    }

    if (inputContext.secondaryCategories.length > 0) {
      prompt += `SECONDARY CATEGORIES (use 1-2 products):\n`;
      inputContext.secondaryCategories.forEach(c => {
        prompt += `- ${c.name}\n`;
      });
      prompt += `\n`;
    }

    if (inputContext.avoidCategories.length > 0) {
      prompt += `AVOID THESE CATEGORIES (low performance):\n`;
      inputContext.avoidCategories.forEach(c => {
        prompt += `- ${c}\n`;
      });
      prompt += `\n`;
    }

    // Add hook angle insights
    if (inputContext.topCTRPatterns.length > 0) {
      prompt += `SUCCESSFUL HOOK ANGLES (use similar approaches):\n`;
      inputContext.topCTRPatterns.forEach(p => {
        prompt += `- ${p.pattern}: ${p.ctr.toFixed(1)}% CTR\n`;
      });
      prompt += `\n`;
    }

    // Add product pattern insights
    if (inputContext.topProductPatterns.length > 0) {
      prompt += `TOP PERFORMING PRODUCT TYPES:\n`;
      inputContext.topProductPatterns.forEach(p => {
        prompt += `- ${p.pattern}: ${p.clicks} clicks\n`;
      });
      prompt += `\n`;
    }

    // Add price guidance
    prompt += `TARGET PRICE RANGES:\n`;
    prompt += `- Mercado Livre: ${SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.MERCADO_LIVRE.join(', ')}\n`;
    prompt += `- Shopee: ${SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.SHOPEE.join(', ')}\n`;
    prompt += `- Amazon: ${SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.AMAZON.join(', ')}\n`;
    prompt += `- Magalu: ${SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.MAGALU.join(', ')}\n`;
    prompt += `\n`;

    prompt += `Find trending products TODAY that match these insights. Return ONLY the JSON response, no extra text.`;

    return prompt;
  }

  /**
   * Extract JSON from AI response
   */
  private extractJSON(content: string): any {
    try {
      // Try to parse directly first
      return JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to find JSON object in text
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }

      return null;
    }
  }

  /**
   * Generate Google Search URL for a product in a specific marketplace
   * Uses site: restriction to limit results to that marketplace
   */
  generateGoogleSearchUrl(searchTerm: string, marketplace: Marketplace): string {
    const site = SUGGESTION_CONSTANTS.MARKETPLACE_SITES[marketplace];
    const query = `${searchTerm} site:${site}`;
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  /**
   * Apply Google Search URLs to all suggestions
   * This populates the url field based on search_term + marketplace
   */
  applyGoogleSearchUrls(suggestions: MarketplaceSuggestions): MarketplaceSuggestions {
    console.log('[TelegramSuggestionOrchestrator] Applying Google Search URLs to suggestions');

    const withUrls: MarketplaceSuggestions = {
      MERCADO_LIVRE: [],
      SHOPEE: [],
      AMAZON: [],
      MAGALU: [],
    };

    for (const marketplace of SUGGESTION_CONSTANTS.MARKETPLACES) {
      withUrls[marketplace] = suggestions[marketplace].map((suggestion: ProductSuggestion) => ({
        ...suggestion,
        url: suggestion.url || this.generateGoogleSearchUrl(suggestion.search_term, marketplace),
      }));
    }

    return withUrls;
  }
}

export const telegramSuggestionOrchestratorService = new TelegramSuggestionOrchestratorService();

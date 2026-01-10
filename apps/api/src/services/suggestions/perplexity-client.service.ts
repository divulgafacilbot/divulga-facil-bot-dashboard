import type { PerplexityRequest, PerplexityResponse } from '../../types/suggestions.types';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export class PerplexityClientService {
  /**
   * Call Perplexity API
   */
  async call(request: PerplexityRequest): Promise<string> {
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    console.log('[PerplexityClient] Calling Perplexity API with model:', request.model);

    try {
      const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data: PerplexityResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('Perplexity API returned no choices');
      }

      const content = data.choices[0].message.content;

      console.log('[PerplexityClient] Success. Tokens used:', data.usage.total_tokens);

      return content;
    } catch (error) {
      console.error('[PerplexityClient] Error:', error);
      throw error;
    }
  }

  /**
   * Call Perplexity with retry logic
   */
  async callWithRetry(request: PerplexityRequest, maxRetries = 3): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.call(request);
      } catch (error) {
        lastError = error as Error;
        console.error(`[PerplexityClient] Attempt ${attempt}/${maxRetries} failed:`, error);

        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`[PerplexityClient] Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError || new Error('Perplexity API call failed after retries');
  }
}

export const perplexityClientService = new PerplexityClientService();

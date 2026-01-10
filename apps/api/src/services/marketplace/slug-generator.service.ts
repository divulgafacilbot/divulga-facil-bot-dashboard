import crypto from 'crypto';

/**
 * Marketplace prefix mapping
 */
const MARKETPLACE_PREFIXES: Record<string, string> = {
  SHOPEE: 'sp',
  AMAZON: 'az',
  MERCADO_LIVRE: 'ml',
  ALIEXPRESS: 'ae',
  MAGALU: 'mg',
  AMERICANAS: 'am',
  SHEIN: 'sh',
  DEFAULT: 'mp',
};

/**
 * Slug Generator Service
 * Generates unique slugs for marketplace products
 * Format: {prefix}-{random11chars}
 */
export class SlugGeneratorService {
  /**
   * Generate a unique slug for a marketplace product
   * @param marketplace - The marketplace name (e.g., 'SHOPEE', 'AMAZON')
   * @returns Slug in format: prefix-random11chars (e.g., 'sp-a3f8d9e2b1c')
   */
  generateSlug(marketplace: string): string {
    const prefix = MARKETPLACE_PREFIXES[marketplace] || MARKETPLACE_PREFIXES.DEFAULT;
    const randomPart = this.generateRandomString(11);
    return `${prefix}-${randomPart}`;
  }

  /**
   * Generate a random alphanumeric string
   * @param length - Length of the random string
   * @returns Random string
   */
  private generateRandomString(length: number): string {
    const bytes = crypto.randomBytes(Math.ceil(length / 2));
    return bytes.toString('hex').slice(0, length);
  }

  /**
   * Validate slug format
   * @param slug - Slug to validate
   * @returns True if valid, false otherwise
   */
  isValidSlug(slug: string): boolean {
    // Format: {2-3 chars}-{11 chars}
    const slugRegex = /^[a-z]{2,3}-[a-f0-9]{11}$/;
    return slugRegex.test(slug);
  }

  /**
   * Extract marketplace prefix from slug
   * @param slug - Slug to extract from
   * @returns Marketplace prefix or null
   */
  extractPrefix(slug: string): string | null {
    if (!this.isValidSlug(slug)) return null;
    return slug.split('-')[0];
  }

  /**
   * Get marketplace name from prefix
   * @param prefix - Marketplace prefix
   * @returns Marketplace name or null
   */
  getMarketplaceFromPrefix(prefix: string): string | null {
    for (const [marketplace, mktPrefix] of Object.entries(MARKETPLACE_PREFIXES)) {
      if (mktPrefix === prefix) {
        return marketplace;
      }
    }
    return null;
  }
}

export const slugGeneratorService = new SlugGeneratorService();

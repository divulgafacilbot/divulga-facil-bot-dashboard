/**
 * Pagination constants
 * Centralized pagination limits for consistency across the app
 */

export const PAGINATION = {
  DEFAULT_LIMIT: 12,
  DEFAULT_PAGE: 1,
  MAX_LIMIT: 100,
} as const;

export type PaginationLimit = typeof PAGINATION[keyof typeof PAGINATION];

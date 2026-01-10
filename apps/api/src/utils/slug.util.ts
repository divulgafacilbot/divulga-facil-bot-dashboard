import { prisma } from '../db/prisma.js';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

const RESERVED_WORDS = [
  'admin', 'api', 'dashboard', 'auth', 'login', 'signup',
  'public', 'robots.txt', 'sitemap.xml', 'r', 'assets',
  'static', 'favicon.ico', 'terms', 'privacy'
];

/**
 * Normalize email local part to slug
 * Rules:
 * 1. lowercase
 * 2. remove accents (NFKD normalization)
 * 3. replace non-alphanumeric with '-'
 * 4. collapse multiple hyphens
 * 5. trim hyphens from start/end
 * 6. min: 3 chars, max: 24 chars
 * 7. if < 3 chars → generate 'user-<random6>'
 * 8. reserved words → prefix with 'u-'
 */
export function normalizeSlug(emailLocalPart: string): string {
  if (!emailLocalPart || emailLocalPart.trim() === '') {
    return `user-${nanoid()}`;
  }

  // Normalize and clean
  let slug = emailLocalPart
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with '-'
    .replace(/-+/g, '-')             // Collapse multiple hyphens
    .replace(/^-|-$/g, '');          // Trim hyphens

  // Truncate to max 24 chars
  slug = slug.substring(0, 24);

  // Handle too short
  if (slug.length < 3) {
    return `user-${nanoid()}`;
  }

  // Handle reserved words
  if (RESERVED_WORDS.includes(slug)) {
    slug = `u-${slug}`;
  }

  return slug;
}

/**
 * Generate unique slug with collision handling
 * Try: candidate, candidate1, candidate2, ... up to 10 attempts
 * If all fail → generate random 'user-<random>'
 */
export async function generateUniqueSlug(
  emailLocalPart: string,
  maxAttempts = 10
): Promise<string> {
  const baseSlug = normalizeSlug(emailLocalPart);

  // Try base slug first
  const existingBase = await prisma.public_page_settings.findUnique({
    where: { public_slug: baseSlug }
  });

  if (!existingBase) {
    return baseSlug;
  }

  // Try with numeric suffixes
  for (let i = 1; i <= maxAttempts; i++) {
    const candidateSlug = `${baseSlug}${i}`;

    const existing = await prisma.public_page_settings.findUnique({
      where: { public_slug: candidateSlug }
    });

    if (!existing) {
      return candidateSlug;
    }
  }

  // All attempts failed → random fallback
  return `user-${nanoid()}`;
}

/**
 * Validate slug format
 */
export function validateSlug(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 30) {
    return false;
  }

  // Must match pattern: alphanumeric + hyphens, no leading/trailing hyphens
  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
}

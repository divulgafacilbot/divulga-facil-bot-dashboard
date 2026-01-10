import { prisma } from '../db/prisma.js';

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
function normalizeSlug(emailLocalPart: string): string {
  const RESERVED_WORDS = [
    'admin', 'api', 'dashboard', 'auth', 'login', 'signup',
    'public', 'robots.txt', 'sitemap.xml', 'r', 'assets',
    'static', 'favicon.ico', 'terms', 'privacy'
  ];

  if (!emailLocalPart || emailLocalPart.trim() === '') {
    return `user-${Math.random().toString(36).substring(2, 8)}`;
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
    return `user-${Math.random().toString(36).substring(2, 8)}`;
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
async function generateUniqueSlug(
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
  return `user-${Math.random().toString(36).substring(2, 8)}`;
}

async function backfillPublicPageSettings() {
  console.log('🔄 Starting backfill of public_page_settings...');

  const users = await prisma.user.findMany({
    where: {
      public_page_settings: null
    },
    select: {
      id: true,
      email: true
    }
  });

  console.log(`Found ${users.length} users without public_page_settings`);

  let created = 0;
  let errors = 0;

  for (const user of users) {
    try {
      const emailLocalPart = user.email.split('@')[0];
      const publicSlug = await generateUniqueSlug(emailLocalPart);

      await prisma.public_page_settings.create({
        data: {
          user_id: user.id,
          public_slug: publicSlug,
          display_name: publicSlug,
        }
      });

      created++;
      console.log(`✅ Created settings for user ${user.email} → slug: ${publicSlug}`);
    } catch (error) {
      errors++;
      console.error(`❌ Failed for user ${user.email}:`, error);
    }
  }

  console.log(`\n✅ Backfill complete: ${created} created, ${errors} errors`);
}

backfillPublicPageSettings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

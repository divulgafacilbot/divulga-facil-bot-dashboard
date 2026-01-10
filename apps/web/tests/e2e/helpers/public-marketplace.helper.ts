/**
 * Helper functions for public marketplace E2E tests
 * Used to set up test data and clean up after tests
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  slug: string;
}

export interface TestCard {
  id: string;
  slug: string;
  title: string;
  price: string;
  imageUrl: string;
  marketplace: string;
}

/**
 * Create a test user with public page settings
 */
export async function createTestUser(overrides?: Partial<TestUser>): Promise<TestUser> {
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'Test1234!',
    slug: `test-user-${Date.now()}`,
    ...overrides
  };

  // In real implementation, this would call the API to create a user
  // For now, we'll assume the user exists or mock it
  return {
    id: 'test-user-id',
    email: defaultUser.email,
    password: defaultUser.password,
    slug: defaultUser.slug
  };
}

/**
 * Create a test product card
 */
export async function createTestCard(
  userId: string,
  overrides?: Partial<TestCard>
): Promise<TestCard> {
  const defaultCard = {
    title: `Test Product ${Date.now()}`,
    price: 'R$ 99,90',
    imageUrl: '/placeholder.png',
    marketplace: 'MERCADO_LIVRE',
    slug: `test-product-${Date.now()}`,
    ...overrides
  };

  // In real implementation, this would call the API to create a card
  return {
    id: 'test-card-id',
    slug: defaultCard.slug,
    title: defaultCard.title,
    price: defaultCard.price,
    imageUrl: defaultCard.imageUrl,
    marketplace: defaultCard.marketplace
  };
}

/**
 * Clean up test user and all associated data
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  // In real implementation, this would call the API to delete the user
  // and cascade delete all associated data
  console.log(`Cleaning up test user: ${userId}`);
}

/**
 * Wait for element with timeout
 */
export async function waitForElement(
  page: any,
  selector: string,
  timeout: number = 5000
): Promise<void> {
  await page.waitForSelector(selector, { timeout });
}

/**
 * Check if element exists without throwing
 */
export async function elementExists(page: any, selector: string): Promise<boolean> {
  const elements = await page.locator(selector).count();
  return elements > 0;
}

/**
 * Get visitor ID from cookie
 */
export async function getVisitorId(context: any): Promise<string | null> {
  const cookies = await context.cookies();
  const visitorCookie = cookies.find((c: any) => c.name === 'df_vid');
  return visitorCookie?.value || null;
}

/**
 * Mock tracking API responses
 */
export async function mockTrackingAPI(page: any): Promise<void> {
  await page.route('**/api/public/events', async (route: any) => {
    await route.fulfill({
      status: 204,
      body: ''
    });
  });
}

/**
 * Verify tracking event was sent with correct data
 */
export function verifyTrackingEvent(
  requests: any[],
  eventType: string,
  slug: string,
  cardSlug?: string
): boolean {
  return requests.some((req) => {
    if (!req.url().includes('/api/public/events')) return false;

    const postData = req.postData();
    if (!postData) return false;

    try {
      const data = JSON.parse(postData);
      if (data.eventType !== eventType) return false;
      if (data.slug !== slug) return false;
      if (cardSlug && data.cardSlug !== cardSlug) return false;
      return true;
    } catch {
      return false;
    }
  });
}

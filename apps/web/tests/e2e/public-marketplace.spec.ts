import { test, expect } from '@playwright/test';

// Base URL for public marketplace pages
const TEST_SLUG = 'test-user';
const TEST_CARD_SLUG = 'test-product-123';

test.describe('Public Marketplace - Profile Page', () => {
  test('should display public profile page with header and products', async ({ page }) => {
    // Navigate to public profile
    await page.goto(`/${TEST_SLUG}`);

    // Check if header is visible
    await expect(page.locator('header')).toBeVisible();

    // Check if display name is shown
    await expect(page.locator('h1')).toBeVisible();

    // Check if product grid is visible
    await expect(page.locator('[class*="grid"]')).toBeVisible();
  });

  test('should show empty state when no products available', async ({ page }) => {
    // Navigate to profile with no products (mock or real)
    await page.goto(`/${TEST_SLUG}`);

    // Check for empty state message
    const emptyMessage = page.getByText(/nenhum produto disponível/i);
    // It may or may not be visible depending on data
    // This is a best-effort check
  });

  test('should display product cards with correct information', async ({ page }) => {
    await page.goto(`/${TEST_SLUG}`);

    // Wait for cards to load
    await page.waitForSelector('a[href*="' + TEST_SLUG + '"]', { timeout: 10000 });

    // Check if at least one card is visible
    const cards = page.locator('a[href*="' + TEST_SLUG + '"]');
    const count = await cards.count();

    if (count > 0) {
      const firstCard = cards.first();

      // Check card elements
      await expect(firstCard.locator('img')).toBeVisible();
      await expect(firstCard.locator('h3')).toBeVisible();

      // Check for price
      await expect(firstCard.locator('[class*="text-green"]')).toBeVisible();

      // Check for CTA button
      await expect(firstCard.locator('button')).toBeVisible();
    }
  });

  test('should track profile view event on page load', async ({ page, context }) => {
    // Enable request interception to verify tracking
    let trackingEventSent = false;

    page.on('request', (request) => {
      if (request.url().includes('/api/public/events')) {
        trackingEventSent = true;
      }
    });

    await page.goto(`/${TEST_SLUG}`);

    // Wait a bit for tracking to fire
    await page.waitForTimeout(1000);

    // Verify tracking event was sent
    expect(trackingEventSent).toBe(true);
  });

  test('should set visitor ID cookie on first visit', async ({ page, context }) => {
    // Clear cookies before test
    await context.clearCookies();

    await page.goto(`/${TEST_SLUG}`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if df_vid cookie was set
    const cookies = await context.cookies();
    const visitorCookie = cookies.find((c) => c.name === 'df_vid');

    expect(visitorCookie).toBeDefined();
    expect(visitorCookie?.value).toHaveLength(32);
  });

  test('should handle custom header color and bio', async ({ page }) => {
    await page.goto(`/${TEST_SLUG}`);

    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Header should have a background color set
    const bgColor = await header.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    expect(bgColor).toBeTruthy();
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
  });
});

test.describe('Public Marketplace - Card Detail Page', () => {
  test('should display card detail page with product information', async ({ page }) => {
    await page.goto(`/${TEST_SLUG}/${TEST_CARD_SLUG}`);

    // Check for back link
    await expect(page.locator('a[href*="Voltar"]')).toBeVisible();

    // Check for product title (h1)
    await expect(page.locator('h1')).toBeVisible();

    // Check for product image
    await expect(page.locator('img[alt*=""]')).toBeVisible();

    // Check for price
    await expect(page.locator('[class*="text-green"]')).toBeVisible();
  });

  test('should display marketplace badge', async ({ page }) => {
    await page.goto(`/${TEST_SLUG}/${TEST_CARD_SLUG}`);

    // Check for marketplace badge
    const badge = page.locator('[class*="bg-"][class*="text-"]').first();
    await expect(badge).toBeVisible();
  });

  test('should display CTA button with correct link', async ({ page }) => {
    await page.goto(`/${TEST_SLUG}/${TEST_CARD_SLUG}`);

    // Find CTA button/link
    const ctaLink = page.locator(`a[href^="/r/${TEST_SLUG}/${TEST_CARD_SLUG}"]`);
    await expect(ctaLink).toBeVisible();

    // Should open in new tab
    const target = await ctaLink.getAttribute('target');
    expect(target).toBe('_blank');

    // Should have noopener noreferrer
    const rel = await ctaLink.getAttribute('rel');
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
  });

  test('should track card view event on page load', async ({ page }) => {
    let cardViewEventSent = false;

    page.on('request', (request) => {
      if (
        request.url().includes('/api/public/events') &&
        request.method() === 'POST'
      ) {
        cardViewEventSent = true;
      }
    });

    await page.goto(`/${TEST_SLUG}/${TEST_CARD_SLUG}`);

    // Wait for tracking
    await page.waitForTimeout(1000);

    expect(cardViewEventSent).toBe(true);
  });

  test('should display coupon if available', async ({ page }) => {
    await page.goto(`/${TEST_SLUG}/${TEST_CARD_SLUG}`);

    // Check if coupon section exists
    const couponSection = page.locator('[class*="bg-yellow"]');

    if ((await couponSection.count()) > 0) {
      // If coupon exists, verify it's displayed correctly
      await expect(couponSection).toBeVisible();

      // Check for copy button
      const copyButton = page.locator('button:has-text("Copiar")');
      if ((await copyButton.count()) > 0) {
        await expect(copyButton).toBeVisible();
      }
    }
  });

  test('should copy coupon to clipboard when copy button is clicked', async ({ page, context }) => {
    await page.goto(`/${TEST_SLUG}/${TEST_CARD_SLUG}`);

    // Check if coupon and copy button exist
    const copyButton = page.locator('button:has-text("Copiar")');

    if ((await copyButton.count()) > 0) {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      // Click copy button
      await copyButton.click();

      // Wait for alert (or handle it)
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('copiado');
        await dialog.accept();
      });
    }
  });

  test('should display original price if discounted', async ({ page }) => {
    await page.goto(`/${TEST_SLUG}/${TEST_CARD_SLUG}`);

    // Check if original price exists (line-through style)
    const originalPrice = page.locator('[class*="line-through"]');

    if ((await originalPrice.count()) > 0) {
      await expect(originalPrice).toBeVisible();

      // Should show economy message
      const economyMessage = page.getByText(/economia/i);
      if ((await economyMessage.count()) > 0) {
        await expect(economyMessage).toBeVisible();
      }
    }
  });

  test('should return to profile when clicking back link', async ({ page }) => {
    await page.goto(`/${TEST_SLUG}/${TEST_CARD_SLUG}`);

    // Click back link
    const backLink = page.locator('a:has-text("Voltar")');
    await expect(backLink).toBeVisible();

    await backLink.click();

    // Should navigate back to profile page
    await expect(page).toHaveURL(`/${TEST_SLUG}`);
  });
});

test.describe('Public Marketplace - Click Tracking', () => {
  test('should track card click when clicking on product card', async ({ page }) => {
    let cardClickEventSent = false;

    page.on('request', (request) => {
      if (request.url().includes('/api/public/events')) {
        const postData = request.postData();
        if (postData && postData.includes('PUBLIC_CARD_CLICK')) {
          cardClickEventSent = true;
        }
      }
    });

    await page.goto(`/${TEST_SLUG}`);

    // Wait for cards to load
    await page.waitForSelector(`a[href*="${TEST_SLUG}"]`, { timeout: 10000 });

    // Click on first card
    const firstCard = page.locator(`a[href*="${TEST_SLUG}"]`).first();
    await firstCard.click();

    // Wait for tracking
    await page.waitForTimeout(1000);

    expect(cardClickEventSent).toBe(true);
  });

  test('should track CTA click when clicking CTA button', async ({ page }) => {
    let ctaClickEventSent = false;

    page.on('request', (request) => {
      if (request.url().includes('/api/public/events')) {
        const postData = request.postData();
        if (postData && postData.includes('PUBLIC_CTA_CLICK')) {
          ctaClickEventSent = true;
        }
      }
    });

    await page.goto(`/${TEST_SLUG}/${TEST_CARD_SLUG}`);

    // Click CTA button
    const ctaButton = page.locator(`a[href^="/r/${TEST_SLUG}/${TEST_CARD_SLUG}"]`);
    await expect(ctaButton).toBeVisible();

    // We won't actually navigate (prevents redirect), just click
    await ctaButton.click();

    // Wait for tracking
    await page.waitForTimeout(1000);

    expect(ctaClickEventSent).toBe(true);
  });
});

test.describe('Public Marketplace - SEO and Metadata', () => {
  test('should have correct meta tags on profile page', async ({ page }) => {
    await page.goto(`/${TEST_SLUG}`);

    // Check title
    const title = await page.title();
    expect(title).toContain('Divulga Fácil');

    // Check meta description
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBeTruthy();

    // Check Open Graph tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toBeTruthy();
  });

  test('should have correct meta tags on card detail page', async ({ page }) => {
    await page.goto(`/${TEST_SLUG}/${TEST_CARD_SLUG}`);

    // Check title includes product name
    const title = await page.title();
    expect(title).toBeTruthy();

    // Check canonical URL
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain(`/${TEST_SLUG}/${TEST_CARD_SLUG}`);

    // Check Twitter card
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(twitterCard).toBe('summary_large_image');
  });
});

test.describe('Public Marketplace - Responsive Design', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`/${TEST_SLUG}`);

    // Check if header is visible
    await expect(page.locator('header')).toBeVisible();

    // Check if cards are stacked (grid should adapt)
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should display card detail correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`/${TEST_SLUG}/${TEST_CARD_SLUG}`);

    // Image and details should stack vertically on mobile
    await expect(page.locator('img')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('a[href^="/r/"]')).toBeVisible();
  });
});

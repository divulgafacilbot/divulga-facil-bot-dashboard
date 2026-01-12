import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Milestone 2: Dashboard de Gerenciamento
 *
 * Tests cover:
 * - Bot linking flow for all 4 bots
 * - Public page customization
 * - Manual card creation
 * - Dashboard analytics display
 */

test.describe('Milestone 2: Dashboard de Gerenciamento', () => {
  let testEmail: string;
  let testPassword: string;

  test.beforeEach(async ({ page }) => {
    // Generate unique test email
    testEmail = `test-milestone2-${Date.now()}@example.com`;
    testPassword = 'Test123!@#';

    // Navigate to registration page
    await page.goto('/register');

    // Register new user
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test.describe('Bot Linking Flow', () => {
    test('should display all 4 bots on Meus Bots page', async ({ page }) => {
      // Navigate to Meus Bots
      await page.click('a[href="/dashboard/meus-bots"]');
      await page.waitForURL('/dashboard/meus-bots');

      // Verify all 4 bots are displayed
      await expect(page.getByText('Bot de Promoções')).toBeVisible();
      await expect(page.getByText('Bot de Download')).toBeVisible();
      await expect(page.getByText('Bot de Pinterest')).toBeVisible();
      await expect(page.getByText('Bot de Sugestões')).toBeVisible();

      // Verify bot handles
      await expect(page.getByText('@DivulgaFacilArtesBot')).toBeVisible();
      await expect(page.getByText('@DivulgaFacilDownloadBot')).toBeVisible();
      await expect(page.getByText('@DivulgaFacilPinterestBot')).toBeVisible();
      await expect(page.getByText('@DivulgaFacilSugestaoBot')).toBeVisible();
    });

    test('should generate token for ARTS bot', async ({ page }) => {
      await page.click('a[href="/dashboard/meus-bots"]');
      await page.waitForURL('/dashboard/meus-bots');

      // Find ARTS bot section and click generate token
      const artsSection = page.locator('div', {
        has: page.getByText('Bot de Promoções'),
      });
      await artsSection.getByRole('button', { name: /gerar token/i }).click();

      // Wait for token to appear
      await expect(artsSection.locator('code').first()).toBeVisible();

      // Verify token is 10 characters
      const tokenText = await artsSection.locator('code').first().textContent();
      expect(tokenText).toHaveLength(10);

      // Verify instructions are shown
      await expect(artsSection.getByText(/envie o comando/i)).toBeVisible();
    });

    test('should generate different tokens for different bots', async ({ page }) => {
      await page.click('a[href="/dashboard/meus-bots"]');
      await page.waitForURL('/dashboard/meus-bots');

      // Generate token for ARTS bot
      const artsSection = page.locator('div', {
        has: page.getByText('Bot de Promoções'),
      });
      await artsSection.getByRole('button', { name: /gerar token/i }).click();
      await page.waitForTimeout(500);
      const artsToken = await artsSection.locator('code').first().textContent();

      // Generate token for DOWNLOAD bot
      const downloadSection = page.locator('div', {
        has: page.getByText('Bot de Download'),
      });
      await downloadSection.getByRole('button', { name: /gerar token/i }).click();
      await page.waitForTimeout(500);
      const downloadToken = await downloadSection.locator('code').first().textContent();

      // Verify tokens are different
      expect(artsToken).not.toBe(downloadToken);
    });

    test('should show expiration warning for tokens', async ({ page }) => {
      await page.click('a[href="/dashboard/meus-bots"]');
      await page.waitForURL('/dashboard/meus-bots');

      // Generate token
      const artsSection = page.locator('div', {
        has: page.getByText('Bot de Promoções'),
      });
      await artsSection.getByRole('button', { name: /gerar token/i }).click();

      // Verify expiration message
      await expect(
        artsSection.getByText(/válido por 10 minutos/i)
      ).toBeVisible();
    });
  });

  test.describe('Página Pública Management', () => {
    test('should navigate to Página Pública page', async ({ page }) => {
      await page.click('a[href="/dashboard/pagina-publica"]');
      await page.waitForURL('/dashboard/pagina-publica');

      // Verify page header
      await expect(page.getByRole('heading', { name: /página pública/i })).toBeVisible();

      // Verify "Visualizar Página" link exists
      await expect(page.getByText(/visualizar página/i)).toBeVisible();
    });

    test('should update display name', async ({ page }) => {
      await page.click('a[href="/dashboard/pagina-publica"]');
      await page.waitForURL('/dashboard/pagina-publica');

      // Find and fill display name input
      const displayNameInput = page.locator('input[type="text"]').first();
      await displayNameInput.clear();
      await displayNameInput.fill('My Test Store');
      await displayNameInput.blur();

      // Wait for update
      await page.waitForTimeout(1000);

      // Verify success (could check for alert or reload page to verify)
      await page.reload();
      await expect(displayNameInput).toHaveValue('My Test Store');
    });

    test('should update header color', async ({ page }) => {
      await page.click('a[href="/dashboard/pagina-publica"]');
      await page.waitForURL('/dashboard/pagina-publica');

      // Find color input
      const colorInput = page.locator('input[type="color"]').first();
      await colorInput.fill('#00FF00');
      await colorInput.blur();

      // Wait for update
      await page.waitForTimeout(1000);

      // Verify color was updated
      await page.reload();
      await expect(colorInput).toHaveValue('#00ff00');
    });

    test('should update bio', async ({ page }) => {
      await page.click('a[href="/dashboard/pagina-publica"]');
      await page.waitForURL('/dashboard/pagina-publica');

      // Find bio textarea
      const bioTextarea = page.locator('textarea');
      await bioTextarea.clear();
      await bioTextarea.fill('Welcome to my amazing store! Find the best deals here.');
      await bioTextarea.blur();

      // Wait for update
      await page.waitForTimeout(1000);

      // Verify bio was updated
      await page.reload();
      await expect(bioTextarea).toHaveValue(
        'Welcome to my amazing store! Find the best deals here.'
      );
    });

    test('should show character count for bio', async ({ page }) => {
      await page.click('a[href="/dashboard/pagina-publica"]');
      await page.waitForURL('/dashboard/pagina-publica');

      // Find bio textarea
      const bioTextarea = page.locator('textarea');
      await bioTextarea.clear();
      await bioTextarea.fill('Test bio');

      // Verify character count is displayed
      await expect(page.getByText(/8\/500/)).toBeVisible();
    });

    test('should open card creation form', async ({ page }) => {
      await page.click('a[href="/dashboard/pagina-publica"]');
      await page.waitForURL('/dashboard/pagina-publica');

      // Click add card button
      await page.getByRole('button', { name: /adicionar card/i }).click();

      // Verify form appears
      await expect(page.getByPlaceholder(/título/i)).toBeVisible();
      await expect(page.getByPlaceholder(/preço/i)).toBeVisible();
      await expect(page.locator('input[type="file"]')).toBeVisible();
    });

    test('should create a manual card', async ({ page }) => {
      await page.click('a[href="/dashboard/pagina-publica"]');
      await page.waitForURL('/dashboard/pagina-publica');

      // Open card form
      await page.getByRole('button', { name: /adicionar card/i }).click();

      // Fill form
      await page.getByPlaceholder(/título/i).fill('Test Product');
      await page.locator('input[placeholder*="Preço"]').fill('R$ 99,90');
      await page.locator('input[placeholder*="Preço original"]').fill('R$ 149,90');
      await page
        .locator('input[placeholder*="Link do produto"]')
        .fill('https://example.com/product');
      await page.getByPlaceholder(/cupom/i).fill('SAVE10');
      await page.getByPlaceholder(/descrição/i).fill('Amazing test product');

      // Upload test image (create a simple 1x1 PNG)
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64'
      );

      await page
        .locator('input[type="file"]')
        .setInputFiles({
          name: 'test-image.png',
          mimeType: 'image/png',
          buffer: testImageBuffer,
        });

      // Submit form
      await page.getByRole('button', { name: /salvar card/i }).click();

      // Wait for success and form to close
      await page.waitForTimeout(2000);

      // Verify card appears in list
      await expect(page.getByText('Test Product')).toBeVisible();
      await expect(page.getByText('R$ 99,90')).toBeVisible();
    });

    test('should toggle card status', async ({ page }) => {
      await page.click('a[href="/dashboard/pagina-publica"]');
      await page.waitForURL('/dashboard/pagina-publica');

      // Create a card first
      await page.getByRole('button', { name: /adicionar card/i }).click();
      await page.getByPlaceholder(/título/i).fill('Toggle Test Card');
      await page.locator('input[placeholder*="Preço"]').fill('R$ 50,00');
      await page
        .locator('input[placeholder*="Link do produto"]')
        .fill('https://example.com/toggle');

      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64'
      );

      await page.locator('input[type="file"]').setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: testImageBuffer,
      });

      await page.getByRole('button', { name: /salvar card/i }).click();
      await page.waitForTimeout(2000);

      // Find the card and toggle status
      const cardSection = page.locator('div', {
        has: page.getByText('Toggle Test Card'),
      });

      // Verify ACTIVE status
      await expect(cardSection.getByText('ACTIVE')).toBeVisible();

      // Click hide button
      await cardSection.getByRole('button', { name: /ocultar/i }).click();
      await page.waitForTimeout(1000);

      // Reload and verify status changed
      await page.reload();
      await expect(
        page.locator('div', { has: page.getByText('Toggle Test Card') }).getByText('HIDDEN')
      ).toBeVisible();
    });

    test('should delete a card', async ({ page }) => {
      await page.click('a[href="/dashboard/pagina-publica"]');
      await page.waitForURL('/dashboard/pagina-publica');

      // Create a card
      await page.getByRole('button', { name: /adicionar card/i }).click();
      await page.getByPlaceholder(/título/i).fill('Delete Test Card');
      await page.locator('input[placeholder*="Preço"]').fill('R$ 75,00');
      await page
        .locator('input[placeholder*="Link do produto"]')
        .fill('https://example.com/delete');

      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64'
      );

      await page.locator('input[type="file"]').setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: testImageBuffer,
      });

      await page.getByRole('button', { name: /salvar card/i }).click();
      await page.waitForTimeout(2000);

      // Find and delete card
      const cardSection = page.locator('div', {
        has: page.getByText('Delete Test Card'),
      });

      // Setup dialog handler before clicking delete
      page.on('dialog', (dialog) => dialog.accept());
      await cardSection.getByRole('button', { name: /remover/i }).click();

      // Wait for deletion
      await page.waitForTimeout(1000);

      // Verify card is gone
      await expect(page.getByText('Delete Test Card')).not.toBeVisible();
    });
  });

  test.describe('Dashboard Analytics', () => {
    test('should display bot metrics on dashboard', async ({ page }) => {
      // Verify dashboard displays bot counters
      await expect(page.getByText(/bots de arte ativos/i)).toBeVisible();
      await expect(page.getByText(/bots de download ativos/i)).toBeVisible();

      // Verify counters show numbers (default 0)
      await expect(page.locator('#contador-de-bots-de-artes-ativos')).toBeVisible();
      await expect(page.locator('#contador-de-bots-de-download-ativos')).toBeVisible();
    });

    test('should display usage metrics', async ({ page }) => {
      // Verify usage metrics are displayed
      await expect(page.getByText(/artes geradas/i)).toBeVisible();
      await expect(page.getByText(/quantidade de downloads/i)).toBeVisible();

      // Verify counters
      await expect(page.locator('#contador-de-artes-geradas')).toBeVisible();
      await expect(page.locator('#contador-de-downloads-gerados')).toBeVisible();
    });

    test('should display public page analytics when available', async ({ page }) => {
      // Note: Public page analytics card only appears when there's data
      // For new users, this section may not be visible
      // This test just verifies the page loads without errors
      await expect(page.getByRole('heading', { name: /visão geral/i })).toBeVisible();
    });

    test('should show quick actions section', async ({ page }) => {
      // Verify quick actions are displayed
      await expect(page.getByRole('heading', { name: /primeiros passos/i })).toBeVisible();

      // Verify action links
      await expect(page.getByText(/criar primeiro bot/i)).toBeVisible();
      await expect(page.getByText(/personalizar templates/i)).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between dashboard pages', async ({ page }) => {
      // Test Meus Bots navigation
      await page.click('a[href="/dashboard/meus-bots"]');
      await expect(page).toHaveURL('/dashboard/meus-bots');
      await expect(page.getByRole('heading', { name: /meus bots/i })).toBeVisible();

      // Test Página Pública navigation
      await page.click('a[href="/dashboard/pagina-publica"]');
      await expect(page).toHaveURL('/dashboard/pagina-publica');
      await expect(page.getByRole('heading', { name: /página pública/i })).toBeVisible();

      // Test Ajuda navigation
      await page.click('a[href="/dashboard/ajuda"]');
      await expect(page).toHaveURL('/dashboard/ajuda');
      await expect(page.getByRole('heading', { name: /central de ajuda/i })).toBeVisible();

      // Return to dashboard
      await page.click('a[href="/dashboard"]');
      await expect(page).toHaveURL('/dashboard');
    });

    test('should display user email in sidebar', async ({ page }) => {
      // Verify sidebar shows user email
      await expect(page.getByText(testEmail)).toBeVisible();
    });
  });

  test.describe('Help/FAQ Page', () => {
    test('should display FAQ for all 4 bots', async ({ page }) => {
      await page.click('a[href="/dashboard/ajuda"]');
      await page.waitForURL('/dashboard/ajuda');

      // Verify sections for each bot
      await expect(page.getByRole('heading', { name: /bot de artes/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /bot de download/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /bot de pinterest/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /bot de sugestões/i })).toBeVisible();

      // Verify general questions section
      await expect(
        page.getByRole('heading', { name: /perguntas gerais/i })
      ).toBeVisible();

      // Verify subscription section
      await expect(
        page.getByRole('heading', { name: /assinatura e limites/i })
      ).toBeVisible();
    });

    test('should display bot linking instructions in FAQ', async ({ page }) => {
      await page.click('a[href="/dashboard/ajuda"]');
      await page.waitForURL('/dashboard/ajuda');

      // Verify linking instructions exist
      await expect(page.getByText(/como funciona a vinculação de bots/i)).toBeVisible();
      await expect(page.getByText(/gerar token/i)).toBeVisible();
      await expect(page.getByText(/\/codigo/i)).toBeVisible();
    });
  });
});

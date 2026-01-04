import { test, expect, Page } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://localhost:3000';

interface TestUser {
  id: string;
  email: string;
  password: string;
  token: string;
}

interface TestAdmin {
  id: string;
  email: string;
  password: string;
  token: string;
}

interface TestCampaign {
  id: string;
  name: string;
  price: number;
  product_url: string;
  main_video_url: string;
}

let testUser: TestUser;
let testAdmin: TestAdmin;
let createdCampaignId: string;

async function setupTestDatabase() {
  const rootDir = path.resolve(__dirname, '../../../../..');
  const apiDir = path.join(rootDir, 'apps/api');

  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

  try {
    execSync('npx prisma db push --skip-generate', {
      cwd: apiDir,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL }
    });
  } catch (error) {
    console.error('Failed to setup test database:', error);
  }
}

async function createTestUser(): Promise<TestUser> {
  const email = `test-user-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const registerData = await registerResponse.json();

  const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const loginData = await loginResponse.json();

  return {
    id: registerData.data?.id || loginData.data?.user?.id,
    email,
    password,
    token: loginData.data?.accessToken,
  };
}

async function createTestAdmin(): Promise<TestAdmin> {
  const email = `test-admin-${Date.now()}@example.com`;
  const password = 'AdminPassword123!';
  const name = 'Test Admin';

  const response = await fetch(`${API_BASE_URL}/api/admin/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  const data = await response.json();

  const loginResponse = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const loginData = await loginResponse.json();

  return {
    id: data.data?.id || loginData.data?.id,
    email,
    password,
    token: loginData.data?.token,
  };
}

async function loginAsAdmin(page: Page, admin: TestAdmin) {
  await page.goto(`${WEB_BASE_URL}/admin/login`);
  await page.fill('input[type="email"]', admin.email);
  await page.fill('input[type="password"]', admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${WEB_BASE_URL}/admin/**`, { timeout: 10000 });
}

async function loginAsUser(page: Page, user: TestUser) {
  await page.goto(`${WEB_BASE_URL}/login`);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${WEB_BASE_URL}/dashboard`, { timeout: 10000 });
}

async function createTestCampaign(admin: TestAdmin): Promise<TestCampaign> {
  const formData = new FormData();
  formData.append('name', `Test Campaign ${Date.now()}`);
  formData.append('price', '99.90');
  formData.append('product_url', 'https://example.com/product');
  formData.append('main_video_url', 'https://example.com/video.mp4');

  const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
  if (!fs.existsSync(path.dirname(testImagePath))) {
    fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
  }

  if (!fs.existsSync(testImagePath)) {
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, buffer);
  }

  const imageBlob = new Blob([fs.readFileSync(testImagePath)], { type: 'image/jpeg' });
  formData.append('assets', imageBlob, 'test-image.jpg');

  const response = await fetch(`${API_BASE_URL}/api/admin/campaigns`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${admin.token}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data.data;
}

async function cleanupTestData() {
  try {
    if (createdCampaignId && testAdmin?.token) {
      await fetch(`${API_BASE_URL}/api/admin/campaigns/${createdCampaignId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${testAdmin.token}` },
      });
    }

    if (testUser?.id) {
      await fetch(`${API_BASE_URL}/api/user/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${testUser.token}` },
      });
    }

    if (testAdmin?.id) {
      await fetch(`${API_BASE_URL}/api/admin/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${testAdmin.token}` },
      });
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

test.beforeAll(async () => {
  await setupTestDatabase();
  testUser = await createTestUser();
  testAdmin = await createTestAdmin();
});

test.afterAll(async () => {
  await cleanupTestData();
});

test.describe('Promotional Campaigns - Admin Flow', () => {
  test('admin can access campaigns page', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);
    await page.goto(`${WEB_BASE_URL}/admin/campaigns`);

    await expect(page.locator('h1')).toContainText('Campanhas Promocionais');
    await expect(page.locator('text=Gerencie materiais promocionais para afiliados')).toBeVisible();
    await expect(page.locator('button:has-text("Nova Campanha")')).toBeVisible();
  });

  test('admin can create new campaign with files', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);
    await page.goto(`${WEB_BASE_URL}/admin/campaigns`);

    await page.click('button:has-text("Nova Campanha")');

    await expect(page.locator('h2:has-text("Nova Campanha Promocional")')).toBeVisible();

    const campaignName = `E2E Test Campaign ${Date.now()}`;
    await page.fill('input[placeholder*="Ex: Campanha"]', campaignName);
    await page.fill('input[placeholder="99.90"]', '149.90');
    await page.fill('input[placeholder="https://exemplo.com/produto"]', 'https://example.com/test-product');
    await page.fill('input[placeholder="https://exemplo.com/video.mp4"]', 'https://example.com/test-video.mp4');

    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
    if (fs.existsSync(testImagePath)) {
      await page.setInputFiles('input[type="file"]', testImagePath);
    }

    await page.click('button:has-text("Criar Campanha")');

    await page.waitForTimeout(2000);

    await expect(page.locator(`text=${campaignName}`)).toBeVisible({ timeout: 10000 });

    const campaignCard = page.locator('.grid').locator(`text=${campaignName}`).locator('..');
    const campaignId = await campaignCard.getAttribute('data-campaign-id');
    if (campaignId) {
      createdCampaignId = campaignId;
    }
  });

  test('admin can view campaign list', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);

    const campaign = await createTestCampaign(testAdmin);
    createdCampaignId = campaign.id;

    await page.goto(`${WEB_BASE_URL}/admin/campaigns`);

    await expect(page.locator(`text=${campaign.name}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=R$')).toBeVisible();

    const statsSection = page.locator('.grid').first();
    await expect(statsSection.locator('text=Total de Campanhas')).toBeVisible();
  });

  test('admin can download campaign ZIP', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);

    const campaign = await createTestCampaign(testAdmin);
    createdCampaignId = campaign.id;

    await page.goto(`${WEB_BASE_URL}/admin/campaigns`);
    await page.waitForSelector(`text=${campaign.name}`, { timeout: 10000 });

    const downloadPromise = page.waitForEvent('download');

    const campaignCard = page.locator(`text=${campaign.name}`).locator('..');
    await campaignCard.locator('button:has-text("Baixar"), button:has-text("Download")').first().click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('campaign');
    expect(download.suggestedFilename()).toContain('.zip');
  });

  test('admin can delete campaign', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);

    const campaign = await createTestCampaign(testAdmin);
    createdCampaignId = campaign.id;

    await page.goto(`${WEB_BASE_URL}/admin/campaigns`);
    await page.waitForSelector(`text=${campaign.name}`, { timeout: 10000 });

    page.on('dialog', dialog => dialog.accept());

    const campaignCard = page.locator(`text=${campaign.name}`).locator('..');
    await campaignCard.locator('button:has-text("Excluir"), button:has-text("Deletar")').first().click();

    await page.waitForTimeout(2000);

    await expect(page.locator(`text=${campaign.name}`)).not.toBeVisible({ timeout: 10000 });

    createdCampaignId = '';
  });

  test('admin sees updated stats after actions', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);
    await page.goto(`${WEB_BASE_URL}/admin/campaigns`);

    const initialStatsText = await page.locator('text=Total de Campanhas').locator('..').locator('p.text-3xl').textContent();
    const initialCount = parseInt(initialStatsText || '0');

    await page.click('button:has-text("Nova Campanha")');

    const campaignName = `Stats Test Campaign ${Date.now()}`;
    await page.fill('input[placeholder*="Ex: Campanha"]', campaignName);
    await page.fill('input[placeholder="99.90"]', '199.90');
    await page.fill('input[placeholder="https://exemplo.com/produto"]', 'https://example.com/stats-product');
    await page.fill('input[placeholder="https://exemplo.com/video.mp4"]', 'https://example.com/stats-video.mp4');

    await page.click('button:has-text("Criar Campanha")');

    await page.waitForTimeout(2000);

    const updatedStatsText = await page.locator('text=Total de Campanhas').locator('..').locator('p.text-3xl').textContent();
    const updatedCount = parseInt(updatedStatsText || '0');

    expect(updatedCount).toBe(initialCount + 1);

    const campaignCard = page.locator(`text=${campaignName}`).locator('..');
    const campaignId = await campaignCard.getAttribute('data-campaign-id');
    if (campaignId) {
      createdCampaignId = campaignId;
    }
  });
});

test.describe('Promotional Campaigns - User Flow', () => {
  test('user can access promotional page', async ({ page }) => {
    await loginAsUser(page, testUser);
    await page.goto(`${WEB_BASE_URL}/dashboard/promotional`);

    await expect(page.locator('h1:has-text("Campanhas Disponíveis")')).toBeVisible();
    await expect(page.locator('text=Baixe materiais para divulgar produtos')).toBeVisible();
  });

  test('user can view available campaigns', async ({ page }) => {
    const campaign = await createTestCampaign(testAdmin);
    createdCampaignId = campaign.id;

    await loginAsUser(page, testUser);
    await page.goto(`${WEB_BASE_URL}/dashboard/promotional`);

    await expect(page.locator(`text=${campaign.name}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=R$')).toBeVisible();
  });

  test('user can download campaign materials', async ({ page }) => {
    const campaign = await createTestCampaign(testAdmin);
    createdCampaignId = campaign.id;

    await loginAsUser(page, testUser);
    await page.goto(`${WEB_BASE_URL}/dashboard/promotional`);

    await page.waitForSelector(`text=${campaign.name}`, { timeout: 10000 });

    const downloadPromise = page.waitForEvent('download');

    const campaignCard = page.locator(`text=${campaign.name}`).locator('..');
    await campaignCard.locator('button:has-text("Baixar"), button:has-text("Download")').first().click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('campaign');
    expect(download.suggestedFilename()).toContain('.zip');
  });

  test('download is tracked in database', async ({ page }) => {
    const campaign = await createTestCampaign(testAdmin);
    createdCampaignId = campaign.id;

    await loginAsUser(page, testUser);
    await page.goto(`${WEB_BASE_URL}/dashboard/promotional`);

    await page.waitForSelector(`text=${campaign.name}`, { timeout: 10000 });

    const downloadPromise = page.waitForEvent('download');
    const campaignCard = page.locator(`text=${campaign.name}`).locator('..');
    await campaignCard.locator('button:has-text("Baixar"), button:has-text("Download")').first().click();
    await downloadPromise;

    await page.waitForTimeout(1000);

    const statsResponse = await fetch(`${API_BASE_URL}/api/admin/campaigns/stats`, {
      headers: { Authorization: `Bearer ${testAdmin.token}` },
    });
    const statsData = await statsResponse.json();

    expect(statsData.success).toBe(true);
    expect(statsData.data.totalDownloads).toBeGreaterThan(0);
  });

  test('user sees empty state when no campaigns', async ({ page }) => {
    await loginAsUser(page, testUser);
    await page.goto(`${WEB_BASE_URL}/dashboard/promotional`);

    const hasCampaigns = await page.locator('.grid').locator('text=R$').count();

    if (hasCampaigns === 0) {
      await expect(page.locator('text=Nenhum material disponível no momento')).toBeVisible();
    }
  });
});

test.describe('Promotional Campaigns - Full Flow', () => {
  test('complete workflow: admin creates, user downloads, admin sees stats, admin deletes', async ({ page, context }) => {
    const adminPage = page;
    const userPage = await context.newPage();

    await loginAsAdmin(adminPage, testAdmin);
    await adminPage.goto(`${WEB_BASE_URL}/admin/campaigns`);

    const initialStatsText = await adminPage.locator('text=Total de Campanhas').locator('..').locator('p.text-3xl').textContent();
    const initialCampaignCount = parseInt(initialStatsText || '0');

    const downloadsStatsElement = await adminPage.locator('text=Total de Downloads').locator('..').locator('p.text-3xl');
    const initialDownloadsText = await downloadsStatsElement.textContent();
    const initialDownloadCount = parseInt(initialDownloadsText || '0');

    await adminPage.click('button:has-text("Nova Campanha")');

    const campaignName = `Full Flow Campaign ${Date.now()}`;
    await adminPage.fill('input[placeholder*="Ex: Campanha"]', campaignName);
    await adminPage.fill('input[placeholder="99.90"]', '299.90');
    await adminPage.fill('input[placeholder="https://exemplo.com/produto"]', 'https://example.com/full-flow-product');
    await adminPage.fill('input[placeholder="https://exemplo.com/video.mp4"]', 'https://example.com/full-flow-video.mp4');

    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
    if (fs.existsSync(testImagePath)) {
      await adminPage.setInputFiles('input[type="file"]', testImagePath);
    }

    await adminPage.click('button:has-text("Criar Campanha")');

    await adminPage.waitForTimeout(2000);

    await expect(adminPage.locator(`text=${campaignName}`)).toBeVisible({ timeout: 10000 });

    const campaignCard = adminPage.locator(`text=${campaignName}`).locator('..');
    const campaignId = await campaignCard.getAttribute('data-campaign-id');
    if (campaignId) {
      createdCampaignId = campaignId;
    }

    const updatedCampaignStatsText = await adminPage.locator('text=Total de Campanhas').locator('..').locator('p.text-3xl').textContent();
    const updatedCampaignCount = parseInt(updatedCampaignStatsText || '0');
    expect(updatedCampaignCount).toBe(initialCampaignCount + 1);

    await loginAsUser(userPage, testUser);
    await userPage.goto(`${WEB_BASE_URL}/dashboard/promotional`);

    await expect(userPage.locator(`text=${campaignName}`)).toBeVisible({ timeout: 10000 });

    const downloadPromise = userPage.waitForEvent('download');
    const userCampaignCard = userPage.locator(`text=${campaignName}`).locator('..');
    await userCampaignCard.locator('button:has-text("Baixar"), button:has-text("Download")').first().click();
    await downloadPromise;

    await adminPage.reload();
    await adminPage.waitForTimeout(1000);

    const finalDownloadsStatsElement = await adminPage.locator('text=Total de Downloads').locator('..').locator('p.text-3xl');
    const finalDownloadsText = await finalDownloadsStatsElement.textContent();
    const finalDownloadCount = parseInt(finalDownloadsText || '0');

    expect(finalDownloadCount).toBeGreaterThan(initialDownloadCount);

    adminPage.on('dialog', dialog => dialog.accept());

    const adminCampaignCard = adminPage.locator(`text=${campaignName}`).locator('..');
    await adminCampaignCard.locator('button:has-text("Excluir"), button:has-text("Deletar")').first().click();

    await adminPage.waitForTimeout(2000);

    await expect(adminPage.locator(`text=${campaignName}`)).not.toBeVisible({ timeout: 10000 });

    await userPage.reload();
    await userPage.waitForTimeout(1000);

    await expect(userPage.locator(`text=${campaignName}`)).not.toBeVisible({ timeout: 10000 });

    createdCampaignId = '';

    await userPage.close();
  });

  test('multiple users can download same campaign', async ({ page, context }) => {
    const campaign = await createTestCampaign(testAdmin);
    createdCampaignId = campaign.id;

    const user1Page = page;
    const user2Page = await context.newPage();

    await loginAsUser(user1Page, testUser);
    await user1Page.goto(`${WEB_BASE_URL}/dashboard/promotional`);

    await user1Page.waitForSelector(`text=${campaign.name}`, { timeout: 10000 });

    const download1Promise = user1Page.waitForEvent('download');
    const campaign1Card = user1Page.locator(`text=${campaign.name}`).locator('..');
    await campaign1Card.locator('button:has-text("Baixar"), button:has-text("Download")').first().click();
    await download1Promise;

    const testUser2 = await createTestUser();
    await loginAsUser(user2Page, testUser2);
    await user2Page.goto(`${WEB_BASE_URL}/dashboard/promotional`);

    await user2Page.waitForSelector(`text=${campaign.name}`, { timeout: 10000 });

    const download2Promise = user2Page.waitForEvent('download');
    const campaign2Card = user2Page.locator(`text=${campaign.name}`).locator('..');
    await campaign2Card.locator('button:has-text("Baixar"), button:has-text("Download")').first().click();
    await download2Promise;

    await user2Page.waitForTimeout(1000);

    const statsResponse = await fetch(`${API_BASE_URL}/api/admin/campaigns/stats`, {
      headers: { Authorization: `Bearer ${testAdmin.token}` },
    });
    const statsData = await statsResponse.json();

    expect(statsData.success).toBe(true);
    expect(statsData.data.totalDownloads).toBeGreaterThanOrEqual(2);

    await user2Page.close();
  });
});

test.describe('Promotional Campaigns - Error Handling', () => {
  test('user cannot access admin campaigns page', async ({ page }) => {
    await loginAsUser(page, testUser);

    const response = await page.goto(`${WEB_BASE_URL}/admin/campaigns`);

    expect(response?.status()).not.toBe(200);
  });

  test('admin form validation prevents empty submission', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);
    await page.goto(`${WEB_BASE_URL}/admin/campaigns`);

    await page.click('button:has-text("Nova Campanha")');

    await page.click('button:has-text("Criar Campanha")');

    const isModalStillOpen = await page.locator('h2:has-text("Nova Campanha Promocional")').isVisible();
    expect(isModalStillOpen).toBe(true);
  });

  test('downloading deleted campaign shows error', async ({ page }) => {
    const campaign = await createTestCampaign(testAdmin);
    const campaignId = campaign.id;

    await fetch(`${API_BASE_URL}/api/admin/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${testAdmin.token}` },
    });

    await loginAsUser(page, testUser);

    const downloadResponse = await fetch(`${API_BASE_URL}/api/user/campaigns/${campaignId}/download`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
    });

    expect(downloadResponse.ok).toBe(false);
  });
});

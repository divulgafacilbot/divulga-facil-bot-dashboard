import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import {
  createTestUser,
  createTestAdmin,
  loginAsAdmin,
  loginAsUser,
  createTestCampaign,
  cleanupTestCampaign,
  cleanupTestUser,
  cleanupTestAdmin,
  type TestUser,
  type TestAdmin,
} from './helpers/test-helpers';
import { AdminCampaignsPage } from './page-objects/AdminCampaignsPage';
import { CreateCampaignModal } from './page-objects/CreateCampaignModal';
import { UserPromotionalPage } from './page-objects/UserPromotionalPage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

let testUser: TestUser;
let testAdmin: TestAdmin;
let createdCampaignIds: string[] = [];

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

function createTestImage() {
  const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
  if (!fs.existsSync(path.dirname(testImagePath))) {
    fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
  }

  if (!fs.existsSync(testImagePath)) {
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(testImagePath, buffer);
  }

  return testImagePath;
}

async function cleanupAllCampaigns() {
  for (const campaignId of createdCampaignIds) {
    await cleanupTestCampaign(campaignId, testAdmin.token);
  }
  createdCampaignIds = [];
}

test.beforeAll(async () => {
  await setupTestDatabase();
  testUser = await createTestUser();
  testAdmin = await createTestAdmin();
  createTestImage();
});

test.afterAll(async () => {
  await cleanupAllCampaigns();
  if (testUser) {
    await cleanupTestUser(testUser.id, testUser.token);
  }
  if (testAdmin) {
    await cleanupTestAdmin(testAdmin.id, testAdmin.token);
  }
});

test.afterEach(async () => {
  await cleanupAllCampaigns();
});

test.describe('Admin Campaigns Flow - Using Page Objects', () => {
  test('admin can access campaigns page', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);

    const adminCampaignsPage = new AdminCampaignsPage(page);
    await adminCampaignsPage.goto();

    await expect(adminCampaignsPage.heading).toBeVisible();
    await expect(adminCampaignsPage.description).toBeVisible();
    await expect(adminCampaignsPage.newCampaignButton).toBeVisible();
  });

  test('admin can create new campaign with files', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);

    const adminCampaignsPage = new AdminCampaignsPage(page);
    await adminCampaignsPage.goto();
    await adminCampaignsPage.openCreateModal();

    const createModal = new CreateCampaignModal(page);
    await createModal.verifyVisible();

    const campaignName = `PO Test Campaign ${Date.now()}`;
    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

    await createModal.submitForm({
      name: campaignName,
      price: '149.90',
      productUrl: 'https://example.com/po-product',
      videoUrl: 'https://example.com/po-video.mp4',
      filePath: testImagePath,
    });

    await page.waitForTimeout(2000);

    await adminCampaignsPage.verifyCampaignExists(campaignName);
  });

  test('admin can view campaign list with stats', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);

    const campaign = await createTestCampaign(testAdmin);
    createdCampaignIds.push(campaign.id);

    const adminCampaignsPage = new AdminCampaignsPage(page);
    await adminCampaignsPage.goto();

    await adminCampaignsPage.verifyCampaignExists(campaign.name);
    await adminCampaignsPage.verifyStatsVisible();

    const totalCampaigns = await adminCampaignsPage.getTotalCampaigns();
    expect(totalCampaigns).toBeGreaterThan(0);
  });

  test('admin can download campaign ZIP', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);

    const campaign = await createTestCampaign(testAdmin);
    createdCampaignIds.push(campaign.id);

    const adminCampaignsPage = new AdminCampaignsPage(page);
    await adminCampaignsPage.goto();

    const download = await adminCampaignsPage.downloadCampaign(campaign.name);

    expect(download.suggestedFilename()).toContain('campaign');
    expect(download.suggestedFilename()).toContain('.zip');
  });

  test('admin can delete campaign', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);

    const campaign = await createTestCampaign(testAdmin);
    createdCampaignIds.push(campaign.id);

    const adminCampaignsPage = new AdminCampaignsPage(page);
    await adminCampaignsPage.goto();

    await adminCampaignsPage.deleteCampaign(campaign.name);
    await adminCampaignsPage.verifyCampaignNotExists(campaign.name);

    createdCampaignIds = createdCampaignIds.filter(id => id !== campaign.id);
  });

  test('admin sees updated stats after creating campaign', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);

    const adminCampaignsPage = new AdminCampaignsPage(page);
    await adminCampaignsPage.goto();

    const initialCount = await adminCampaignsPage.getTotalCampaigns();

    await adminCampaignsPage.openCreateModal();

    const createModal = new CreateCampaignModal(page);
    const campaignName = `Stats Test ${Date.now()}`;
    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

    await createModal.submitForm({
      name: campaignName,
      price: '199.90',
      productUrl: 'https://example.com/stats-product',
      videoUrl: 'https://example.com/stats-video.mp4',
      filePath: testImagePath,
    });

    await page.waitForTimeout(2000);

    const updatedCount = await adminCampaignsPage.getTotalCampaigns();
    expect(updatedCount).toBe(initialCount + 1);
  });
});

test.describe('User Promotional Flow - Using Page Objects', () => {
  test('user can access promotional page', async ({ page }) => {
    await loginAsUser(page, testUser);

    const userPromotionalPage = new UserPromotionalPage(page);
    await userPromotionalPage.goto();

    await userPromotionalPage.verifyPageLoaded();
  });

  test('user can view available campaigns', async ({ page }) => {
    const campaign = await createTestCampaign(testAdmin);
    createdCampaignIds.push(campaign.id);

    await loginAsUser(page, testUser);

    const userPromotionalPage = new UserPromotionalPage(page);
    await userPromotionalPage.goto();

    await userPromotionalPage.verifyCampaignExists(campaign.name);
    await userPromotionalPage.verifyPriceVisible();
  });

  test('user can download campaign materials', async ({ page }) => {
    const campaign = await createTestCampaign(testAdmin);
    createdCampaignIds.push(campaign.id);

    await loginAsUser(page, testUser);

    const userPromotionalPage = new UserPromotionalPage(page);
    await userPromotionalPage.goto();

    const download = await userPromotionalPage.downloadCampaign(campaign.name);

    expect(download.suggestedFilename()).toContain('campaign');
    expect(download.suggestedFilename()).toContain('.zip');
  });

  test('download is tracked in database', async ({ page }) => {
    const campaign = await createTestCampaign(testAdmin);
    createdCampaignIds.push(campaign.id);

    const adminCampaignsPage = new AdminCampaignsPage(page);

    await loginAsAdmin(page, testAdmin);
    await adminCampaignsPage.goto();
    const initialDownloads = await adminCampaignsPage.getTotalDownloads();

    await loginAsUser(page, testUser);

    const userPromotionalPage = new UserPromotionalPage(page);
    await userPromotionalPage.goto();
    await userPromotionalPage.downloadCampaign(campaign.name);

    await page.waitForTimeout(1000);

    await loginAsAdmin(page, testAdmin);
    await adminCampaignsPage.goto();
    await page.waitForTimeout(1000);

    const finalDownloads = await adminCampaignsPage.getTotalDownloads();
    expect(finalDownloads).toBeGreaterThan(initialDownloads);
  });

  test('user sees empty state when no campaigns', async ({ page }) => {
    await cleanupAllCampaigns();

    await loginAsUser(page, testUser);

    const userPromotionalPage = new UserPromotionalPage(page);
    await userPromotionalPage.goto();

    const campaignCount = await userPromotionalPage.getCampaignCount();

    if (campaignCount === 0) {
      await userPromotionalPage.verifyEmptyState();
    }
  });
});

test.describe('Complete End-to-End Flow', () => {
  test('full workflow: admin creates, user downloads, admin sees stats, admin deletes', async ({ page, context }) => {
    const adminPage = page;
    const userPage = await context.newPage();

    await loginAsAdmin(adminPage, testAdmin);

    const adminCampaignsPage = new AdminCampaignsPage(adminPage);
    await adminCampaignsPage.goto();

    const initialCampaigns = await adminCampaignsPage.getTotalCampaigns();
    const initialDownloads = await adminCampaignsPage.getTotalDownloads();

    await adminCampaignsPage.openCreateModal();

    const createModal = new CreateCampaignModal(adminPage);
    const campaignName = `Full Flow ${Date.now()}`;
    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

    await createModal.submitForm({
      name: campaignName,
      price: '299.90',
      productUrl: 'https://example.com/full-flow-product',
      videoUrl: 'https://example.com/full-flow-video.mp4',
      filePath: testImagePath,
    });

    await adminPage.waitForTimeout(2000);

    await adminCampaignsPage.verifyCampaignExists(campaignName);

    const updatedCampaigns = await adminCampaignsPage.getTotalCampaigns();
    expect(updatedCampaigns).toBe(initialCampaigns + 1);

    await loginAsUser(userPage, testUser);

    const userPromotionalPage = new UserPromotionalPage(userPage);
    await userPromotionalPage.goto();
    await userPromotionalPage.verifyCampaignExists(campaignName);

    await userPromotionalPage.downloadCampaign(campaignName);

    await adminPage.reload();
    await adminPage.waitForTimeout(1000);

    const finalDownloads = await adminCampaignsPage.getTotalDownloads();
    expect(finalDownloads).toBeGreaterThan(initialDownloads);

    await adminCampaignsPage.deleteCampaign(campaignName);
    await adminCampaignsPage.verifyCampaignNotExists(campaignName);

    await userPage.reload();
    await userPage.waitForTimeout(1000);

    await userPromotionalPage.verifyCampaignNotExists(campaignName);

    await userPage.close();
  });

  test('multiple users can download same campaign', async ({ page, context }) => {
    const campaign = await createTestCampaign(testAdmin);
    createdCampaignIds.push(campaign.id);

    const user1Page = page;
    const user2Page = await context.newPage();

    await loginAsUser(user1Page, testUser);

    const userPromotionalPage1 = new UserPromotionalPage(user1Page);
    await userPromotionalPage1.goto();
    await userPromotionalPage1.downloadCampaign(campaign.name);

    const testUser2 = await createTestUser();
    await loginAsUser(user2Page, testUser2);

    const userPromotionalPage2 = new UserPromotionalPage(user2Page);
    await userPromotionalPage2.goto();
    await userPromotionalPage2.downloadCampaign(campaign.name);

    await user2Page.waitForTimeout(1000);

    const statsResponse = await fetch(`${API_BASE_URL}/api/admin/campaigns/stats`, {
      headers: { Authorization: `Bearer ${testAdmin.token}` },
    });
    const statsData = await statsResponse.json();

    expect(statsData.success).toBe(true);
    expect(statsData.data.totalDownloads).toBeGreaterThanOrEqual(2);

    await cleanupTestUser(testUser2.id, testUser2.token);
    await user2Page.close();
  });
});

test.describe('Error Handling and Validation', () => {
  test('admin form validation prevents empty submission', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);

    const adminCampaignsPage = new AdminCampaignsPage(page);
    await adminCampaignsPage.goto();
    await adminCampaignsPage.openCreateModal();

    const createModal = new CreateCampaignModal(page);
    await createModal.submit();

    await createModal.verifyVisible();
  });

  test('modal can be closed without submitting', async ({ page }) => {
    await loginAsAdmin(page, testAdmin);

    const adminCampaignsPage = new AdminCampaignsPage(page);
    await adminCampaignsPage.goto();
    await adminCampaignsPage.openCreateModal();

    const createModal = new CreateCampaignModal(page);
    await createModal.cancel();

    await createModal.verifyNotVisible();
  });
});

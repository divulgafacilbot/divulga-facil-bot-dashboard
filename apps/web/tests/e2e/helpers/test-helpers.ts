import { Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://localhost:3000';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  token: string;
}

export interface TestAdmin {
  id: string;
  email: string;
  password: string;
  token: string;
}

export interface TestCampaign {
  id: string;
  name: string;
  price: number;
  product_url: string;
  main_video_url: string;
}

export async function createTestUser(): Promise<TestUser> {
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

export async function createTestAdmin(): Promise<TestAdmin> {
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

export async function loginAsAdmin(page: Page, admin: TestAdmin): Promise<void> {
  await page.goto(`${WEB_BASE_URL}/admin/login`);
  await page.fill('input[type="email"]', admin.email);
  await page.fill('input[type="password"]', admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${WEB_BASE_URL}/admin/**`, { timeout: 10000 });
}

export async function loginAsUser(page: Page, user: TestUser): Promise<void> {
  await page.goto(`${WEB_BASE_URL}/login`);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${WEB_BASE_URL}/dashboard`, { timeout: 10000 });
}

export async function createTestCampaign(admin: TestAdmin): Promise<TestCampaign> {
  const formData = new FormData();
  formData.append('name', `Test Campaign ${Date.now()}`);
  formData.append('price', '99.90');
  formData.append('product_url', 'https://example.com/product');
  formData.append('main_video_url', 'https://example.com/video.mp4');

  const testImagePath = path.join(__dirname, '../../fixtures/test-image.jpg');
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

export async function cleanupTestCampaign(campaignId: string, adminToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/admin/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  } catch (error) {
    console.error('Failed to cleanup campaign:', error);
  }
}

export async function cleanupTestUser(userId: string, userToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/user/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    });
  } catch (error) {
    console.error('Failed to cleanup user:', error);
  }
}

export async function cleanupTestAdmin(adminId: string, adminToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/admin/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  } catch (error) {
    console.error('Failed to cleanup admin:', error);
  }
}

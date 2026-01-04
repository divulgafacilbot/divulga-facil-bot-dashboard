import path from 'path';
import fs from 'fs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export interface CampaignData {
  name: string;
  price: string;
  product_url: string;
  main_video_url: string;
}

export interface UserData {
  email: string;
  password: string;
}

export interface AdminData {
  email: string;
  password: string;
  name: string;
}

export class TestDataFactory {
  private static counter = 0;

  static getUniqueId(): string {
    return `${Date.now()}-${++this.counter}`;
  }

  static createCampaignData(overrides?: Partial<CampaignData>): CampaignData {
    const id = this.getUniqueId();
    return {
      name: `Test Campaign ${id}`,
      price: '99.90',
      product_url: `https://example.com/product-${id}`,
      main_video_url: `https://example.com/video-${id}.mp4`,
      ...overrides,
    };
  }

  static createUserData(overrides?: Partial<UserData>): UserData {
    const id = this.getUniqueId();
    return {
      email: `test-user-${id}@example.com`,
      password: 'TestPassword123!',
      ...overrides,
    };
  }

  static createAdminData(overrides?: Partial<AdminData>): AdminData {
    const id = this.getUniqueId();
    return {
      email: `test-admin-${id}@example.com`,
      password: 'AdminPassword123!',
      name: `Test Admin ${id}`,
      ...overrides,
    };
  }

  static getTestImagePath(): string {
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

    return testImagePath;
  }

  static createTestImageBlob(): Blob {
    const imagePath = this.getTestImagePath();
    return new Blob([fs.readFileSync(imagePath)], { type: 'image/jpeg' });
  }

  static async createCampaignViaAPI(
    adminToken: string,
    campaignData?: Partial<CampaignData>,
    includeAssets: boolean = true
  ) {
    const data = this.createCampaignData(campaignData);
    const formData = new FormData();

    formData.append('name', data.name);
    formData.append('price', data.price);
    formData.append('product_url', data.product_url);
    formData.append('main_video_url', data.main_video_url);

    if (includeAssets) {
      const imageBlob = this.createTestImageBlob();
      formData.append('assets', imageBlob, 'test-image.jpg');
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/campaigns`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: formData,
    });

    const result = await response.json();
    return result.data;
  }

  static async createUserViaAPI(userData?: Partial<UserData>) {
    const data = this.createUserData(userData);

    const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const registerData = await registerResponse.json();

    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const loginData = await loginResponse.json();

    return {
      id: registerData.data?.id || loginData.data?.user?.id,
      email: data.email,
      password: data.password,
      token: loginData.data?.accessToken,
    };
  }

  static async createAdminViaAPI(adminData?: Partial<AdminData>) {
    const data = this.createAdminData(adminData);

    const registerResponse = await fetch(`${API_BASE_URL}/api/admin/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const registerData = await registerResponse.json();

    const loginResponse = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, password: data.password }),
    });

    const loginData = await loginResponse.json();

    return {
      id: registerData.data?.id || loginData.data?.id,
      email: data.email,
      password: data.password,
      token: loginData.data?.token,
    };
  }

  static async deleteCampaign(campaignId: string, adminToken: string) {
    return fetch(`${API_BASE_URL}/api/admin/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  static async deleteUser(userToken: string) {
    return fetch(`${API_BASE_URL}/api/user/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    });
  }

  static async deleteAdmin(adminToken: string) {
    return fetch(`${API_BASE_URL}/api/admin/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  static async getCampaignStats(adminToken: string) {
    const response = await fetch(`${API_BASE_URL}/api/admin/campaigns/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    return response.json();
  }

  static async listCampaigns(adminToken: string) {
    const response = await fetch(`${API_BASE_URL}/api/admin/campaigns`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    return response.json();
  }

  static async downloadCampaign(campaignId: string, userToken: string) {
    const response = await fetch(`${API_BASE_URL}/api/user/campaigns/${campaignId}/download`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    return response;
  }
}

export default TestDataFactory;

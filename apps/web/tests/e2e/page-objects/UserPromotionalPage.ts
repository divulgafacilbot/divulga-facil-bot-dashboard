import { Page, Locator, expect } from '@playwright/test';

export class UserPromotionalPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly description: Locator;
  readonly campaignGrid: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1:has-text("Campanhas Disponíveis")');
    this.description = page.locator('text=Baixe materiais para divulgar produtos');
    this.campaignGrid = page.locator('.grid');
    this.emptyState = page.locator('text=Nenhum material disponível no momento');
  }

  async goto() {
    const baseUrl = process.env.WEB_BASE_URL || 'http://localhost:3000';
    await this.page.goto(`${baseUrl}/dashboard/promotional`);
  }

  async verifyPageLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.description).toBeVisible();
  }

  async findCampaignCard(campaignName: string): Promise<Locator> {
    await this.page.waitForSelector(`text=${campaignName}`, { timeout: 10000 });
    return this.page.locator(`text=${campaignName}`).locator('..');
  }

  async verifyCampaignExists(campaignName: string) {
    await expect(this.page.locator(`text=${campaignName}`)).toBeVisible({ timeout: 10000 });
  }

  async verifyCampaignNotExists(campaignName: string) {
    await expect(this.page.locator(`text=${campaignName}`)).not.toBeVisible({ timeout: 10000 });
  }

  async verifyEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }

  async downloadCampaign(campaignName: string) {
    const downloadPromise = this.page.waitForEvent('download');
    const campaignCard = await this.findCampaignCard(campaignName);
    await campaignCard.locator('button:has-text("Baixar"), button:has-text("Download")').first().click();
    return downloadPromise;
  }

  async verifyPriceVisible() {
    await expect(this.page.locator('text=R$')).toBeVisible();
  }

  async getCampaignCount(): Promise<number> {
    return await this.campaignGrid.locator('[data-campaign-id]').count();
  }
}

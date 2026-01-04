import { Page, Locator, expect } from '@playwright/test';

export class AdminCampaignsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly description: Locator;
  readonly newCampaignButton: Locator;
  readonly campaignGrid: Locator;
  readonly statsSection: Locator;
  readonly totalCampaignsCard: Locator;
  readonly totalDownloadsCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1:has-text("Campanhas Promocionais")');
    this.description = page.locator('text=Gerencie materiais promocionais para afiliados');
    this.newCampaignButton = page.locator('button:has-text("Nova Campanha")');
    this.campaignGrid = page.locator('.grid').last();
    this.statsSection = page.locator('.grid').first();
    this.totalCampaignsCard = page.locator('text=Total de Campanhas');
    this.totalDownloadsCard = page.locator('text=Total de Downloads');
  }

  async goto() {
    const baseUrl = process.env.WEB_BASE_URL || 'http://localhost:3000';
    await this.page.goto(`${baseUrl}/admin/campaigns`);
  }

  async openCreateModal() {
    await this.newCampaignButton.click();
    await expect(this.page.locator('h2:has-text("Nova Campanha Promocional")')).toBeVisible();
  }

  async getTotalCampaigns(): Promise<number> {
    const text = await this.totalCampaignsCard.locator('..').locator('p.text-3xl').textContent();
    return parseInt(text || '0');
  }

  async getTotalDownloads(): Promise<number> {
    const text = await this.totalDownloadsCard.locator('..').locator('p.text-3xl').textContent();
    return parseInt(text || '0');
  }

  async findCampaignCard(campaignName: string): Promise<Locator> {
    await this.page.waitForSelector(`text=${campaignName}`, { timeout: 10000 });
    return this.page.locator(`text=${campaignName}`).locator('..');
  }

  async deleteCampaign(campaignName: string) {
    this.page.on('dialog', dialog => dialog.accept());
    const campaignCard = await this.findCampaignCard(campaignName);
    await campaignCard.locator('button:has-text("Excluir"), button:has-text("Deletar")').first().click();
    await this.page.waitForTimeout(2000);
  }

  async downloadCampaign(campaignName: string) {
    const downloadPromise = this.page.waitForEvent('download');
    const campaignCard = await this.findCampaignCard(campaignName);
    await campaignCard.locator('button:has-text("Baixar"), button:has-text("Download")').first().click();
    return downloadPromise;
  }

  async verifyCampaignExists(campaignName: string) {
    await expect(this.page.locator(`text=${campaignName}`)).toBeVisible({ timeout: 10000 });
  }

  async verifyCampaignNotExists(campaignName: string) {
    await expect(this.page.locator(`text=${campaignName}`)).not.toBeVisible({ timeout: 10000 });
  }

  async verifyEmptyState() {
    await expect(this.page.locator('text=Nenhuma campanha encontrada')).toBeVisible();
  }

  async verifyStatsVisible() {
    await expect(this.totalCampaignsCard).toBeVisible();
    await expect(this.totalDownloadsCard).toBeVisible();
  }
}

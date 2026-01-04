import { Page, Locator, expect } from '@playwright/test';

export class CreateCampaignModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly priceInput: Locator;
  readonly productUrlInput: Locator;
  readonly videoUrlInput: Locator;
  readonly fileInput: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;
  readonly closeButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('.fixed.inset-0');
    this.heading = page.locator('h2:has-text("Nova Campanha Promocional")');
    this.nameInput = page.locator('input[placeholder*="Ex: Campanha"]');
    this.priceInput = page.locator('input[placeholder="99.90"]');
    this.productUrlInput = page.locator('input[placeholder="https://exemplo.com/produto"]');
    this.videoUrlInput = page.locator('input[placeholder="https://exemplo.com/video.mp4"]');
    this.fileInput = page.locator('input[type="file"]');
    this.cancelButton = page.locator('button:has-text("Cancelar")');
    this.submitButton = page.locator('button:has-text("Criar Campanha")');
    this.closeButton = page.locator('button').filter({ hasText: '×' });
    this.errorMessage = page.locator('.bg-red-50.border-red-200');
  }

  async verifyVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.modal).toBeVisible();
  }

  async fillCampaignDetails(details: {
    name: string;
    price: string;
    productUrl: string;
    videoUrl: string;
  }) {
    await this.nameInput.fill(details.name);
    await this.priceInput.fill(details.price);
    await this.productUrlInput.fill(details.productUrl);
    await this.videoUrlInput.fill(details.videoUrl);
  }

  async attachFiles(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
  }

  async submit() {
    await this.submitButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async close() {
    await this.closeButton.click();
  }

  async submitForm(details: {
    name: string;
    price: string;
    productUrl: string;
    videoUrl: string;
    filePath?: string;
  }) {
    await this.fillCampaignDetails(details);

    if (details.filePath) {
      await this.attachFiles(details.filePath);
    }

    await this.submit();
  }

  async verifyError(errorText: string) {
    await expect(this.errorMessage).toContainText(errorText);
  }

  async verifyNotVisible() {
    await expect(this.heading).not.toBeVisible();
  }
}

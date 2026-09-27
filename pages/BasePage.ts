import { Page } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navega a una ruta relativa al dominio base de Liverpool.
   */
  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(`https://www.liverpool.com.mx${path}`, {
      waitUntil: 'domcontentloaded',
    });
  }

  /**
   * Cierra el banner de cookies si está visible.
   * Es defensivo: si el banner no aparece, no falla el test.
   */
  async acceptCookiesIfPresent(): Promise<void> {
    const closeButton = this.page.getByTestId(
      'ml-cookie-consent-ml-cookie-consent-close-button'
    );

    try {
      await closeButton.waitFor({ state: 'visible', timeout: 5000 });
      await closeButton.click();
    } catch {
      // El banner no apareció; no es un error.
    }
  }
}
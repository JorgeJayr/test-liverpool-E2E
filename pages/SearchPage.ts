import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class SearchPage extends BasePage {
  private readonly searchInput = this.page.locator(
    'input[placeholder*="Buscar por producto"]:visible'
  );

  constructor(page: Page) {
    super(page);
  }

  /**
   * Escribe el término de búsqueda y ejecuta la búsqueda con Enter.
   */
  async search(term: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }
}
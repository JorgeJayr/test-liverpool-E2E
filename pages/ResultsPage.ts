import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface ExtractedProduct {
  productId: string;
  name: string;
  price: number | null;
}

export class ResultsPage extends BasePage {
  private readonly sortButton = this.page.getByTestId('dropdown-sorting-button');
  private readonly productList = this.page.locator('#plp-page-card-product-list');

  constructor(page: Page) {
    super(page);
  }

  /**
   * Espera a que el widget de terceros Bambuser termine de inicializar
   * (deja de interceptar eventos de puntero) y a que el listado de
   * resultados tenga al menos un producto renderizado.
   */
  async waitForResults(): Promise<void> {
    await this.page.waitForFunction(
      () => !document.documentElement.classList.contains('bambuser-booting'),
      { timeout: 15000 }
    );

    await this.productList.locator('[data-testid$="-card"]').first().waitFor({ state: 'visible' });
  }

  /**
   * Ejecuta una acción (click) y espera a que, como consecuencia de esa
   * acción, se complete una petición al endpoint de búsqueda/filtrado.
   * Evita condiciones de carrera donde el DOM "viejo" ya está visible
   * y un chequeo simple de visibilidad no detecta que aún falta la
   * actualización real de los resultados.
   */
  private async clickAndWaitForSearchResponse(action: () => Promise<void>): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (response) => /api\/plp\/search/i.test(response.url()) && response.status() === 200
      ),
      action(),
    ]);
  }

  /**
   * Abre el panel de filtros y marca el color indicado.
   * El panel de filtros abre con todas sus secciones ya
   * expandidas por default (no hay que desplegar "Color" aparte).
   */
  async filterByColor(colorName: string): Promise<void> {
    await this.waitForResults();

    const colorLabel = this.page.locator('label').filter({ hasText: colorName });
    await expect(
      colorLabel,
      `No aparece el filtro de color "${colorName}" para esta búsqueda`
    ).toBeVisible();

    await this.clickAndWaitForSearchResponse(() => colorLabel.click());
    await this.waitForResults();
  }

  /**
   * Abre el dropdown de ordenamiento y selecciona
   * "Menor precio" (orden ascendente).
   */
  async sortByPriceAscending(): Promise<void> {
    await this.waitForResults();
    await this.sortButton.click();

    const option = this.page.getByRole('option', { name: 'Menor precio' });
    await this.clickAndWaitForSearchResponse(() => option.click());
    await this.waitForResults();
  }

  /**
   * Extrae nombre, precio y productId de los primeros N productos
   * visibles en el listado de resultados.
   */
  async extractFirstNProducts(count: number): Promise<ExtractedProduct[]> {
    const cards = this.productList.locator('[data-testid$="-card"]');
    await cards.first().waitFor({ state: 'visible' });

    const total = await cards.count();
    const limit = Math.min(count, total);

    const products: ExtractedProduct[] = [];

    for (let i = 0; i < limit; i++) {
      const card = cards.nth(i);

      const testId = await card.getAttribute('data-testid');
      const productId = testId?.replace(/-card$/, '') ?? '';

      const name = (await card.locator('h3').first().textContent())?.trim() ?? '';

      const priceText = await card
        .locator('[data-testid$="-price"]')
        .first()
        .textContent();
      const price = this.parsePrice(priceText ?? '');

      products.push({ productId, name, price });
    }

    return products;
  }

  /**
   * Extrae el primer precio con formato "$X,XXX.XX" de un texto,
   * incluso si el texto contiene un segundo precio pegado
   * (ej. precio de venta + precio tachado por descuento).
   */
  private parsePrice(rawText: string): number | null {
    const match = rawText.match(/\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/);
    if (!match) return null;

    const numericString = match[1].replace(/,/g, '');
    const value = parseFloat(numericString);
    return Number.isFinite(value) ? value : null;
  }
}
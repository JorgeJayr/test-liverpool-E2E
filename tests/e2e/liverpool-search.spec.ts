import { test, expect } from '@playwright/test';
import { SearchPage } from '../../pages/SearchPage';
import { ResultsPage } from '../../pages/ResultsPage';
import { SEARCH_TERM, COLOR_FILTER, RESULTS_TO_EXTRACT } from '../../config/constants';

test.describe('Liverpool - Búsqueda, filtro y extracción de productos', () => {
  test('busca, filtra por color, ordena por precio y extrae los primeros 5 resultados', async ({ page }) => {
    const searchPage = new SearchPage(page);
    const resultsPage = new ResultsPage(page);

    await test.step('Navegar a Liverpool y aceptar cookies', async () => {
      await searchPage.goto('/');
      await searchPage.acceptCookiesIfPresent();
    });

    await test.step(`Buscar "${SEARCH_TERM}"`, async () => {
      await searchPage.search(SEARCH_TERM);
      await expect(page).toHaveURL(/\/tienda\?s=/i);
    });

    await test.step(`Filtrar por color "${COLOR_FILTER}"`, async () => {
      await resultsPage.filterByColor(COLOR_FILTER);
    });

    await test.step('Ordenar por precio: menor a mayor', async () => {
      await resultsPage.sortByPriceAscending();
    });

    const products = await test.step(`Extraer los primeros ${RESULTS_TO_EXTRACT} resultados`, async () => {
      return resultsPage.extractFirstNProducts(RESULTS_TO_EXTRACT);
    });

    console.log('Productos extraídos:');
    console.table(products);

    await test.step('Validar que se extrajeron los resultados esperados', async () => {
      expect(products.length).toBe(RESULTS_TO_EXTRACT);

      for (const product of products) {
        expect(product.productId).not.toBe('');
        expect(product.name).not.toBe('');
        expect(product.price).not.toBeNull();
      }
    });

    await test.step('Validar que los precios están ordenados de menor a mayor', async () => {
      const prices = products.map((p) => p.price as number);
      const sortedPrices = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sortedPrices);
    });
  });
});
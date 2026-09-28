import { test, expect } from '@playwright/test';
import { SearchPage } from '../../pages/SearchPage';
import { ResultsPage } from '../../pages/ResultsPage';
import {
  SEARCH_TERM,
  COLOR_FILTER,
  RESULTS_TO_EXTRACT,
  MIN_CROSS_VALIDATION_MATCHES,
  STRICT_CROSS_VALIDATION,
  DEBUG_API,
} from '../../config/constants';
import { extractApiProducts } from '../../api/searchResponse';
import { compareProducts } from '../../api/compareProducts';

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

    // La respuesta de /api/plp/search que originó el listado ordenado que muestra la UI.
    const searchResponse = await test.step('Ordenar por precio: menor a mayor', async () => {
      return resultsPage.sortByPriceAscending();
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

    const apiProducts = await test.step('Parsear los productos de la respuesta interceptada', async () => {
      const payload = await searchResponse.json();

      if (DEBUG_API) {
        await test.info().attach('search-response.json', {
          body: JSON.stringify(payload, null, 2),
          contentType: 'application/json',
        });
      }

      const parsed = extractApiProducts(payload);
      expect(parsed.length, 'La respuesta debe contener productos').toBeGreaterThan(0);

      await test.info().attach('api-products-first-10.json', {
        body: JSON.stringify(parsed.slice(0, 10), null, 2),
        contentType: 'application/json',
      });
      return parsed;
    });

    await test.step('Validación cruzada UI vs respuesta de red', async () => {
      const result = compareProducts(products, apiProducts);

      console.log(`Productos de la UI presentes en la respuesta: ${result.found}/${result.total}`);
      console.log('Comparación UI vs API (respuesta interceptada):');
      console.table(
        result.rows.map((r) => ({
          '#UI': r.uiPosition,
          '#API': r.apiPosition,
          productId: r.productId,
          'Nombre UI': r.uiName,
          'Nombre API': r.apiName,
          'Precio UI': r.uiPrice,
          'Precio API': r.apiPrice,
          Estado: r.status,
        }))
      );
      if (result.discrepancies.length > 0) {
        console.log('Discrepancias UI vs API:');
        console.table(result.discrepancies.map(({ type, productId, detail }) => ({ type, productId, detail })));
      }

      // Visibles en el reporte HTML sin necesidad de fallar el test.
      for (const d of result.discrepancies) {
        test.info().annotations.push({ type: `discrepancia:${d.type}`, description: d.detail });
      }
      await test.info().attach('comparison.json', {
        body: JSON.stringify(result.rows, null, 2),
        contentType: 'application/json',
      });
      await test.info().attach('discrepancies.json', {
        body: JSON.stringify(result.discrepancies, null, 2),
        contentType: 'application/json',
      });

      expect(
        result.found,
        `Al menos ${MIN_CROSS_VALIDATION_MATCHES} de ${result.total} productos de la UI deben aparecer en la respuesta`
      ).toBeGreaterThanOrEqual(MIN_CROSS_VALIDATION_MATCHES);

      if (STRICT_CROSS_VALIDATION) {
        expect(result.discrepancies, 'Modo estricto: no debe haber discrepancias').toEqual([]);
      }
    });
  });
});
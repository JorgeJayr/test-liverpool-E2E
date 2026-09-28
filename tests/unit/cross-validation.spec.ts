import { test, expect } from '@playwright/test';
import { extractApiProducts } from '../../api/searchResponse';
import { compareProducts, UiProduct } from '../../api/compareProducts';
import { parsePrice } from '../../utils/price';

const ui: UiProduct[] = [
  { productId: '100', name: 'Consola PlayStation 5 Slim Blanco', price: 9499 },
  { productId: '200', name: 'Control DualSense Blanco', price: 1599 },
  { productId: '300', name: 'Audífonos Pulse 3D', price: 2299.5 },
];

test.describe('parsePrice', () => {
  test('soporta formato de UI y de API', () => {
    expect(parsePrice('$9,499.00')).toBe(9499);
    expect(parsePrice('$9,499.00$12,999.00')).toBe(9499);
    expect(parsePrice('9499')).toBe(9499);
    expect(parsePrice(['x'])).toBeNull();
    expect(parsePrice(1599.9)).toBe(1599.9);
  });
});

test.describe('extractApiProducts', () => {
  test('encuentra la lista anidada y lee precios de priceInfo.*', () => {
    const payload = {
      status: { code: 0 },
      contents: [{ mainContent: [{ records: [
        { productId: '100', title: 'Consola PlayStation 5 Slim Blanco', priceInfo: { salePrice: 9499, listPrice: { price: 10999 }, promoPrice: { price: 9499 } } },
        { productId: '200', title: 'Control DualSense Blanco', priceInfo: { salePrice: 1599 } },
      ] }] }],
      otro: [{ foo: 'bar' }],
    };
    expect(extractApiProducts(payload)).toEqual([
      { productId: '100', name: 'Consola PlayStation 5 Slim Blanco', price: 9499 },
      { productId: '200', name: 'Control DualSense Blanco', price: 1599 },
    ]);
  });

  test('falla con un mensaje accionable si no hay productos', () => {
    expect(() => extractApiProducts({ a: 1, b: [] })).toThrow(/Claves de primer nivel: \[a, b\]/);
  });
});

test.describe('compareProducts', () => {
  test('sin discrepancias cuando todo coincide (ignora acentos/mayúsculas/espacios)', () => {
    const api = [
      { productId: '100', name: '  consola playstation 5 SLIM blanco ', price: 9499 },
      { productId: '200', name: 'Control DualSense Blanco', price: 1599 },
      { productId: '300', name: 'Audifonos Pulse 3D', price: 2299.5 },
    ];
    const result = compareProducts(ui, api);
    expect(result.found).toBe(3);
    expect(result.discrepancies).toEqual([]);
    expect(result.rows.map((r) => r.status)).toEqual(['OK', 'OK', 'OK']);
    expect(result.rows[0]).toMatchObject({ uiPosition: 1, apiPosition: 1, uiPrice: 9499, apiPrice: 9499 });
  });

  test('detecta ausencia, diferencia de precio, de nombre y de orden', () => {
    const api = [
      { productId: '200', name: 'Control DualSense Blanco', price: 1699 },
      { productId: '100', name: 'Consola PlayStation 5 Slim Edición Digital', price: 9499 },
    ];
    const result = compareProducts(ui, api);
    const types = result.discrepancies.map((d) => `${d.type}:${d.productId}`).sort();

    expect(result.found).toBe(2);
    expect(result.rows.map((r) => r.status)).toEqual(['DIFF', 'DIFF', 'MISSING']);
    expect(types).toEqual([
      'MISSING_IN_RESPONSE:300',
      'NAME_MISMATCH:100',
      'ORDER_MISMATCH:100',
      'ORDER_MISMATCH:200',
      'PRICE_MISMATCH:200',
    ]);
  });
});
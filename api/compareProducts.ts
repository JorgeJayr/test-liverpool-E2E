import { ApiProduct } from './searchResponse';

export interface UiProduct {
  productId: string;
  name: string;
  price: number | null;
}

export type DiscrepancyType =
  | 'MISSING_IN_RESPONSE'
  | 'NAME_MISMATCH'
  | 'PRICE_MISMATCH'
  | 'ORDER_MISMATCH';

export interface Discrepancy {
  type: DiscrepancyType;
  productId: string;
  ui: UiProduct;
  api?: ApiProduct;
  detail: string;
}

/** Una fila por producto de la UI, lista para imprimir como tabla lado a lado. */
export interface ComparisonRow {
  productId: string;
  uiPosition: number;
  apiPosition: number | null;
  uiName: string;
  apiName: string | null;
  uiPrice: number | null;
  apiPrice: number | null;
  status: 'OK' | 'DIFF' | 'MISSING';
}

export interface ComparisonResult {
  rows: ComparisonRow[];
  /** Cuántos productos de la UI aparecen en la respuesta (por id, o por nombre si el id no coincide). */
  found: number;
  total: number;
  discrepancies: Discrepancy[];
}

const PRICE_TOLERANCE = 0.005;

/** Minúsculas, sin acentos y con espacios colapsados: evita falsos positivos por formato. */
export const normalizeName = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Compara los productos extraídos de la UI contra los de la respuesta interceptada.
 * - "Aparece": se localiza por productId (llave estable); si no, por nombre normalizado.
 * - Sobre los que aparecen se reportan diferencias de nombre, precio y posición.
 */
export function compareProducts(ui: UiProduct[], api: ApiProduct[]): ComparisonResult {
  const discrepancies: Discrepancy[] = [];
  const rows: ComparisonRow[] = [];
  let found = 0;

  ui.forEach((uiProduct, uiIndex) => {
    const byId = api.findIndex((p) => p.productId === uiProduct.productId);
    const apiIndex =
      byId !== -1
        ? byId
        : api.findIndex((p) => normalizeName(p.name) === normalizeName(uiProduct.name));

    if (apiIndex === -1) {
      rows.push({
        productId: uiProduct.productId,
        uiPosition: uiIndex + 1,
        apiPosition: null,
        uiName: uiProduct.name,
        apiName: null,
        uiPrice: uiProduct.price,
        apiPrice: null,
        status: 'MISSING',
      });
      discrepancies.push({
        type: 'MISSING_IN_RESPONSE',
        productId: uiProduct.productId,
        ui: uiProduct,
        detail: `"${uiProduct.name}" (${uiProduct.productId}) está en la UI pero no en la respuesta`,
      });
      return;
    }

    found++;
    const apiProduct = api[apiIndex];
    const discrepanciesBefore = discrepancies.length;

    if (normalizeName(apiProduct.name) !== normalizeName(uiProduct.name)) {
      discrepancies.push({
        type: 'NAME_MISMATCH',
        productId: uiProduct.productId,
        ui: uiProduct,
        api: apiProduct,
        detail: `UI: "${uiProduct.name}" vs API: "${apiProduct.name}"`,
      });
    }

    if (
      uiProduct.price === null ||
      apiProduct.price === null ||
      Math.abs(uiProduct.price - apiProduct.price) > PRICE_TOLERANCE
    ) {
      discrepancies.push({
        type: 'PRICE_MISMATCH',
        productId: uiProduct.productId,
        ui: uiProduct,
        api: apiProduct,
        detail: `${uiProduct.productId}: UI $${uiProduct.price} vs API $${apiProduct.price}`,
      });
    }

    if (apiIndex !== uiIndex) {
      discrepancies.push({
        type: 'ORDER_MISMATCH',
        productId: uiProduct.productId,
        ui: uiProduct,
        api: apiProduct,
        detail: `${uiProduct.productId}: posición ${uiIndex + 1} en la UI vs ${apiIndex + 1} en la API`,
      });
    }

    rows.push({
      productId: uiProduct.productId,
      uiPosition: uiIndex + 1,
      apiPosition: apiIndex + 1,
      uiName: uiProduct.name,
      apiName: apiProduct.name,
      uiPrice: uiProduct.price,
      apiPrice: apiProduct.price,
      status: discrepancies.length > discrepanciesBefore ? 'DIFF' : 'OK',
    });
  });

  return { rows, found, total: ui.length, discrepancies };
}
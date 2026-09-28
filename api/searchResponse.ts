import { API_FIELD_KEYS } from '../config/constants';
import { parsePrice } from '../utils/price';

export interface ApiProduct {
  productId: string;
  name: string;
  price: number | null;
}

/** Lee una clave literal ("product.displayName") o una ruta anidada ("prices.sale"). */
function readKey(obj: any, key: string): unknown {
  if (obj == null) return undefined;
  if (key in obj) return obj[key];
  return key.split('.').reduce<any>((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

/** Devuelve el primer valor no vacío entre las claves candidatas (soporta valores tipo ["texto"]). */
function pick(obj: any, keys: readonly string[]): unknown {
  for (const key of keys) {
    const raw = readKey(obj, key);
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const looksLikeProduct = (o: unknown): boolean =>
  isPlainObject(o) &&
  pick(o, API_FIELD_KEYS.id) !== undefined &&
  pick(o, API_FIELD_KEYS.name) !== undefined;

/**
 * Extrae los productos de la respuesta de /api/plp/search sin depender de una
 * ruta fija dentro del JSON: busca el arreglo más grande cuyos elementos
 * "parecen producto" (tienen id y nombre). Los campos candidatos viven en
 * config/constants.ts (API_FIELD_KEYS), así un cambio de schema se corrige ahí.
 */
export function extractApiProducts(payload: unknown): ApiProduct[] {
  const candidates: Record<string, unknown>[][] = [];

  const walk = (node: unknown, depth: number): void => {
    if (depth > 15 || node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      const objects = node.filter(isPlainObject);
      if (objects.length > 0 && objects.every(looksLikeProduct)) candidates.push(objects);
      node.forEach((child) => walk(child, depth + 1));
    } else {
      Object.values(node).forEach((child) => walk(child, depth + 1));
    }
  };
  walk(payload, 0);

  if (candidates.length === 0) {
    const topKeys = isPlainObject(payload) ? Object.keys(payload).join(', ') : typeof payload;
    throw new Error(
      `No se encontró una lista de productos en la respuesta. Claves de primer nivel: [${topKeys}]. ` +
        `Revisa API_FIELD_KEYS en config/constants.ts (claves buscadas: id=${API_FIELD_KEYS.id}, ` +
        `nombre=${API_FIELD_KEYS.name}) o corre con DEBUG_API=true para adjuntar el JSON completo.`
    );
  }

  const best = candidates.sort((a, b) => b.length - a.length)[0];
  return best.map((item) => ({
    productId: String(pick(item, API_FIELD_KEYS.id)),
    name: String(pick(item, API_FIELD_KEYS.name)).trim(),
    price: parsePrice(pick(item, API_FIELD_KEYS.price)),
  }));
}
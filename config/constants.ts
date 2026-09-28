export const SEARCH_TERM = process.env.SEARCH_TERM || 'playstation 5';
export const COLOR_FILTER = process.env.COLOR_FILTER || 'Blanco';
export const RESULTS_TO_EXTRACT = 5;
export const MIN_CROSS_VALIDATION_MATCHES = 3;

// Endpoint real confirmado: /api/plp/search (ver hallazgo en retroalimentación
// de entrega anterior). Se mantiene como override por variable de entorno
// por si el path cambia en el futuro.
export const SEARCH_API_PATTERN = new RegExp(
  process.env.SEARCH_API_PATTERN || 'api/plp/search',
  'i'
);

// Modo estricto: cualquier discrepancia UI vs API (nombre, precio, orden) hace fallar
// el test. Por defecto solo se registran (consola + anotaciones del reporte HTML) y
// el test falla únicamente si aparecen menos de MIN_CROSS_VALIDATION_MATCHES productos.
export const STRICT_CROSS_VALIDATION = process.env.STRICT_CROSS_VALIDATION === 'true';

// Adjunta al reporte el JSON completo de la respuesta interceptada (útil para depurar el schema).
export const DEBUG_API = process.env.DEBUG_API === 'true';

// Claves de cada producto en /api/plp/search (schema confirmado con la respuesta real).
// Se aceptan rutas anidadas ("priceInfo.salePrice") y valores tipo ["texto"].
// El precio que muestra la UI es priceInfo.salePrice; listPrice es el precio tachado.
export const API_FIELD_KEYS = {
  id: ['productId', 'skuRepositoryId'],
  name: ['title'],
  price: ['priceInfo.salePrice', 'priceInfo.promoPrice.price', 'priceInfo.listPrice.price'],
} as const;
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
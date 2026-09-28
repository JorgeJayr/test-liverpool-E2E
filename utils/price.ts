/**
 * Convierte un precio (texto de la UI o valor de la API) a número.
 * Acepta "$9,499.00", "9499", "9,499.00", 9499, e ignora un segundo
 * precio pegado (ej. precio tachado): toma siempre el primero.
 */
export function parsePrice(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;

  const amount = '([0-9]{1,3}(?:,[0-9]{3})+(?:\\.[0-9]+)?|[0-9]+(?:\\.[0-9]+)?)';
  // Se prioriza lo que va después de "$" para no confundir con otros números ("-20%").
  const match = raw.match(new RegExp(`\\$\\s*${amount}`)) ?? raw.match(new RegExp(amount));
  if (!match) return null;

  const value = parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}
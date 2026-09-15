export function getCurrencySymbol(currency: string): string {
  const formatted = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(0);

  return formatted.replace(/\d/g, '').trim();
}

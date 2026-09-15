export function formatMoney(amount: string | number | null, currency: string): string {
  if (amount === null) {
    return '—';
  }

  const value = typeof amount === 'string' ? Number(amount) : amount;

  if (Number.isNaN(value)) {
    return '—';
  }

  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(value);
}

export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'Dólar estadounidense' },
  { code: 'GBP', name: 'Libra esterlina' },
  { code: 'CHF', name: 'Franco suizo' },
  { code: 'JPY', name: 'Yen japonés' },
  { code: 'CAD', name: 'Dólar canadiense' },
  { code: 'AUD', name: 'Dólar australiano' },
  { code: 'MXN', name: 'Peso mexicano' },
  { code: 'BRL', name: 'Real brasileño' },
  { code: 'ARS', name: 'Peso argentino' },
  { code: 'COP', name: 'Peso colombiano' },
  { code: 'CLP', name: 'Peso chileno' },
  { code: 'PEN', name: 'Sol peruano' },
  { code: 'CNY', name: 'Yuan chino' },
  { code: 'INR', name: 'Rupia india' },
] as const;

export const SUPPORTED_CURRENCY_CODES = SUPPORTED_CURRENCIES.map((c) => c.code) as [
  string,
  ...string[],
];

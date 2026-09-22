/**
 * Convierte el valor de un `<input type="month">` (formato "YYYY-MM") en el
 * primer y último día de ese mes calendario, en formato ISO "YYYY-MM-DD"
 * listo para pasar a las funciones RPC de Postgres (`p_start`/`p_end`).
 *
 * Se extrae a una función pura y testeable en vez de calcularlo inline en el
 * componente, precisamente porque el cálculo del "último día del mes" es un
 * caso clásico de off-by-one (meses de 28/29/30/31 días, año bisiesto).
 */
export function getMonthRange(yyyyMm: string): { start: string; end: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(yyyyMm);

  if (!match) {
    throw new Error(`Mes inválido: "${yyyyMm}" no tiene el formato YYYY-MM.`);
  }

  const year = match[1];
  const month = match[2];

  if (year === undefined || month === undefined) {
    throw new Error(`Mes inválido: "${yyyyMm}" no tiene el formato YYYY-MM.`);
  }

  const yearNum = Number(year);
  const monthNum = Number(month);

  if (monthNum < 1 || monthNum > 12) {
    throw new Error(`Mes inválido: "${yyyyMm}" tiene un mes fuera de rango (01-12).`);
  }

  // Día 0 del mes siguiente == último día de este mes. `Date` con día 0
  // retrocede al último día del mes anterior al indicado, así que pasando
  // `monthNum` (base 1, en vez de `monthNum - 1` que sería el índice base 0
  // de ESE mes) obtenemos el último día de `monthNum`, no del anterior.
  const lastDay = new Date(yearNum, monthNum, 0).getDate();

  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${pad(lastDay)}`,
  };
}

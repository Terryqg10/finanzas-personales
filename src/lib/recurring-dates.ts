import type { Database } from '@/types/supabase';

type RecurringFrequency = Database['public']['Enums']['recurring_frequency'];

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Suma `monthsToAdd` meses a una fecha (año, mes-índice-0, día), recortando el
 * día resultante al último día real del mes de destino. Sin este recorte,
 * `new Date(2026, 1, 31)` (31 de "febrero") se normaliza a un 2 o 3 de marzo,
 * que rompería el recordatorio mensual de cualquier regla que venza a fin de
 * mes (alquiler el día 31, por ejemplo).
 */
function addMonthsClamped(
  year: number,
  monthIndex: number,
  day: number,
  monthsToAdd: number,
): Date {
  const targetMonthIndex = monthIndex + monthsToAdd;
  // El "día 0" del mes siguiente al de destino es el último día del mes de
  // destino: una forma de calcular longitudes de mes que ya resuelve solo
  // los saltos de año (targetMonthIndex puede ser negativo o > 11).
  const lastDayOfTargetMonth = new Date(year, targetMonthIndex + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  return new Date(year, targetMonthIndex, clampedDay);
}

/**
 * Calcula la próxima `next_due_date` de una recurring_rule tras confirmar u
 * omitir su recordatorio actual, según la frecuencia elegida por Terry:
 * semanal +7 días, mensual +1 mes, anual +1 año (con recorte de fin de mes /
 * 29 de febrero cuando corresponda).
 */
export function advanceDueDate(currentDueDate: string, frequency: RecurringFrequency): string {
  const [year, month, day] = currentDueDate.split('-').map(Number);

  if (frequency === 'weekly') {
    return toIsoDate(new Date(year, month - 1, day + 7));
  }

  const monthsToAdd = frequency === 'yearly' ? 12 : 1;
  return toIsoDate(addMonthsClamped(year, month - 1, day, monthsToAdd));
}

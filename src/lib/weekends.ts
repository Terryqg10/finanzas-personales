export interface WeekendRange {
  label: string;
}

/**
 * Devuelve los fines de semana que quedan en el mes de `referenceDate`,
 * empezando por el propio día si `referenceDate` cae en sábado o domingo.
 * Cada fin de semana completo (sábado + domingo, ambos dentro del mismo
 * mes) se representa como una sola entrada; un sábado o domingo suelto al
 * borde del mes se representa como una entrada de un solo día.
 */
export function getRemainingWeekends(referenceDate: Date = new Date()): WeekendRange[] {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const today = referenceDate.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const weekends: WeekendRange[] = [];

  for (let day = today; day <= lastDay; day++) {
    const dayOfWeek = new Date(year, month, day).getDay();

    if (dayOfWeek === 6) {
      const sunday = day + 1 <= lastDay ? day + 1 : null;
      weekends.push({ label: sunday ? `Sáb ${day} - Dom ${sunday}` : `Sáb ${day}` });
    } else if (dayOfWeek === 0 && day === today) {
      // Solo ocurre cuando el propio día de referencia es domingo: el
      // sábado correspondiente ya pasó, así que no se cuenta dos veces.
      weekends.push({ label: `Dom ${day}` });
    }
  }

  return weekends;
}

import { describe, expect, it } from 'vitest';

import { getRemainingWeekends } from './weekends';

// Enero 2024 es un calendario conocido y estable para las pruebas:
// 1 de enero de 2024 es lunes, por lo que los fines de semana caen en
// 6-7, 13-14, 20-21 y 27-28. El 31 de enero de 2024 es miércoles.
describe('getRemainingWeekends', () => {
  it('devuelve los fines de semana restantes desde un día de semana', () => {
    const result = getRemainingWeekends(new Date(2024, 0, 15));
    expect(result).toEqual([{ label: 'Sáb 20 - Dom 21' }, { label: 'Sáb 27 - Dom 28' }]);
  });

  it('incluye el propio día cuando hoy es sábado', () => {
    const result = getRemainingWeekends(new Date(2024, 0, 20));
    expect(result).toEqual([{ label: 'Sáb 20 - Dom 21' }, { label: 'Sáb 27 - Dom 28' }]);
  });

  it('muestra un solo día cuando hoy es el domingo de un fin de semana ya empezado', () => {
    const result = getRemainingWeekends(new Date(2024, 0, 28));
    expect(result).toEqual([{ label: 'Dom 28' }]);
  });

  it('devuelve un array vacío cuando no quedan fines de semana en el mes', () => {
    const result = getRemainingWeekends(new Date(2024, 0, 31));
    expect(result).toEqual([]);
  });
});

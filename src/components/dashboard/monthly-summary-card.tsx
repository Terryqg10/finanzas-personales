'use client';

import { useState, useTransition } from 'react';

import { getMonthRange } from '@/lib/date-range';
import type { PeriodSummary } from '@/lib/data/dashboard';
import { formatMoney } from '@/lib/format-money';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export function MonthlySummaryCard({
  initialData,
  initialMonth,
  currency,
}: {
  initialData: PeriodSummary;
  /** Mes inicial en formato "YYYY-MM", el mes en curso al cargar el Dashboard. */
  initialMonth: string;
  currency: string;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  function handleMonthChange(value: string) {
    if (!value) return;
    setMonth(value);

    startTransition(async () => {
      const { start, end } = getMonthRange(value);
      const supabase = createClient();
      const { data: row, error } = await supabase
        .rpc('get_period_summary', { p_currency: currency, p_start: start, p_end: end })
        .single();

      if (!error && row) {
        setData({
          income: row.income,
          expense: row.expense,
          remaining: row.income - row.expense,
          currency,
        });
      }
    });
  }

  const hasMovements = data.income !== 0 || data.expense !== 0;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-foreground text-sm font-semibold">Resumen del mes</h3>
        <input
          type="month"
          value={month}
          onChange={(e) => handleMonthChange(e.target.value)}
          aria-label="Elegir mes"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-full border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        />
      </div>

      {!hasMovements ? (
        <p className="text-muted-foreground mt-6 py-2 text-sm">
          {isPending ? 'Cargando…' : 'Sin movimientos en este mes.'}
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-muted-foreground">Ingresos</p>
            <p className="mt-1 font-medium text-emerald-600">
              {formatMoney(data.income, currency)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Gastos</p>
            <p className="text-foreground mt-1 font-medium">
              {formatMoney(data.expense, currency)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Restante</p>
            <p
              className={cn(
                'mt-1 text-2xl font-semibold tracking-tight',
                data.remaining >= 0 ? 'text-emerald-600' : 'text-rose-500',
              )}
            >
              {formatMoney(data.remaining, currency)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

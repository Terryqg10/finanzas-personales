'use client';

import { useState, useTransition } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CategoryBreakdownItem } from '@/lib/data/dashboard';
import { formatMoney } from '@/lib/format-money';
import { createClient } from '@/lib/supabase/client';

type Period = 'month' | 'quarter' | 'year';

function getPeriodRange(period: Period): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  let start: Date;

  if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'quarter') {
    start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
  }

  return { start: start.toISOString().slice(0, 10), end };
}

export function CategoryBreakdownChart({
  initialData,
  currency,
}: {
  initialData: CategoryBreakdownItem[];
  currency: string;
}) {
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  function handlePeriodChange(value: string) {
    const newPeriod = value as Period;
    setPeriod(newPeriod);

    startTransition(async () => {
      const supabase = createClient();
      const { start, end } = getPeriodRange(newPeriod);
      const { data: rows, error } = await supabase.rpc('get_category_breakdown', {
        p_currency: currency,
        p_start: start,
        p_end: end,
      });

      if (!error && rows) {
        setData(
          rows.map((row) => ({
            categoryId: row.category_id,
            categoryName: row.category_name,
            categoryColor: row.category_color,
            total: row.total,
          })),
        );
      }
    });
  }

  return (
    <div className="border-border rounded-md border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium">Gasto por categoría</h3>
        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Este mes</SelectItem>
            <SelectItem value="quarter">Últimos 3 meses</SelectItem>
            <SelectItem value="year">Este año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {isPending ? 'Cargando…' : 'Sin gastos en este periodo.'}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="categoryName"
              innerRadius={50}
              outerRadius={80}
            >
              {data.map((entry) => (
                <Cell key={entry.categoryId} fill={entry.categoryColor} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: unknown) =>
                formatMoney(typeof value === 'number' ? value : 0, currency)
              }
            />
          </PieChart>
        </ResponsiveContainer>
      )}

      <ul className="mt-4 space-y-1">
        {data.map((item) => (
          <li key={item.categoryId} className="flex items-center gap-2 text-sm">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.categoryColor }}
            />
            <span className="flex-1 truncate">{item.categoryName}</span>
            <span className="font-mono">{formatMoney(item.total, currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

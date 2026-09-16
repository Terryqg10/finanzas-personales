'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { MonthlyEvolutionItem } from '@/lib/data/dashboard';
import { formatMoney } from '@/lib/format-money';

const MONTH_LABELS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export function MonthlyEvolutionChart({
  data,
  currency,
}: {
  data: MonthlyEvolutionItem[];
  currency: string;
}) {
  const chartData = data.map((item) => {
    const date = new Date(item.month);
    return {
      label: MONTH_LABELS[date.getUTCMonth()],
      Ingresos: item.income,
      Gastos: item.expense,
    };
  });

  return (
    <div className="border-border rounded-md border p-4">
      <h3 className="mb-4 text-sm font-medium">Evolución mensual</h3>
      {chartData.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Todavía no hay suficiente historial.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" fontSize={12} />
            <YAxis fontSize={12} width={40} />
            <Tooltip
              formatter={(value: unknown) =>
                formatMoney(typeof value === 'number' ? value : 0, currency)
              }
            />
            <Legend />
            <Bar dataKey="Ingresos" fill="#22C55E" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

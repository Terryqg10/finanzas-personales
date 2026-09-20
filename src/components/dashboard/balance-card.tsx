import type { BalanceSummary } from '@/lib/data/dashboard';
import { formatMoney } from '@/lib/format-money';

export function BalanceCard({ summary }: { summary: BalanceSummary }) {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm">
      <p className="text-muted-foreground text-sm">Saldo total</p>
      <p className="text-foreground mt-1 text-4xl font-semibold tracking-tight">
        {formatMoney(summary.balance, summary.currency)}
      </p>
      <div className="mt-4 flex gap-6 text-sm">
        <div>
          <p className="text-muted-foreground">Ingresos</p>
          <p className="font-medium text-emerald-600">
            {formatMoney(summary.income, summary.currency)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Gastos</p>
          <p className="text-foreground font-medium">
            {formatMoney(summary.expense, summary.currency)}
          </p>
        </div>
      </div>
      {summary.otherCurrencyCount > 0 && (
        <p className="text-muted-foreground mt-4 text-xs">
          {summary.otherCurrencyCount} movimiento{summary.otherCurrencyCount === 1 ? '' : 's'} en
          una moneda base anterior no incluido{summary.otherCurrencyCount === 1 ? '' : 's'} en este
          total.
        </p>
      )}
    </div>
  );
}

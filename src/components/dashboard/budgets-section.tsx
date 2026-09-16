import type { BudgetProgressItem } from '@/lib/data/dashboard';
import { formatMoney } from '@/lib/format-money';
import { cn } from '@/lib/utils';

function progressColor(percentage: number, alertThreshold: number): string {
  if (percentage >= 100) return 'bg-destructive';
  if (percentage >= alertThreshold) return 'bg-amber-500';
  return 'bg-primary';
}

export function BudgetsSection({
  budgets,
  currency,
}: {
  budgets: BudgetProgressItem[];
  currency: string;
}) {
  return (
    <div className="border-border rounded-md border p-4">
      <h3 className="mb-4 text-sm font-medium">Presupuestos</h3>
      {budgets.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Todavía no has definido presupuestos (llega en la Fase 11).
        </p>
      ) : (
        <ul className="space-y-3">
          {budgets.map((budget) => {
            const percentage = Math.min(
              100,
              Math.round((budget.spent / budget.monthlyLimit) * 100),
            );
            return (
              <li key={budget.budgetId}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: budget.categoryColor }}
                    />
                    {budget.categoryName}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {formatMoney(budget.spent, currency)} /{' '}
                    {formatMoney(budget.monthlyLimit, currency)}
                  </span>
                </div>
                <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                  <div
                    className={cn(
                      'h-full transition-all',
                      progressColor(percentage, budget.alertThreshold),
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

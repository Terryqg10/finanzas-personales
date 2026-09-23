import { AlertTriangle } from 'lucide-react';

import type { BudgetProgressItem } from '@/lib/data/dashboard';
import { formatMoney } from '@/lib/format-money';
import { cn } from '@/lib/utils';

function progressColor(percentage: number, alertThreshold: number): string {
  if (percentage >= 100) return 'bg-destructive';
  if (percentage >= alertThreshold) return 'bg-amber-500';
  return 'bg-primary';
}

/**
 * Mensaje de alerta bajo la barra de progreso, según qué tan cerca (o por
 * encima) del límite está el gasto. `null` cuando el presupuesto va bien
 * (por debajo del umbral de alerta configurado por el usuario) y no hace
 * falta mostrar nada.
 */
function budgetAlert(budget: BudgetProgressItem): { message: string; className: string } | null {
  if (budget.spent >= budget.monthlyLimit) {
    return {
      message: `Sobrepasaste tu presupuesto de ${budget.categoryName}.`,
      className: 'text-destructive',
    };
  }

  const percentage = (budget.spent / budget.monthlyLimit) * 100;
  if (percentage >= budget.alertThreshold) {
    return {
      message: `Te estás acercando al límite de ${budget.categoryName}.`,
      className: 'text-amber-600',
    };
  }

  return null;
}

export function BudgetsSection({
  budgets,
  currency,
}: {
  budgets: BudgetProgressItem[];
  currency: string;
}) {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm">
      <h3 className="text-foreground mb-4 text-sm font-semibold">Presupuestos</h3>
      {budgets.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Todavía no has definido presupuestos. Créalos en{' '}
          <span className="text-foreground font-medium">Presupuestos</span>.
        </p>
      ) : (
        <ul className="space-y-3">
          {budgets.map((budget) => {
            const percentage = Math.min(
              100,
              Math.round((budget.spent / budget.monthlyLimit) * 100),
            );
            const alert = budgetAlert(budget);
            return (
              <li key={budget.budgetId}>
                <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: budget.categoryColor }}
                    />
                    <span className="truncate">{budget.categoryName}</span>
                  </span>
                  <span className="text-muted-foreground shrink-0 font-medium">
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
                {alert && (
                  <p className={cn('mt-1.5 flex items-center gap-1.5 text-xs', alert.className)}>
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>{alert.message}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

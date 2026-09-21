'use client';

import { useOptimistic } from 'react';

import { DeleteBudgetDialog } from '@/components/budgets/delete-budget-dialog';
import { EditBudgetDialog } from '@/components/budgets/edit-budget-dialog';
import type { BudgetProgressItem } from '@/lib/data/dashboard';
import { formatMoney } from '@/lib/format-money';
import { cn } from '@/lib/utils';

function progressColor(percentage: number, alertThreshold: number): string {
  if (percentage >= 100) return 'bg-destructive';
  if (percentage >= alertThreshold) return 'bg-amber-500';
  return 'bg-primary';
}

function BudgetRow({
  budget,
  currency,
  onDismiss,
}: {
  budget: BudgetProgressItem;
  currency: string;
  onDismiss: (budgetId: string) => void;
}) {
  const rawPercentage = (budget.spent / budget.monthlyLimit) * 100;
  const percentage = Math.min(100, Math.round(rawPercentage));
  const isOverLimit = rawPercentage >= 100;
  const isNearLimit = !isOverLimit && rawPercentage >= budget.alertThreshold;

  return (
    <li className="bg-card rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: budget.categoryColor }}
          />
          <div>
            <p className="text-foreground text-sm font-semibold">{budget.categoryName}</p>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">
              {formatMoney(budget.spent, currency)} de {formatMoney(budget.monthlyLimit, currency)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <EditBudgetDialog budget={budget} currency={currency} />
          <DeleteBudgetDialog budget={budget} onDismiss={onDismiss} />
        </div>
      </div>

      <div className="bg-secondary mt-4 h-2 w-full overflow-hidden rounded-full">
        <div
          className={cn(
            'h-full transition-all',
            progressColor(rawPercentage, budget.alertThreshold),
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {(isOverLimit || isNearLimit) && (
        <p
          className={cn(
            'mt-2 text-xs font-medium',
            isOverLimit ? 'text-destructive' : 'text-amber-600',
          )}
        >
          {isOverLimit
            ? 'Has superado el límite mensual de esta categoría.'
            : `Vas por el ${Math.round(rawPercentage)}% de tu límite (umbral: ${budget.alertThreshold}%).`}
        </p>
      )}
    </li>
  );
}

export function BudgetsList({
  budgets,
  currency,
}: {
  budgets: BudgetProgressItem[];
  currency: string;
}) {
  // Lista optimista: al confirmar un borrado, la fila desaparece al instante.
  // Si la Server Action falla, React revierte esta actualización y la fila
  // vuelve a aparecer.
  const [optimisticBudgets, dismissBudget] = useOptimistic(
    budgets,
    (state, dismissedBudgetId: string) =>
      state.filter((budget) => budget.budgetId !== dismissedBudgetId),
  );

  return (
    <ul className="space-y-3">
      {optimisticBudgets.map((budget) => (
        <BudgetRow
          key={budget.budgetId}
          budget={budget}
          currency={currency}
          onDismiss={dismissBudget}
        />
      ))}
    </ul>
  );
}

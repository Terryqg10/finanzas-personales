'use client';

import { useOptimistic } from 'react';

import { Badge } from '@/components/ui/badge';
import { DeleteFixedExpenseDialog } from '@/components/fixed-expenses/delete-fixed-expense-dialog';
import { EditFixedExpenseDialog } from '@/components/fixed-expenses/edit-fixed-expense-dialog';
import { ToggleFixedExpenseButton } from '@/components/fixed-expenses/toggle-fixed-expense-button';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category } from '@/lib/data/categories';
import type { FixedExpense } from '@/lib/data/fixed-expenses';
import { formatMoney } from '@/lib/format-money';
import { FREQUENCY_LABELS } from '@/lib/validations/fixed-expense';

function FixedExpenseRow({
  fixedExpense,
  categories,
  onDismiss,
}: {
  fixedExpense: FixedExpense;
  categories: Category[];
  onDismiss: (ruleId: string) => void;
}) {
  const Icon = getCategoryIcon(fixedExpense.categoryIcon);
  const isPaused = fixedExpense.status === 'paused';

  return (
    <li
      className={`bg-card flex items-center gap-4 rounded-2xl p-6 shadow-sm ${
        isPaused ? 'opacity-50' : ''
      }`}
    >
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: `${fixedExpense.categoryColor}20`,
          color: fixedExpense.categoryColor,
        }}
      >
        {/* eslint-disable-next-line react-hooks/static-components -- Icon viene de un mapa fijo (CATEGORY_ICONS), es una referencia estable, no un componente nuevo por render */}
        <Icon size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-foreground truncate text-sm font-semibold">
            {fixedExpense.description}
          </p>
          {fixedExpense.isEssential && <Badge variant="secondary">Esencial</Badge>}
          {isPaused && <Badge variant="outline">Pausado</Badge>}
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          {fixedExpense.categoryName} · {FREQUENCY_LABELS[fixedExpense.frequency]} · próximo
          vencimiento {new Date(fixedExpense.nextDueDate).toLocaleDateString('es-ES')}
        </p>
      </div>

      <span className="text-foreground shrink-0 text-sm font-medium">
        {formatMoney(fixedExpense.amount, fixedExpense.currency)}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        <ToggleFixedExpenseButton fixedExpense={fixedExpense} />
        <EditFixedExpenseDialog fixedExpense={fixedExpense} categories={categories} />
        <DeleteFixedExpenseDialog fixedExpense={fixedExpense} onDismiss={onDismiss} />
      </div>
    </li>
  );
}

export function FixedExpensesList({
  fixedExpenses,
  categories,
}: {
  fixedExpenses: FixedExpense[];
  categories: Category[];
}) {
  // Lista optimista: al confirmar un borrado, la fila desaparece al instante.
  // Si la Server Action falla, React revierte esta actualización y la fila
  // vuelve a aparecer. Pausar/reactivar tiene su propio estado optimista,
  // más local, dentro de ToggleFixedExpenseButton.
  const [optimisticFixedExpenses, dismissFixedExpense] = useOptimistic(
    fixedExpenses,
    (state, dismissedRuleId: string) =>
      state.filter((fixedExpense) => fixedExpense.ruleId !== dismissedRuleId),
  );

  return (
    <ul className="space-y-3">
      {optimisticFixedExpenses.map((fixedExpense) => (
        <FixedExpenseRow
          key={fixedExpense.ruleId}
          fixedExpense={fixedExpense}
          categories={categories}
          onDismiss={dismissFixedExpense}
        />
      ))}
    </ul>
  );
}

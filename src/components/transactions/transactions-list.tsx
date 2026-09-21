'use client';

import { useOptimistic } from 'react';

import { DeleteTransactionDialog } from '@/components/transactions/delete-transaction-dialog';
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category } from '@/lib/data/categories';
import type { TransactionWithCategory } from '@/lib/data/transactions';
import { formatShortDate } from '@/lib/format-date';
import { formatMoney } from '@/lib/format-money';
import { cn } from '@/lib/utils';

export function TransactionsList({
  transactions,
  categories,
}: {
  transactions: TransactionWithCategory[];
  categories: Category[];
}) {
  // Lista optimista: al confirmar un borrado, la fila desaparece al instante
  // (antes de que vuelva la respuesta del servidor). Si la Server Action
  // falla, React revierte esta actualización y la fila vuelve a aparecer.
  const [optimisticTransactions, dismissTransaction] = useOptimistic(
    transactions,
    (state, dismissedId: string) => state.filter((tx) => tx.id !== dismissedId),
  );

  return (
    <ul className="space-y-2">
      {optimisticTransactions.map((tx) => {
        const Icon = getCategoryIcon(tx.categories?.icon ?? 'shapes');
        const categoryColor = tx.categories?.color ?? '#71717A';

        return (
          <li
            key={tx.id}
            className="bg-card flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm"
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
            >
              <Icon size={18} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{tx.description}</p>
              <p className="text-muted-foreground truncate text-xs">
                {tx.categories?.name ?? 'Sin categoría'} · {formatShortDate(tx.date)}
                {tx.currency_original !== tx.currency_base && ` · ${tx.currency_original}`}
              </p>
            </div>

            <p
              className={cn(
                'shrink-0 text-sm font-medium',
                tx.type === 'income' ? 'text-emerald-600' : 'text-foreground',
              )}
            >
              {tx.type === 'income' ? '+' : '-'}
              {formatMoney(tx.amount_base, tx.currency_base)}
            </p>

            <div className="flex shrink-0 items-center">
              <EditTransactionDialog transaction={tx} categories={categories} />
              <DeleteTransactionDialog transaction={tx} onDismiss={dismissTransaction} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

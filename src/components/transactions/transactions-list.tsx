'use client';

import { useOptimistic, useState } from 'react';

import { DeleteSelectedDialog } from '@/components/transactions/delete-selected-dialog';
import { DeleteTransactionDialog } from '@/components/transactions/delete-transaction-dialog';
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog';
import { Button } from '@/components/ui/button';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category } from '@/lib/data/categories';
import type { TransactionWithCategory } from '@/lib/data/transactions';
import { formatShortDate } from '@/lib/format-date';
import { formatMoney } from '@/lib/format-money';
import { cn } from '@/lib/utils';
import { BULK_DELETE_MAX, formatMovementCount } from '@/lib/validations/transaction-bulk';

export function TransactionsList({
  transactions,
  categories,
}: {
  transactions: TransactionWithCategory[];
  categories: Category[];
}) {
  // Lista optimista: al confirmar un borrado, las filas desaparecen al instante
  // (antes de que vuelva la respuesta del servidor). Si la Server Action
  // falla, React revierte esta actualización y las filas vuelven a aparecer.
  const [optimisticTransactions, dismissTransactions] = useOptimistic(
    transactions,
    (state, dismissedIds: string[]) => state.filter((tx) => !dismissedIds.includes(tx.id)),
  );

  // Selección múltiple (specs/borrado-masivo-movimientos.md). Vive solo en esta
  // lista: la página la remonta al cambiar de página o de filtros, así que la
  // selección nunca incluye filas que ya no se ven.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selected = optimisticTransactions.filter((tx) => selectedIds.has(tx.id));
  const pageIds = optimisticTransactions.map((tx) => tx.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const overLimit = selected.length > BULK_DELETE_MAX;

  function exitSelection() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllInPage() {
    setSelectedIds(allSelected ? new Set() : new Set(pageIds));
  }

  return (
    <div className="space-y-4">
      {!selectionMode && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSelectionMode(true)}
          >
            Seleccionar
          </Button>
        </div>
      )}

      <ul className={cn('space-y-2', selectionMode && 'pb-24')}>
        {optimisticTransactions.map((tx) => {
          const Icon = getCategoryIcon(tx.categories?.icon ?? 'shapes');
          const categoryColor = tx.categories?.color ?? '#71717A';
          const isSelected = selectedIds.has(tx.id);

          return (
            <li
              key={tx.id}
              className={cn(
                'bg-card flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm',
                selectionMode && 'cursor-pointer',
                isSelected && 'ring-primary/40 ring-2',
              )}
              onClick={(event) => {
                // Un clic en la propia casilla ya la gestiona su onChange.
                if (selectionMode && !(event.target instanceof HTMLInputElement)) toggle(tx.id);
              }}
            >
              {selectionMode && (
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${tx.description}`}
                  className="accent-primary size-4 shrink-0"
                  checked={isSelected}
                  onChange={() => toggle(tx.id)}
                />
              )}

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
                  tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500',
                )}
              >
                {tx.type === 'income' ? '+' : '-'}
                {formatMoney(tx.amount_base, tx.currency_base)}
              </p>

              {!selectionMode && (
                <div className="flex shrink-0 items-center">
                  <EditTransactionDialog transaction={tx} categories={categories} />
                  <DeleteTransactionDialog
                    transaction={tx}
                    onDismiss={(id) => dismissTransactions([id])}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {selectionMode && (
        <div
          role="region"
          aria-label="Acciones de la selección"
          className="bg-card fixed inset-x-6 bottom-28 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] md:inset-x-auto md:right-10 md:bottom-8 md:min-w-96"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {selected.length === 0
                ? 'Nada seleccionado'
                : `${formatMovementCount(selected.length)} seleccionado${selected.length === 1 ? '' : 's'}`}
            </p>
            {overLimit && (
              <p className="text-destructive text-xs">
                Máximo {BULK_DELETE_MAX} por borrado: quita algunos.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={toggleAllInPage}>
              {allSelected ? 'Quitar todos' : 'Seleccionar los de esta página'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={exitSelection}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={selected.length === 0 || overLimit}
              onClick={() => setConfirmOpen(true)}
            >
              Borrar
            </Button>
          </div>
        </div>
      )}

      <DeleteSelectedDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        selected={selected}
        onDismiss={dismissTransactions}
        onDone={exitSelection}
      />
    </div>
  );
}

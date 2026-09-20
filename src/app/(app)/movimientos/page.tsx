import { CreateTransactionDialog } from '@/components/transactions/create-transaction-dialog';
import { DeleteTransactionDialog } from '@/components/transactions/delete-transaction-dialog';
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog';
import { FilterBar } from '@/components/transactions/filter-bar';
import { PaginationControls } from '@/components/transactions/pagination-controls';
import { getCategoryIcon } from '@/lib/category-icons';
import { getCategories } from '@/lib/data/categories';
import { getFilteredTransactions, type TransactionFilters } from '@/lib/data/transaction-filters';
import { formatShortDate } from '@/lib/data/transactions';
import { getUserSettings } from '@/lib/data/user-settings';
import { formatMoney } from '@/lib/format-money';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 30;

function parseFilters(params: Record<string, string | string[] | undefined>): TransactionFilters {
  const getStr = (key: string): string | undefined => {
    const value = params[key];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  };

  const categoriesParam = getStr('categories');
  const minParam = getStr('min');
  const maxParam = getStr('max');
  const typeParam = getStr('type');

  return {
    dateFrom: getStr('from'),
    dateTo: getStr('to'),
    categoryIds: categoriesParam ? categoriesParam.split(',').filter(Boolean) : undefined,
    type: typeParam === 'income' || typeParam === 'expense' ? typeParam : undefined,
    amountMin: minParam ? Number(minParam) : undefined,
    amountMax: maxParam ? Number(maxParam) : undefined,
  };
}

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const page = Number(typeof params.page === 'string' ? params.page : '0') || 0;

  const [categories, { transactions, total, hasMore }, settings] = await Promise.all([
    getCategories(),
    getFilteredTransactions(filters, page, PAGE_SIZE),
    getUserSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {total} movimiento{total === 1 ? '' : 's'} en total.
          </p>
        </div>
        <CreateTransactionDialog categories={categories} baseCurrency={settings.base_currency} />
      </div>

      <FilterBar categories={categories} />

      {transactions.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Ningún movimiento coincide con estos filtros.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {transactions.map((tx) => {
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
                    <DeleteTransactionDialog transaction={tx} />
                  </div>
                </li>
              );
            })}
          </ul>

          <PaginationControls page={page} hasMore={hasMore} />
        </>
      )}
    </div>
  );
}

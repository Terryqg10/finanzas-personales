import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { CreateTransactionDialog } from '@/components/transactions/create-transaction-dialog';
import { DeleteRangeDialog } from '@/components/transactions/delete-range-dialog';
import { FilterBar } from '@/components/transactions/filter-bar';
import { PaginationControls } from '@/components/transactions/pagination-controls';
import { TransactionsList } from '@/components/transactions/transactions-list';
import { getCategories } from '@/lib/data/categories';
import { getFilteredTransactions, type TransactionFilters } from '@/lib/data/transaction-filters';
import { getUserSettings } from '@/lib/data/user-settings';

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

  // Tras borrar la última fila de una página, esa página queda vacía: se vuelve a la primera conservando los filtros.
  if (transactions.length === 0 && page > 0) {
    const rest = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key !== 'page' && typeof value === 'string') rest.set(key, value);
    }
    const query = rest.toString();
    redirect(query ? `/movimientos?${query}` : '/movimientos');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {total} movimiento{total === 1 ? '' : 's'} en total.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DeleteRangeDialog defaultFrom={filters.dateFrom} defaultTo={filters.dateTo} />
          <Button asChild variant="secondary">
            <Link href="/movimientos/importar">Importar extracto</Link>
          </Button>
          <CreateTransactionDialog categories={categories} baseCurrency={settings.base_currency} />
        </div>
      </div>

      <FilterBar categories={categories} />

      {transactions.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Ningún movimiento coincide con estos filtros.
        </p>
      ) : (
        <>
          {/* La clave remonta la lista al cambiar de página o de filtros: así la selección múltiple nunca incluye filas que ya no se ven. */}
          <TransactionsList
            key={`${page}|${JSON.stringify(filters)}`}
            transactions={transactions}
            categories={categories}
          />

          <PaginationControls page={page} hasMore={hasMore} />
        </>
      )}
    </div>
  );
}

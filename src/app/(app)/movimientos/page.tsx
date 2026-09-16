import { CreateTransactionDialog } from '@/components/transactions/create-transaction-dialog';
import { DeleteTransactionDialog } from '@/components/transactions/delete-transaction-dialog';
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog';
import { getCategories } from '@/lib/data/categories';
import { getRecentTransactions } from '@/lib/data/transactions';
import { getUserSettings } from '@/lib/data/user-settings';
import { formatMoney } from '@/lib/format-money';

export default async function MovimientosPage() {
  const [categories, transactions, settings] = await Promise.all([
    getCategories(),
    getRecentTransactions(),
    getUserSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            El historial completo con filtros llega en la Fase 9. Por ahora, tus últimos
            movimientos:
          </p>
        </div>
        <CreateTransactionDialog categories={categories} baseCurrency={settings.base_currency} />
      </div>

      {transactions.length === 0 ? (
        <p className="text-muted-foreground text-sm">Todavía no has registrado movimientos.</p>
      ) : (
        <ul className="space-y-1">
          {transactions.map((tx) => (
            <li
              key={tx.id}
              className="border-border flex items-center gap-3 rounded-md border px-3 py-2 font-mono text-sm"
            >
              <span className="text-muted-foreground w-24 shrink-0">{tx.date}</span>
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: tx.categories?.color ?? '#71717A' }}
              />
              <span className="flex-1 truncate font-sans">{tx.description}</span>
              {tx.currency_original !== tx.currency_base && (
                <span className="text-muted-foreground text-xs">{tx.currency_original}</span>
              )}
              <span className={tx.type === 'income' ? 'text-emerald-600' : 'text-foreground'}>
                {tx.type === 'income' ? '+' : '-'}
                {formatMoney(tx.amount_base, tx.currency_base)}
              </span>
              <div className="flex items-center gap-1">
                <EditTransactionDialog transaction={tx} categories={categories} />
                <DeleteTransactionDialog transaction={tx} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

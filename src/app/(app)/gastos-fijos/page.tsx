import { CreateFixedExpenseDialog } from '@/components/fixed-expenses/create-fixed-expense-dialog';
import { FixedExpensesList } from '@/components/fixed-expenses/fixed-expenses-list';
import { getCategories } from '@/lib/data/categories';
import { getFixedExpenses } from '@/lib/data/fixed-expenses';
import { getUserSettings } from '@/lib/data/user-settings';
import { formatMoney } from '@/lib/format-money';

export default async function GastosFijosPage() {
  const [fixedExpenses, categories, userSettings] = await Promise.all([
    getFixedExpenses(),
    getCategories(),
    getUserSettings(),
  ]);

  const monthlyTotal = fixedExpenses
    .filter((expense) => expense.frequency === 'monthly' && expense.status === 'active')
    .reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Gastos Fijos</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Compromisos recurrentes (alquiler, suministros, transporte…) que se descuentan sí o sí
            de tu disponible en las Recomendaciones del dashboard, se hayan registrado ya como
            movimiento o no. Esto es una guía orientativa configurable por ti, no asesoría
            financiera profesional.
          </p>
        </div>
        <CreateFixedExpenseDialog
          categories={categories}
          baseCurrency={userSettings.base_currency}
        />
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <p className="text-muted-foreground text-sm">Total fijo mensual activo</p>
        <p className="text-foreground mt-1 text-2xl font-bold tracking-tight">
          {formatMoney(monthlyTotal, userSettings.base_currency)}
        </p>
      </div>

      {fixedExpenses.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Todavía no has añadido ningún gasto fijo. Empieza por lo más grande: alquiler o hipoteca,
          suministros, transporte o estudios.
        </p>
      ) : (
        <FixedExpensesList fixedExpenses={fixedExpenses} categories={categories} />
      )}
    </div>
  );
}

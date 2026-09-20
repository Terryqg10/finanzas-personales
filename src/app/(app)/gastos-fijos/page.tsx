import { Badge } from '@/components/ui/badge';
import { CreateFixedExpenseDialog } from '@/components/fixed-expenses/create-fixed-expense-dialog';
import { DeleteFixedExpenseDialog } from '@/components/fixed-expenses/delete-fixed-expense-dialog';
import { EditFixedExpenseDialog } from '@/components/fixed-expenses/edit-fixed-expense-dialog';
import { ToggleFixedExpenseButton } from '@/components/fixed-expenses/toggle-fixed-expense-button';
import { getCategoryIcon } from '@/lib/category-icons';
import { getCategories } from '@/lib/data/categories';
import { getFixedExpenses, type FixedExpense } from '@/lib/data/fixed-expenses';
import { getUserSettings } from '@/lib/data/user-settings';
import { formatMoney } from '@/lib/format-money';
import { FREQUENCY_LABELS } from '@/lib/validations/fixed-expense';

function FixedExpenseRow({
  fixedExpense,
  categories,
}: {
  fixedExpense: FixedExpense;
  categories: Awaited<ReturnType<typeof getCategories>>;
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
        <DeleteFixedExpenseDialog fixedExpense={fixedExpense} />
      </div>
    </li>
  );
}

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
        <ul className="space-y-3">
          {fixedExpenses.map((fixedExpense) => (
            <FixedExpenseRow
              key={fixedExpense.ruleId}
              fixedExpense={fixedExpense}
              categories={categories}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

import { CreateBudgetDialog } from '@/components/budgets/create-budget-dialog';
import { DeleteBudgetDialog } from '@/components/budgets/delete-budget-dialog';
import { EditBudgetDialog } from '@/components/budgets/edit-budget-dialog';
import { getCategories } from '@/lib/data/categories';
import { getBudgetProgress, type BudgetProgressItem } from '@/lib/data/dashboard';
import { getUserSettings } from '@/lib/data/user-settings';
import { formatMoney } from '@/lib/format-money';
import { cn } from '@/lib/utils';

function progressColor(percentage: number, alertThreshold: number): string {
  if (percentage >= 100) return 'bg-destructive';
  if (percentage >= alertThreshold) return 'bg-amber-500';
  return 'bg-primary';
}

function BudgetRow({ budget, currency }: { budget: BudgetProgressItem; currency: string }) {
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
          <DeleteBudgetDialog budget={budget} />
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

export default async function PresupuestosPage() {
  const userSettings = await getUserSettings();
  const [budgets, categories] = await Promise.all([
    getBudgetProgress(userSettings.base_currency),
    getCategories(),
  ]);

  const budgetedCategoryIds = new Set(budgets.map((budget) => budget.categoryId));
  const availableCategories = categories.filter(
    (category) => !budgetedCategoryIds.has(category.id),
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Presupuestos</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Un límite mensual continuo por categoría, evaluado siempre contra el mes en curso. Te
            avisamos aquí y en el dashboard al acercarte o superar el límite.
          </p>
        </div>
        <CreateBudgetDialog
          availableCategories={availableCategories}
          currency={userSettings.base_currency}
        />
      </div>

      {budgets.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Todavía no has definido ningún presupuesto. Empieza por las categorías donde más se te
          suele ir el dinero.
        </p>
      ) : (
        <ul className="space-y-3">
          {budgets.map((budget) => (
            <BudgetRow
              key={budget.budgetId}
              budget={budget}
              currency={userSettings.base_currency}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

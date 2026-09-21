import { BudgetsList } from '@/components/budgets/budgets-list';
import { CreateBudgetDialog } from '@/components/budgets/create-budget-dialog';
import { getCategories } from '@/lib/data/categories';
import { getBudgetProgress } from '@/lib/data/dashboard';
import { getUserSettings } from '@/lib/data/user-settings';

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
        <BudgetsList budgets={budgets} currency={userSettings.base_currency} />
      )}
    </div>
  );
}

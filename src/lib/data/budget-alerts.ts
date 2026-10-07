import { detectBudgetAlert, type BudgetAlert } from '@/lib/budget-alerts';
import { getBudgetProgress } from '@/lib/data/dashboard';
import { buildRateMap, getUserCurrencies } from '@/lib/data/user-currencies';

interface ExpenseForAlert {
  categoryId: string;
  /** Fecha ISO `aaaa-mm-dd` del gasto. */
  date: string;
  currency: string;
  amount: number;
  baseCurrency: string;
}

/**
 * Aviso de presupuesto para un gasto **ya guardado**: `null` si no cruza
 * ningún nivel, si su categoría no tiene presupuesto o si el gasto no cae en
 * el mes en curso (los presupuestos se evalúan siempre contra el mes actual).
 *
 * El importe añadido se convierte con las mismas tasas que usa la RPC
 * `get_budget_progress`, para que el "antes" (gastado menos este gasto) sea
 * coherente con el gastado que devuelve. Puede lanzar si falla la consulta;
 * quien llama debe tratarlo como un fallo no crítico.
 */
export async function getBudgetAlertForExpense(
  expense: ExpenseForAlert,
): Promise<BudgetAlert | null> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (expense.date.slice(0, 7) !== currentMonth) return null;

  const currencies = await getUserCurrencies();
  const rates = await buildRateMap(currencies, expense.baseCurrency);

  const rate = expense.currency === expense.baseCurrency ? 1 : rates[expense.currency];
  if (rate === undefined) return null;

  const budgets = await getBudgetProgress(expense.baseCurrency, rates);
  const budget = budgets.find((item) => item.categoryId === expense.categoryId);
  if (!budget) return null;

  return detectBudgetAlert({
    budgetId: budget.budgetId,
    categoryName: budget.categoryName,
    monthlyLimit: budget.monthlyLimit,
    alertThreshold: budget.alertThreshold,
    spentAfter: budget.spent,
    addedAmount: expense.amount * rate,
  });
}

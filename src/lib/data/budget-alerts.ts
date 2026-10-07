import {
  computeBudgetIncrease,
  detectBudgetAlert,
  type BudgetAlert,
  type TransactionSnapshot,
} from '@/lib/budget-alerts';
import { getBudgetProgress } from '@/lib/data/dashboard';
import { buildRateMap, getUserCurrencies } from '@/lib/data/user-currencies';

interface TransactionChange {
  /** Estado previo (edición) o `null` si el gasto es nuevo. */
  before: TransactionSnapshot | null;
  after: TransactionSnapshot;
  /** Moneda original del movimiento; no cambia al editarlo. */
  currency: string;
  baseCurrency: string;
}

/**
 * Aviso de presupuesto para un movimiento **ya guardado** (creado o editado):
 * `null` si no cruza ningún nivel, si su categoría no tiene presupuesto, si el
 * gasto no aumenta lo gastado este mes o no cae en el mes en curso (los
 * presupuestos se evalúan siempre contra el mes actual).
 *
 * Se avisa por el aumento neto del gasto (`computeBudgetIncrease`), convertido
 * con las mismas tasas que usa la RPC `get_budget_progress` para que el
 * "antes" (gastado menos ese aumento) sea coherente con el gastado que
 * devuelve. Spec: specs/alertas-presupuesto-edicion.md. Puede lanzar si falla
 * la consulta; quien llama debe tratarlo como un fallo no crítico.
 */
export async function getBudgetAlertForChange(
  change: TransactionChange,
): Promise<BudgetAlert | null> {
  const { before, after, currency, baseCurrency } = change;

  const currentMonth = new Date().toISOString().slice(0, 7);
  if (after.type !== 'expense' || after.date.slice(0, 7) !== currentMonth) return null;

  // La moneda del gasto se añade por si, tras guardar, ya no la usa ningún otro movimiento.
  const currencies = await getUserCurrencies();
  const rates = await buildRateMap([...new Set([...currencies, currency])], baseCurrency);

  const rate = currency === baseCurrency ? 1 : rates[currency];
  if (rate === undefined) return null;

  const increase = computeBudgetIncrease({ before, after, currentMonth, rate });
  if (increase <= 0) return null;

  const budgets = await getBudgetProgress(baseCurrency, rates);
  const budget = budgets.find((item) => item.categoryId === after.categoryId);
  if (!budget) return null;

  return detectBudgetAlert({
    budgetId: budget.budgetId,
    categoryName: budget.categoryName,
    monthlyLimit: budget.monthlyLimit,
    alertThreshold: budget.alertThreshold,
    spentAfter: budget.spent,
    addedAmount: increase,
  });
}

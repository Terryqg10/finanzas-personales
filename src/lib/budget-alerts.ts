/**
 * Detección del cruce de umbral o límite de un presupuesto al registrar un
 * gasto. Función pura, sin I/O. Spec: specs/alertas-presupuesto.md, sección 2.
 */

export type BudgetAlertLevel = 'threshold' | 'limit';

export interface BudgetAlert {
  level: BudgetAlertLevel;
  /** Presupuesto que cruzó el nivel (clave de no repetición del email). */
  budgetId: string;
  categoryName: string;
  /** Porcentaje del límite gastado tras el gasto, redondeado. */
  percentage: number;
  /** Umbral de alerta configurado (en %). */
  threshold: number;
  /** Gastado en el mes en curso tras el gasto, en la moneda base. */
  spent: number;
  /** Límite mensual del presupuesto, en la moneda base. */
  monthlyLimit: number;
}

export interface DetectBudgetAlertInput {
  budgetId: string;
  categoryName: string;
  monthlyLimit: number;
  /** Umbral de alerta en % del límite (p. ej. 80). */
  alertThreshold: number;
  /** Gastado en el mes en curso, ya incluyendo el gasto recién registrado. */
  spentAfter: number;
  /** Importe del gasto recién registrado, en la misma moneda que el resto. */
  addedAmount: number;
}

/** Trabajar en céntimos evita que 79,99999… frente a 80 falsee el cruce. */
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Devuelve el aviso solo si este gasto **hace cruzar** un nivel: estar ya por
 * encima antes del gasto no genera aviso repetido. Si cruza umbral y límite a
 * la vez, gana el límite (el más grave).
 */
export function detectBudgetAlert(input: DetectBudgetAlertInput): BudgetAlert | null {
  const { budgetId, categoryName, monthlyLimit, alertThreshold, spentAfter, addedAmount } = input;

  if (monthlyLimit <= 0 || addedAmount <= 0) return null;

  const limit = toCents(monthlyLimit);
  const after = toCents(spentAfter);
  const before = after - toCents(addedAmount);
  const thresholdAmount = Math.round((limit * alertThreshold) / 100);

  const build = (level: BudgetAlertLevel): BudgetAlert => ({
    level,
    budgetId,
    categoryName,
    percentage: Math.round((after / limit) * 100),
    threshold: alertThreshold,
    spent: spentAfter,
    monthlyLimit,
  });

  if (before < limit && after >= limit) return build('limit');
  if (before < thresholdAmount && after >= thresholdAmount && after < limit) {
    return build('threshold');
  }

  return null;
}

/** Estado de un movimiento relevante para el presupuesto, en su moneda original. */
export interface TransactionSnapshot {
  type: 'income' | 'expense';
  categoryId: string;
  /** Fecha ISO `aaaa-mm-dd`. */
  date: string;
  /** Importe positivo en la moneda original del movimiento. */
  amount: number;
}

export interface ComputeBudgetIncreaseInput {
  /** Estado previo (edición) o `null` si el gasto es nuevo. */
  before: TransactionSnapshot | null;
  after: TransactionSnapshot;
  /** Mes en curso como `aaaa-mm`. */
  currentMonth: string;
  /** Tasa moneda original → moneda base. */
  rate: number;
}

/**
 * Aumento neto, en moneda base, de lo gastado en el presupuesto de la
 * categoría **resultante** (`after.categoryId`) en el mes en curso. Un
 * movimiento solo cuenta si es un gasto de esa categoría con fecha en el mes
 * en curso. Nunca es negativo: bajar un gasto, cambiarlo de mes o convertirlo
 * en ingreso no puede avisar. Spec: specs/alertas-presupuesto-edicion.md, §2.
 */
export function computeBudgetIncrease(input: ComputeBudgetIncreaseInput): number {
  const { before, after, currentMonth, rate } = input;

  const contribution = (transaction: TransactionSnapshot | null): number => {
    if (
      transaction === null ||
      transaction.type !== 'expense' ||
      transaction.categoryId !== after.categoryId ||
      transaction.date.slice(0, 7) !== currentMonth
    ) {
      return 0;
    }
    return toCents(transaction.amount * rate);
  };

  return Math.max(0, contribution(after) - contribution(before)) / 100;
}

export function formatBudgetAlert(alert: BudgetAlert): string {
  return alert.level === 'limit'
    ? `Has superado el límite mensual de ${alert.categoryName}.`
    : `Vas por el ${alert.percentage}% de tu límite de ${alert.categoryName} (umbral: ${alert.threshold}%).`;
}

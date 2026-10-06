/**
 * Detección del cruce de umbral o límite de un presupuesto al registrar un
 * gasto. Función pura, sin I/O. Spec: specs/alertas-presupuesto.md, sección 2.
 */

export type BudgetAlertLevel = 'threshold' | 'limit';

export interface BudgetAlert {
  level: BudgetAlertLevel;
  categoryName: string;
  /** Porcentaje del límite gastado tras el gasto, redondeado. */
  percentage: number;
  /** Umbral de alerta configurado (en %). */
  threshold: number;
}

export interface DetectBudgetAlertInput {
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
  const { categoryName, monthlyLimit, alertThreshold, spentAfter, addedAmount } = input;

  if (monthlyLimit <= 0 || addedAmount <= 0) return null;

  const limit = toCents(monthlyLimit);
  const after = toCents(spentAfter);
  const before = after - toCents(addedAmount);
  const thresholdAmount = Math.round((limit * alertThreshold) / 100);
  const percentage = Math.round((after / limit) * 100);

  if (before < limit && after >= limit) {
    return { level: 'limit', categoryName, percentage, threshold: alertThreshold };
  }

  if (before < thresholdAmount && after >= thresholdAmount && after < limit) {
    return { level: 'threshold', categoryName, percentage, threshold: alertThreshold };
  }

  return null;
}

export function formatBudgetAlert(alert: BudgetAlert): string {
  return alert.level === 'limit'
    ? `Has superado el límite mensual de ${alert.categoryName}.`
    : `Vas por el ${alert.percentage}% de tu límite de ${alert.categoryName} (umbral: ${alert.threshold}%).`;
}

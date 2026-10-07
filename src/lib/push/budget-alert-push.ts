/**
 * Contenido de la notificación push de aviso de presupuesto. Función pura.
 * Spec: specs/alertas-presupuesto-push.md, sección 4.5.
 *
 * Sin importes: la notificación puede verse en la pantalla de bloqueo.
 */

import type { BudgetAlert } from '@/lib/budget-alerts';

export interface BudgetAlertPush {
  title: string;
  body: string;
  /** Ruta de la app que se abre al tocar la notificación. */
  url: string;
  /** Una notificación nueva con el mismo `tag` sustituye a la anterior del mismo presupuesto y nivel. */
  tag: string;
}

/** El nombre de la categoría es texto del usuario: una sola línea y sin pasarse de largo. */
function singleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function buildBudgetAlertPush(alert: BudgetAlert): BudgetAlertPush {
  const category = singleLine(alert.categoryName);

  return {
    title: `Presupuesto de ${category}`,
    body:
      alert.level === 'limit'
        ? 'Has superado el límite mensual.'
        : `Vas por el ${alert.percentage}% de tu límite.`,
    url: '/presupuestos',
    tag: `budget-${alert.budgetId}-${alert.level}`,
  };
}

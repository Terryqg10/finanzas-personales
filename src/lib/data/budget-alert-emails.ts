import type { SupabaseClient } from '@supabase/supabase-js';

import type { BudgetAlertLevel } from '@/lib/budget-alerts';
import type { Database } from '@/types/supabase';

/** Primer día del mes en curso (UTC) como `aaaa-mm-01`: la `month` de la tabla. */
export function currentMonthStart(now: Date = new Date()): string {
  return `${now.toISOString().slice(0, 7)}-01`;
}

export type ClaimResult = 'claimed' | 'already_sent' | 'error';

/**
 * Reserva el derecho a enviar el aviso: inserta la fila de
 * `(usuario, presupuesto, mes, nivel)` y solo quien la consigue insertar
 * envía. La restricción UNIQUE resuelve también dos gastos simultáneos (23505).
 * RLS limita la escritura al propio usuario.
 */
export async function claimBudgetAlertEmail(
  supabase: SupabaseClient<Database>,
  params: { userId: string; budgetId: string; level: BudgetAlertLevel },
): Promise<ClaimResult> {
  const { error } = await supabase.from('budget_alert_emails').insert({
    user_id: params.userId,
    budget_id: params.budgetId,
    month: currentMonthStart(),
    level: params.level,
  });

  if (!error) return 'claimed';
  return error.code === '23505' ? 'already_sent' : 'error';
}

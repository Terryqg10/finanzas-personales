'use client';

import { Pause, Play } from 'lucide-react';
import { useActionState, useEffect, useOptimistic } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { toggleFixedExpenseStatus } from '@/app/(app)/gastos-fijos/actions';
import { Button } from '@/components/ui/button';
import type { FixedExpense } from '@/lib/data/fixed-expenses';
import { initialFixedExpenseState } from '@/lib/validations/fixed-expense';
import type { Database } from '@/types/supabase';

type RecurringStatus = Database['public']['Enums']['recurring_status'];

function SubmitButton({ isActive }: { isActive: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={isActive ? 'Pausar gasto fijo' : 'Reactivar gasto fijo'}
    >
      {isActive ? <Pause size={14} /> : <Play size={14} />}
    </Button>
  );
}

export function ToggleFixedExpenseButton({ fixedExpense }: { fixedExpense: FixedExpense }) {
  const [state, formAction] = useActionState(toggleFixedExpenseStatus, initialFixedExpenseState);

  // Estado optimista derivado del status real: al hacer clic se actualiza al
  // instante (antes de que vuelva la respuesta del servidor) y, si la action
  // falla, React descarta automáticamente esta actualización optimista y la
  // UI vuelve al `fixedExpense.status` real en el siguiente render.
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<RecurringStatus>(
    fixedExpense.status,
  );
  const isActive = optimisticStatus === 'active';

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Estado actualizado.');
  }, [state]);

  useEffect(() => {
    if (state.status !== 'error') return;
    toast.error(state.message ?? 'No se pudo actualizar el estado.');
  }, [state]);

  async function action(formData: FormData) {
    setOptimisticStatus(isActive ? 'paused' : 'active');
    formAction(formData);
  }

  return (
    <form action={action}>
      <input type="hidden" name="id" value={fixedExpense.ruleId} />
      <input type="hidden" name="status" value={isActive ? 'paused' : 'active'} />
      <SubmitButton isActive={isActive} />
    </form>
  );
}

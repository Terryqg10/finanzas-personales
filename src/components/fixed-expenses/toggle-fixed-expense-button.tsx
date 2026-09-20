'use client';

import { Pause, Play } from 'lucide-react';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { toggleFixedExpenseStatus } from '@/app/(app)/gastos-fijos/actions';
import { Button } from '@/components/ui/button';
import type { FixedExpense } from '@/lib/data/fixed-expenses';
import { initialFixedExpenseState } from '@/lib/validations/fixed-expense';

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
  const isActive = fixedExpense.status === 'active';

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Estado actualizado.');
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={fixedExpense.ruleId} />
      <input type="hidden" name="status" value={isActive ? 'paused' : 'active'} />
      <SubmitButton isActive={isActive} />
    </form>
  );
}

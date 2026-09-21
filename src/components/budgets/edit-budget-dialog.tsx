'use client';

import { Loader2, Pencil } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { updateBudget } from '@/app/(app)/presupuestos/actions';
import { BudgetFormFields } from '@/components/budgets/budget-form-fields';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { BudgetProgressItem } from '@/lib/data/dashboard';
import { initialBudgetState } from '@/lib/validations/budget';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Guardando…' : 'Guardar cambios'}
    </Button>
  );
}

export function EditBudgetDialog({
  budget,
  currency,
}: {
  budget: BudgetProgressItem;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(updateBudget, initialBudgetState);

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Presupuesto actualizado.');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar el modal es una reacción legítima al resultado de la Server Action, no puede calcularse durante el render
    setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Editar presupuesto de ${budget.categoryName}`}
        >
          <Pencil size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar presupuesto</DialogTitle>
          <DialogDescription>
            {budget.categoryName}: ajusta el límite mensual o el umbral de alerta.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={budget.budgetId} />
          <BudgetFormFields
            currency={currency}
            defaultMonthlyLimit={budget.monthlyLimit}
            defaultAlertThreshold={budget.alertThreshold}
          />

          {state.status === 'error' && (
            <p role="alert" className="text-destructive text-sm">
              {state.message}
            </p>
          )}

          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

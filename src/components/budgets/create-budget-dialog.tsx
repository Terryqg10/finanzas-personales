'use client';

import { Loader2 } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { createBudget } from '@/app/(app)/presupuestos/actions';
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
import type { Category } from '@/lib/data/categories';
import { initialBudgetState } from '@/lib/validations/budget';

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Creando…' : 'Crear presupuesto'}
    </Button>
  );
}

export function CreateBudgetDialog({
  availableCategories,
  currency,
}: {
  availableCategories: Category[];
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createBudget, initialBudgetState);

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Presupuesto creado.');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar el modal es una reacción legítima al resultado de la Server Action, no puede calcularse durante el render
    setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={availableCategories.length === 0}>+ Presupuesto</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo presupuesto</DialogTitle>
          <DialogDescription>
            Elige una categoría y su límite mensual. Se evalúa siempre contra el mes en curso.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <BudgetFormFields currency={currency} categories={availableCategories} />

          {state.status === 'error' && (
            <p role="alert" className="text-destructive text-sm">
              {state.message}
            </p>
          )}

          <DialogFooter>
            <SubmitButton disabled={availableCategories.length === 0} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

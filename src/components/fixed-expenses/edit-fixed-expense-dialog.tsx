'use client';

import { Loader2, Pencil } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { updateFixedExpense } from '@/app/(app)/gastos-fijos/actions';
import { FixedExpenseFormFields } from '@/components/fixed-expenses/fixed-expense-form-fields';
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
import type { FixedExpense } from '@/lib/data/fixed-expenses';
import { initialFixedExpenseState } from '@/lib/validations/fixed-expense';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Guardando…' : 'Guardar cambios'}
    </Button>
  );
}

export function EditFixedExpenseDialog({
  fixedExpense,
  categories,
}: {
  fixedExpense: FixedExpense;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState(fixedExpense.currency);
  const [frequency, setFrequency] = useState<string>(fixedExpense.frequency);
  const [state, formAction] = useActionState(updateFixedExpense, initialFixedExpenseState);

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Gasto fijo actualizado.');
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
          aria-label={`Editar ${fixedExpense.description}`}
        >
          <Pencil size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar gasto fijo</DialogTitle>
          <DialogDescription>Actualiza el importe, la categoría o la frecuencia.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={fixedExpense.ruleId} />
          <FixedExpenseFormFields
            currency={currency}
            onCurrencyChange={setCurrency}
            frequency={frequency}
            onFrequencyChange={setFrequency}
            categories={categories}
            defaultDescription={fixedExpense.description}
            defaultAmount={fixedExpense.amount}
            defaultCategoryId={fixedExpense.categoryId}
            defaultNextDueDate={fixedExpense.nextDueDate}
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

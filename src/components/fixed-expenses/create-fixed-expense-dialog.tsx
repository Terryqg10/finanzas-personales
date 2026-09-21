'use client';

import { Loader2 } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { createFixedExpense } from '@/app/(app)/gastos-fijos/actions';
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
import { initialFixedExpenseState } from '@/lib/validations/fixed-expense';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Creando…' : 'Crear gasto fijo'}
    </Button>
  );
}

function nextMonthIsoDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString().slice(0, 10);
}

export function CreateFixedExpenseDialog({
  categories,
  baseCurrency,
}: {
  categories: Category[];
  baseCurrency: string;
}) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState(baseCurrency);
  const [frequency, setFrequency] = useState('monthly');
  const [state, formAction] = useActionState(createFixedExpense, initialFixedExpenseState);

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Gasto fijo creado.');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar el modal es una reacción legítima al resultado de la Server Action, no puede calcularse durante el render
    setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Gasto fijo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo gasto fijo</DialogTitle>
          <DialogDescription>
            Un compromiso recurrente (alquiler, suministros, transporte…) que se descontará sí o sí
            de tu disponible, se haya registrado ya el movimiento o no.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <FixedExpenseFormFields
            currency={currency}
            onCurrencyChange={setCurrency}
            frequency={frequency}
            onFrequencyChange={setFrequency}
            categories={categories}
            defaultNextDueDate={nextMonthIsoDate()}
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

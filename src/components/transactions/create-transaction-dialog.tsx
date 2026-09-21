'use client';

import { Loader2 } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { createTransaction } from '@/app/(app)/movimientos/actions';
import { TransactionFormFields } from '@/components/transactions/transaction-form-fields';
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
import { initialTransactionState } from '@/lib/validations/transaction';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Guardando…' : 'Registrar movimiento'}
    </Button>
  );
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CreateTransactionDialog({
  categories,
  baseCurrency,
}: {
  categories: Category[];
  baseCurrency: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [currency, setCurrency] = useState(baseCurrency);
  const [state, formAction] = useActionState(createTransaction, initialTransactionState);

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Movimiento registrado.');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar el modal es una reacción legítima al resultado de la Server Action, no puede calcularse durante el render
    setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Movimiento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo movimiento</DialogTitle>
          <DialogDescription>Registra un ingreso o un gasto.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <TransactionFormFields
            type={type}
            onTypeChange={setType}
            currency={currency}
            onCurrencyChange={setCurrency}
            categories={categories}
            defaultDate={todayIsoDate()}
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

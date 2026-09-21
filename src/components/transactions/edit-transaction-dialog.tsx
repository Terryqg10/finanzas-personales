'use client';

import { Loader2, Pencil } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { updateTransaction } from '@/app/(app)/movimientos/actions';
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
import type { TransactionWithCategory } from '@/lib/data/transactions';
import { initialTransactionState } from '@/lib/validations/transaction';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Guardando…' : 'Guardar cambios'}
    </Button>
  );
}

export function EditTransactionDialog({
  transaction,
  categories,
}: {
  transaction: TransactionWithCategory;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>(transaction.type);
  const [currency, setCurrency] = useState(transaction.currency_original);
  const [state, formAction] = useActionState(updateTransaction, initialTransactionState);

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Movimiento actualizado.');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar el modal es una reacción legítima al resultado de la Server Action, no puede calcularse durante el render
    setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Editar movimiento">
          <Pencil size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar movimiento</DialogTitle>
          <DialogDescription>
            Cambia los datos del movimiento. La moneda no se puede cambiar al editar.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={transaction.id} />
          <TransactionFormFields
            type={type}
            onTypeChange={setType}
            currency={currency}
            onCurrencyChange={setCurrency}
            currencyEditable={false}
            categories={categories}
            defaultDescription={transaction.description}
            defaultAmount={transaction.amount_original}
            defaultDate={transaction.date}
            defaultCategoryId={transaction.category_id}
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

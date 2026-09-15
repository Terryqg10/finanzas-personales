'use client';

import { Trash2 } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { deleteTransaction } from '@/app/(app)/movimientos/actions';
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
import type { TransactionWithCategory } from '@/lib/data/transactions';
import { initialTransactionState } from '@/lib/validations/transaction';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? 'Borrando…' : 'Borrar movimiento'}
    </Button>
  );
}

export function DeleteTransactionDialog({ transaction }: { transaction: TransactionWithCategory }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(deleteTransaction, initialTransactionState);

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Movimiento borrado.');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar el modal es una reacción legítima al resultado de la Server Action, no puede calcularse durante el render
    setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Borrar movimiento">
          <Trash2 size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrar movimiento</DialogTitle>
          <DialogDescription>
            ¿Seguro que quieres borrar &quot;{transaction.description}&quot;? Esta acción no se
            puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="id" value={transaction.id} />
          {state.status === 'error' && (
            <p role="alert" className="mb-4 text-sm text-red-600">
              {state.message}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

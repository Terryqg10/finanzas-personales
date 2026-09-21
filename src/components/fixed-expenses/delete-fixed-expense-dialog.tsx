'use client';

import { Trash2 } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { deleteFixedExpense } from '@/app/(app)/gastos-fijos/actions';
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
import type { FixedExpense } from '@/lib/data/fixed-expenses';
import { initialFixedExpenseState } from '@/lib/validations/fixed-expense';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? 'Borrando…' : 'Borrar gasto fijo'}
    </Button>
  );
}

export function DeleteFixedExpenseDialog({
  fixedExpense,
  onDismiss,
}: {
  fixedExpense: FixedExpense;
  /**
   * Callback opcional para quitar esta fila de la lista optimista del padre
   * en cuanto se confirma el borrado, sin esperar la respuesta del servidor.
   */
  onDismiss?: (ruleId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, formActionBase] = useActionState(deleteFixedExpense, initialFixedExpenseState);

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Gasto fijo borrado.');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar el modal es una reacción legítima al resultado de la Server Action, no puede calcularse durante el render
    setOpen(false);
  }, [state]);

  async function formAction(formData: FormData) {
    onDismiss?.(fixedExpense.ruleId);
    formActionBase(formData);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Borrar ${fixedExpense.description}`}
        >
          <Trash2 size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrar gasto fijo</DialogTitle>
          <DialogDescription>
            ¿Seguro que quieres borrar &quot;{fixedExpense.description}&quot;? Esta acción no se
            puede deshacer y dejará de descontarse de tus Recomendaciones.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="id" value={fixedExpense.ruleId} />
          {state.status === 'error' && (
            <p role="alert" className="text-destructive mb-4 text-sm">
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

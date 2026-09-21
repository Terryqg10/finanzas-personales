'use client';

import { Trash2 } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { deleteBudget } from '@/app/(app)/presupuestos/actions';
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
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? 'Borrando…' : 'Borrar presupuesto'}
    </Button>
  );
}

export function DeleteBudgetDialog({
  budget,
  onDismiss,
}: {
  budget: BudgetProgressItem;
  /**
   * Callback opcional para quitar esta fila de la lista optimista del padre
   * en cuanto se confirma el borrado, sin esperar la respuesta del servidor.
   */
  onDismiss?: (budgetId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, formActionBase] = useActionState(deleteBudget, initialBudgetState);

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Presupuesto borrado.');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar el modal es una reacción legítima al resultado de la Server Action, no puede calcularse durante el render
    setOpen(false);
  }, [state]);

  async function formAction(formData: FormData) {
    onDismiss?.(budget.budgetId);
    formActionBase(formData);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Borrar presupuesto de ${budget.categoryName}`}
        >
          <Trash2 size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrar presupuesto</DialogTitle>
          <DialogDescription>
            ¿Seguro que quieres borrar el presupuesto de &quot;{budget.categoryName}&quot;? Esta
            acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="id" value={budget.budgetId} />
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

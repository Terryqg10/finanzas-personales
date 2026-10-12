'use client';

import { Download } from 'lucide-react';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { deleteTransactions } from '@/app/(app)/movimientos/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TransactionWithCategory } from '@/lib/data/transactions';
import { downloadTextFile } from '@/lib/export/download';
import {
  buildSelectionFilename,
  buildTransactionsCsv,
  toExportRow,
} from '@/lib/export/transactions-csv';
import { formatMovementCount, initialBulkDeleteState } from '@/lib/validations/transaction-bulk';

function SubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? 'Borrando…' : `Borrar ${formatMovementCount(count)}`}
    </Button>
  );
}

/**
 * Confirmación del borrado de los movimientos seleccionados. La copia en CSV es
 * opcional y se genera en el navegador con las filas que ya están en pantalla.
 * Spec: specs/borrado-masivo-movimientos.md, secciones 2.1 y 2.3.
 */
export function DeleteSelectedDialog({
  open,
  onOpenChange,
  selected,
  onDismiss,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: TransactionWithCategory[];
  /** Quita las filas de la lista optimista del padre en cuanto se confirma el borrado. */
  onDismiss: (ids: string[]) => void;
  /** Se llama tras borrar con éxito (el padre sale del modo selección). */
  onDone: () => void;
}) {
  const [state, formActionBase] = useActionState(deleteTransactions, initialBulkDeleteState);

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Movimientos borrados.');
    onOpenChange(false);
    onDone();
    // `onOpenChange` y `onDone` son estables en el padre; el efecto debe reaccionar solo al resultado de la acción.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function formAction(formData: FormData) {
    onDismiss(selected.map((transaction) => transaction.id));
    formActionBase(formData);
  }

  function handleDownloadCopy() {
    const today = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      buildSelectionFilename(today),
      buildTransactionsCsv(selected.map(toExportRow)),
      'text/csv',
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrar movimientos</DialogTitle>
          <DialogDescription>
            Vas a borrar {formatMovementCount(selected.length)}. Esta acción no se puede deshacer.
            Si quieres conservarlos, descarga antes una copia.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {selected.map((transaction) => (
            <input key={transaction.id} type="hidden" name="ids" value={transaction.id} />
          ))}
          {state.status === 'error' && (
            <p role="alert" className="text-destructive text-sm">
              {state.message}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleDownloadCopy}>
              <Download size={14} aria-hidden="true" />
              Descargar copia
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <SubmitButton count={selected.length} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

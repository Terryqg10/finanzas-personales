'use client';

import { Download, Trash2 } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import {
  countTransactionsInRange,
  deleteTransactionsInRange,
} from '@/app/(app)/movimientos/actions';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { downloadBlob } from '@/lib/export/download';
import { buildExportFilename } from '@/lib/export/transactions-csv';
import { formatLongDate } from '@/lib/format-date';
import {
  formatMovementCount,
  initialBulkDeleteState,
  transactionRangeSchema,
} from '@/lib/validations/transaction-bulk';

function SubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? 'Borrando…' : `Borrar ${formatMovementCount(count)}`}
    </Button>
  );
}

/**
 * Borrado de todos los movimientos de un periodo, en dos pasos: elegir fechas y
 * confirmar viendo cuántos se borrarán, con copia en CSV opcional. El servidor
 * vuelve a validar el rango al borrar. Spec: specs/borrado-masivo-movimientos.md, 2.2.
 */
export function DeleteRangeDialog({
  defaultFrom,
  defaultTo,
}: {
  /** Fechas del filtro activo de la lista, para precargar el periodo. */
  defaultFrom?: string;
  defaultTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'range' | 'confirm'>('range');
  const [from, setFrom] = useState(defaultFrom ?? '');
  const [to, setTo] = useState(defaultTo ?? '');
  const [onlyImported, setOnlyImported] = useState(false);
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [state, formAction] = useActionState(deleteTransactionsInRange, initialBulkDeleteState);

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Movimientos borrados.');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar el diálogo es una reacción legítima al resultado de la Server Action, no puede calcularse durante el render
    setOpen(false);
  }, [state]);

  function handleOpenChange(next: boolean) {
    setOpen(next);

    if (next) {
      // Al abrir, el periodo vuelve a las fechas del filtro activo y se empieza por el paso 1.
      setStep('range');
      setFrom(defaultFrom ?? '');
      setTo(defaultTo ?? '');
      setOnlyImported(false);
      setMessage(null);
    }
  }

  async function handleContinue() {
    const parsed = transactionRangeSchema.safeParse({ from, to, onlyImported });

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Revisa las fechas.');
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await countTransactionsInRange(parsed.data);

      if (result.status === 'error') {
        setMessage(result.message);
        return;
      }
      if (result.count === 0) {
        setMessage('No hay movimientos en ese periodo.');
        return;
      }

      setCount(result.count);
      setStep('confirm');
    } catch {
      setMessage('No se pudo conectar con el servidor. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadCopy() {
    setBusy(true);
    try {
      const params = new URLSearchParams({ from, to, onlyImported: onlyImported ? '1' : '0' });
      const response = await fetch(`/api/transactions/export?${params.toString()}`);

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? 'No se pudo generar la copia.');
        return;
      }

      downloadBlob(buildExportFilename(from, to), await response.blob());
    } catch {
      toast.error('No se pudo descargar la copia. Revisa tu conexión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary">
          <Trash2 size={14} aria-hidden="true" />
          Borrar por fechas
        </Button>
      </DialogTrigger>
      <DialogContent>
        {step === 'range' ? (
          <>
            <DialogHeader>
              <DialogTitle>Borrar por fechas</DialogTitle>
              <DialogDescription>
                Elige el periodo cuyos movimientos quieres borrar. Antes de borrar te diré cuántos
                son.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="delete-range-from">Desde</Label>
                  <Input
                    id="delete-range-from"
                    type="date"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delete-range-to">Hasta</Label>
                  <Input
                    id="delete-range-to"
                    type="date"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                  />
                </div>
              </div>

              <Label htmlFor="delete-range-imported" className="cursor-pointer items-start gap-3">
                <input
                  id="delete-range-imported"
                  type="checkbox"
                  className="accent-primary mt-0.5 size-4 shrink-0"
                  checked={onlyImported}
                  onChange={(event) => setOnlyImported(event.target.checked)}
                />
                <span className="space-y-1">
                  <span className="block">Solo los importados desde un extracto</span>
                  <span className="text-muted-foreground block text-xs font-normal">
                    Respeta los que creaste a mano. Útil para borrar un periodo y volver a
                    importarlo.
                  </span>
                </span>
              </Label>

              {message && (
                <p role="alert" className="text-destructive text-sm">
                  {message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={busy} onClick={() => void handleContinue()}>
                {busy ? 'Contando…' : 'Continuar'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar borrado</DialogTitle>
              <DialogDescription>
                Se borrarán {formatMovementCount(count)} entre el {formatLongDate(from)} y el{' '}
                {formatLongDate(to)}
                {onlyImported ? ' (solo los importados)' : ''}. Esta acción no se puede deshacer. Si
                quieres conservarlos, descarga antes una copia.
              </DialogDescription>
            </DialogHeader>

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="from" value={from} />
              <input type="hidden" name="to" value={to} />
              <input type="hidden" name="onlyImported" value={String(onlyImported)} />
              {state.status === 'error' && (
                <p role="alert" className="text-destructive text-sm">
                  {state.message}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleDownloadCopy()}
                >
                  <Download size={14} aria-hidden="true" />
                  {busy ? 'Preparando…' : 'Descargar copia'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setStep('range')}>
                  Atrás
                </Button>
                <SubmitButton count={count} />
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

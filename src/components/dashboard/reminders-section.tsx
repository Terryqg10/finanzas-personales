'use client';

import { Check, SkipForward } from 'lucide-react';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { confirmRecurringReminder, skipRecurringReminder } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import type { PendingReminderItem } from '@/lib/data/dashboard';
import { formatMoney } from '@/lib/format-money';
import { initialReminderState } from '@/lib/validations/recurring-reminder';

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="default"
      size="icon"
      className="size-8 rounded-full"
      disabled={pending}
      aria-label="Confirmar movimiento"
      title="Confirmar: crea el movimiento con estos datos"
    >
      <Check size={14} />
    </Button>
  );
}

function SkipButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon"
      className="size-8 rounded-full"
      disabled={pending}
      aria-label="Omitir este mes"
      title="Omitir: no crea movimiento, solo avanza la próxima fecha"
    >
      <SkipForward size={14} />
    </Button>
  );
}

function ReminderRow({ reminder }: { reminder: PendingReminderItem }) {
  const [confirmState, confirmAction] = useActionState(
    confirmRecurringReminder,
    initialReminderState,
  );
  const [skipState, skipAction] = useActionState(skipRecurringReminder, initialReminderState);

  useEffect(() => {
    if (confirmState.status === 'success') {
      toast.success(confirmState.message ?? 'Movimiento registrado.');
    } else if (confirmState.status === 'error') {
      toast.error(confirmState.message ?? 'No se pudo confirmar el recordatorio.');
    }
  }, [confirmState]);

  useEffect(() => {
    if (skipState.status === 'success') {
      toast.success(skipState.message ?? 'Recordatorio omitido.');
    } else if (skipState.status === 'error') {
      toast.error(skipState.message ?? 'No se pudo omitir el recordatorio.');
    }
  }, [skipState]);

  return (
    <li className="flex items-center gap-3 text-sm">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: reminder.categoryColor }}
      />
      <span className="flex-1 truncate">{reminder.description}</span>
      <span className="text-foreground font-medium">
        {formatMoney(reminder.amount, reminder.currency)}
      </span>
      <form action={skipAction}>
        <input type="hidden" name="ruleId" value={reminder.ruleId} />
        <SkipButton />
      </form>
      <form action={confirmAction}>
        <input type="hidden" name="ruleId" value={reminder.ruleId} />
        <ConfirmButton />
      </form>
    </li>
  );
}

export function RemindersSection({ reminders }: { reminders: PendingReminderItem[] }) {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm">
      <h3 className="text-foreground mb-1 text-sm font-semibold">
        Movimientos recurrentes pendientes
      </h3>
      <p className="text-muted-foreground mb-4 text-xs">
        Nunca se crean solos: confirma cada uno para registrarlo, u omite este mes si no
        corresponde.
      </p>
      {reminders.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay recordatorios pendientes.</p>
      ) : (
        <ul className="space-y-3">
          {reminders.map((reminder) => (
            <ReminderRow key={reminder.ruleId} reminder={reminder} />
          ))}
        </ul>
      )}
    </div>
  );
}

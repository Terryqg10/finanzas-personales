'use client';

import { Check, SkipForward } from 'lucide-react';
import { useActionState, useEffect, useOptimistic } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { confirmRecurringReminder, skipRecurringReminder } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import type { PendingReminderItem } from '@/lib/data/dashboard';
import { formatMoney } from '@/lib/format-money';
import { cn } from '@/lib/utils';
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

function ReminderRow({
  reminder,
  onDismiss,
}: {
  reminder: PendingReminderItem;
  onDismiss: (ruleId: string) => void;
}) {
  const [confirmState, confirmActionBase] = useActionState(
    confirmRecurringReminder,
    initialReminderState,
  );
  const [skipState, skipActionBase] = useActionState(skipRecurringReminder, initialReminderState);

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

  // Cada wrapper marca la fila como descartada al instante (la lista
  // optimista del padre la oculta de inmediato) y solo después dispara la
  // Server Action real. Si esta falla, React revierte la actualización
  // optimista del padre y la fila vuelve a aparecer.
  async function confirmAction(formData: FormData) {
    onDismiss(reminder.ruleId);
    confirmActionBase(formData);
  }

  async function skipAction(formData: FormData) {
    onDismiss(reminder.ruleId);
    skipActionBase(formData);
  }

  return (
    <li className="flex items-center gap-3 text-sm">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: reminder.categoryColor }}
      />
      <span className="flex-1 truncate">{reminder.description}</span>
      <span
        className={cn(
          'font-medium',
          reminder.type === 'income' ? 'text-emerald-600' : 'text-rose-500',
        )}
      >
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
  const [optimisticReminders, dismissReminder] = useOptimistic(
    reminders,
    (state, dismissedRuleId: string) =>
      state.filter((reminder) => reminder.ruleId !== dismissedRuleId),
  );

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm">
      <h3 className="text-foreground mb-1 text-sm font-semibold">
        Movimientos recurrentes pendientes
      </h3>
      <p className="text-muted-foreground mb-4 text-xs">
        Nunca se crean solos: confirma cada uno para registrarlo, u omite este mes si no
        corresponde.
      </p>
      {optimisticReminders.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay recordatorios pendientes.</p>
      ) : (
        <ul className="space-y-3">
          {optimisticReminders.map((reminder) => (
            <ReminderRow key={reminder.ruleId} reminder={reminder} onDismiss={dismissReminder} />
          ))}
        </ul>
      )}
    </div>
  );
}

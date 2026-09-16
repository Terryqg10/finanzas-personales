import type { PendingReminderItem } from '@/lib/data/dashboard';
import { formatMoney } from '@/lib/format-money';

export function RemindersSection({ reminders }: { reminders: PendingReminderItem[] }) {
  return (
    <div className="border-border rounded-md border p-4">
      <h3 className="mb-4 text-sm font-medium">Movimientos recurrentes pendientes</h3>
      {reminders.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No hay recordatorios pendientes (la confirmación llega en la Fase 10).
        </p>
      ) : (
        <ul className="space-y-2">
          {reminders.map((reminder) => (
            <li key={reminder.ruleId} className="flex items-center gap-3 text-sm">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: reminder.categoryColor }}
              />
              <span className="flex-1 truncate">{reminder.description}</span>
              <span className="font-mono">{formatMoney(reminder.amount, reminder.currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

export function NotifyEmailForm({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, setIsPending] = useState(false);

  async function handleToggle() {
    const next = !enabled;

    // Cambio optimista: el interruptor responde al instante y se revierte si falla.
    setEnabled(next);
    setIsPending(true);

    try {
      const response = await fetch('/api/settings/notify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setEnabled(!next);
        toast.error(data?.error ?? 'No se pudo actualizar la preferencia de emails.');
        return;
      }

      toast.success(next ? 'Avisos por email activados.' : 'Avisos por email desactivados.');
    } catch {
      setEnabled(!next);
      toast.error('No se pudo conectar con el servidor.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <span id="notify-email-label" className="text-foreground text-sm font-medium">
        Avisarme por email
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby="notify-email-label"
        disabled={isPending}
        onClick={() => void handleToggle()}
        className={cn(
          'focus-visible:ring-ring/50 relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-[3px] disabled:opacity-50',
          enabled ? 'bg-primary' : 'bg-secondary',
        )}
      >
        <span
          className={cn(
            'bg-background inline-block size-5 rounded-full shadow-sm transition-transform',
            enabled ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

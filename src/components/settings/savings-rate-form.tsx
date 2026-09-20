'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

export function SavingsRateForm({ currentRate }: { currentRate: number }) {
  const [value, setValue] = useState(String(currentRate));
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const savingsRateTarget = Number(value);

    startTransition(async () => {
      try {
        const response = await fetch('/api/settings/savings-rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ savingsRateTarget }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          toast.error(data?.error ?? 'No se pudo actualizar el objetivo de ahorro.');
          return;
        }

        toast.success('Objetivo de ahorro actualizado.');
      } catch {
        toast.error('No se pudo conectar con el servidor.');
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex h-10 w-28 items-center gap-1 rounded-xl border bg-transparent px-4 shadow-xs focus-within:ring-[3px]">
        <input
          type="number"
          min={0}
          max={100}
          step="1"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={isPending}
          aria-label="Objetivo de ahorro en porcentaje"
          className="h-full w-full bg-transparent text-sm outline-none"
        />
        <span className="text-muted-foreground shrink-0 text-sm">%</span>
      </div>
      <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
        {isPending ? 'Guardando…' : 'Guardar'}
      </Button>
    </div>
  );
}

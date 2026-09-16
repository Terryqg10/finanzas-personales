'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';

export function BaseCurrencyForm({ currentCurrency }: { currentCurrency: string }) {
  const [selection, setSelection] = useState(currentCurrency);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const currencyToSave = selection;

    startTransition(async () => {
      try {
        const response = await fetch('/api/settings/base-currency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseCurrency: currencyToSave }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          toast.error(data?.error ?? 'No se pudo actualizar la moneda base.');
          return;
        }

        toast.success('Moneda base actualizada.');
      } catch {
        toast.error('No se pudo conectar con el servidor.');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selection} onValueChange={setSelection} disabled={isPending}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Elige una moneda" />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_CURRENCIES.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.code} — {currency.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
        {isPending ? 'Guardando…' : 'Guardar'}
      </Button>
    </div>
  );
}

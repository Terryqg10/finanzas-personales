'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { updateBaseCurrency } from '@/app/(app)/configuracion/actions';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { initialSettingsState } from '@/lib/validations/settings';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Guardando…' : 'Guardar'}
    </Button>
  );
}

export function BaseCurrencyForm({ currentCurrency }: { currentCurrency: string }) {
  const [currency, setCurrency] = useState(currentCurrency);
  const [state, formAction] = useActionState(updateBaseCurrency, initialSettingsState);

  useEffect(() => {
    if (state.status === 'success') {
      toast.success(state.message ?? 'Moneda base actualizada.');
    } else if (state.status === 'error') {
      toast.error(state.message ?? 'Algo salió mal.');
    }
  }, [state]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <Select name="baseCurrency" value={currency} onValueChange={setCurrency}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Elige una moneda" />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.code} — {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SubmitButton />
    </form>
  );
}

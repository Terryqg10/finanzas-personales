'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Category } from '@/lib/data/categories';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { getCurrencySymbol } from '@/lib/currency-symbol';
import { FREQUENCY_LABELS, FIXED_EXPENSE_FREQUENCIES } from '@/lib/validations/fixed-expense';

interface FixedExpenseFormFieldsProps {
  currency: string;
  onCurrencyChange: (currency: string) => void;
  frequency: string;
  onFrequencyChange: (frequency: string) => void;
  categories: Category[];
  defaultDescription?: string;
  defaultAmount?: number;
  defaultCategoryId?: string;
  defaultNextDueDate?: string;
}

export function FixedExpenseFormFields({
  currency,
  onCurrencyChange,
  frequency,
  onFrequencyChange,
  categories,
  defaultDescription,
  defaultAmount,
  defaultCategoryId,
  defaultNextDueDate,
}: FixedExpenseFormFieldsProps) {
  const currencySymbol = getCurrencySymbol(currency);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          name="description"
          placeholder="Ej. Alquiler, agua y luz, plan móvil…"
          maxLength={200}
          defaultValue={defaultDescription}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Cantidad</Label>
          <div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex h-10 items-center gap-1.5 rounded-xl border bg-transparent px-4 shadow-xs focus-within:ring-[3px]">
            <span className="text-muted-foreground shrink-0 text-sm">{currencySymbol}</span>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              placeholder="0.00"
              defaultValue={defaultAmount}
              required
              className="placeholder:text-muted-foreground h-full w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Moneda</Label>
          <Select name="currency" value={currency} onValueChange={onCurrencyChange}>
            <SelectTrigger id="currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryId">Categoría</Label>
        <Select name="categoryId" defaultValue={defaultCategoryId} required>
          <SelectTrigger id="categoryId" className="w-full">
            <SelectValue placeholder="Elige una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <span
                  className="mr-2 inline-block size-2 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="frequency">Frecuencia</Label>
          <Select name="frequency" value={frequency} onValueChange={onFrequencyChange}>
            <SelectTrigger id="frequency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIXED_EXPENSE_FREQUENCIES.map((freq) => (
                <SelectItem key={freq} value={freq}>
                  {FREQUENCY_LABELS[freq]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nextDueDate">Próximo vencimiento</Label>
          <Input
            id="nextDueDate"
            name="nextDueDate"
            type="date"
            defaultValue={defaultNextDueDate}
            required
          />
        </div>
      </div>

      {frequency !== 'monthly' && (
        <p className="text-muted-foreground bg-secondary/60 rounded-2xl p-3 text-xs">
          Por ahora, las Recomendaciones del dashboard solo descuentan de forma garantizada los
          gastos fijos <span className="text-foreground font-medium">mensuales</span>. Este gasto
          seguirá generando su recordatorio habitual, pero no se restará automáticamente del
          disponible de fin de semana.
        </p>
      )}
    </>
  );
}

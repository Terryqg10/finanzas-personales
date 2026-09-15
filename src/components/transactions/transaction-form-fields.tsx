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
import { getCurrencySymbol } from '@/lib/currency-symbol';
import { cn } from '@/lib/utils';

interface TransactionFormFieldsProps {
  type: 'income' | 'expense';
  onTypeChange: (type: 'income' | 'expense') => void;
  categories: Category[];
  baseCurrency: string;
  defaultDescription?: string;
  defaultAmount?: number;
  defaultDate?: string;
  defaultCategoryId?: string;
}

export function TransactionFormFields({
  type,
  onTypeChange,
  categories,
  baseCurrency,
  defaultDescription,
  defaultAmount,
  defaultDate,
  defaultCategoryId,
}: TransactionFormFieldsProps) {
  const currencySymbol = getCurrencySymbol(baseCurrency);

  return (
    <>
      <div className="space-y-2">
        <Label>Tipo</Label>
        <input type="hidden" name="type" value={type} />
        <div className="border-border bg-secondary inline-flex rounded-md border p-1">
          <button
            type="button"
            onClick={() => onTypeChange('expense')}
            className={cn(
              'rounded px-3 py-1.5 text-sm font-medium transition-colors',
              type === 'expense'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground',
            )}
          >
            Gasto
          </button>
          <button
            type="button"
            onClick={() => onTypeChange('income')}
            className={cn(
              'rounded px-3 py-1.5 text-sm font-medium transition-colors',
              type === 'income'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground',
            )}
          >
            Ingreso
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          name="description"
          maxLength={200}
          defaultValue={defaultDescription}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Cantidad</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
              {currencySymbol}
            </span>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              placeholder="0.00"
              className="pl-7"
              defaultValue={defaultAmount}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Fecha</Label>
          <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
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
    </>
  );
}

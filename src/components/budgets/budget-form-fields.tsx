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

interface BudgetFormFieldsProps {
  currency: string;
  categories?: Category[];
  defaultCategoryId?: string;
  defaultMonthlyLimit?: number;
  defaultAlertThreshold?: number;
}

export function BudgetFormFields({
  currency,
  categories,
  defaultCategoryId,
  defaultMonthlyLimit,
  defaultAlertThreshold = 80,
}: BudgetFormFieldsProps) {
  const currencySymbol = getCurrencySymbol(currency);

  return (
    <>
      {categories && (
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
          {categories.length === 0 && (
            <p className="text-muted-foreground text-xs">
              Ya tienes un presupuesto para todas tus categorías.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="monthlyLimit">Límite mensual</Label>
        <div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex h-10 items-center gap-1.5 rounded-xl border bg-transparent px-4 shadow-xs focus-within:ring-[3px]">
          <span className="text-muted-foreground shrink-0 text-sm">{currencySymbol}</span>
          <input
            id="monthlyLimit"
            name="monthlyLimit"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={defaultMonthlyLimit}
            required
            className="placeholder:text-muted-foreground h-full w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alertThreshold">Umbral de alerta (%)</Label>
        <Input
          id="alertThreshold"
          name="alertThreshold"
          type="number"
          step="1"
          min="1"
          max="100"
          defaultValue={defaultAlertThreshold}
          required
        />
        <p className="text-muted-foreground text-xs">
          Te avisamos en el dashboard al llegar a este porcentaje del límite. Al superar el 100%
          siempre se avisa, aunque el umbral sea más alto.
        </p>
      </div>
    </>
  );
}

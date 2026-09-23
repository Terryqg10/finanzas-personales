'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Category } from '@/lib/data/categories';
import { cn } from '@/lib/utils';

const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'expense', label: 'Gastos' },
] as const;

export function FilterBar({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(searchParams.get('from') ?? '');
  const [to, setTo] = useState(searchParams.get('to') ?? '');
  const [type, setType] = useState(searchParams.get('type') ?? '');
  const [min, setMin] = useState(searchParams.get('min') ?? '');
  const [max, setMax] = useState(searchParams.get('max') ?? '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('categories')?.split(',').filter(Boolean) ?? [],
  );

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function applyFilters() {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (type) params.set('type', type);
    if (min) params.set('min', min);
    if (max) params.set('max', max);
    if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','));
    router.push(`/movimientos?${params.toString()}`);
  }

  function clearFilters() {
    setFrom('');
    setTo('');
    setType('');
    setMin('');
    setMax('');
    setSelectedCategories([]);
    router.push('/movimientos');
  }

  return (
    <div className="bg-card space-y-4 rounded-2xl p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="min-w-0 space-y-1">
          <Label htmlFor="from">Desde</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="min-w-0 space-y-1">
          <Label htmlFor="to">Hasta</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="min-w-0 space-y-1">
          <Label htmlFor="min">Mín.</Label>
          <Input
            id="min"
            type="number"
            step="0.01"
            value={min}
            onChange={(e) => setMin(e.target.value)}
          />
        </div>
        <div className="min-w-0 space-y-1">
          <Label htmlFor="max">Máx.</Label>
          <Input
            id="max"
            type="number"
            step="0.01"
            value={max}
            onChange={(e) => setMax(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Tipo</Label>
        <div className="bg-secondary inline-flex rounded-full p-1">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value || 'all'}
              type="button"
              onClick={() => setType(option.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                type === option.value
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Categorías</Label>
        <div className="flex flex-wrap gap-x-2 gap-y-2.5">
          {categories.map((category) => {
            const isSelected = selectedCategories.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                  isSelected
                    ? 'border-transparent text-white'
                    : 'border-border text-muted-foreground hover:bg-secondary/60',
                )}
                style={isSelected ? { backgroundColor: category.color } : undefined}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={applyFilters}>
          Aplicar filtros
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
          Limpiar
        </Button>
      </div>
    </div>
  );
}

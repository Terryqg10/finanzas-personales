'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import { confirmImport, previewImport } from '@/app/(app)/movimientos/importar/actions';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Category } from '@/lib/data/categories';
import { formatShortDate } from '@/lib/format-date';
import { formatMoney } from '@/lib/format-money';
import { pickDefaultCategories } from '@/lib/import/default-categories';
import type { ParseError } from '@/lib/import/imagin-csv';
import { cn } from '@/lib/utils';
import { IMPORT_MAX_BYTES, type ImportPreviewRow } from '@/lib/validations/import';

interface PreviewState {
  /** Texto original del archivo: la confirmación lo reenvía al servidor. */
  text: string;
  rows: ImportPreviewRow[];
  errors: ParseError[];
}

type Outcome = { kind: 'success' | 'error'; message: string };

export function ImportFlow({ categories }: { categories: Category[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categoryByKey, setCategoryByKey] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const defaults = pickDefaultCategories(categories);

  function reset() {
    setPreview(null);
    setSelected(new Set());
    setCategoryByKey({});
    setOutcome(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFile(file: File) {
    setOutcome(null);

    if (file.size > IMPORT_MAX_BYTES) {
      setOutcome({ kind: 'error', message: 'El archivo es demasiado grande (máximo 1 MB).' });
      return;
    }

    setBusy(true);
    try {
      const text = await file.text();
      const result = await previewImport(text);

      if (result.status === 'error') {
        setPreview(null);
        setOutcome({ kind: 'error', message: result.message });
        return;
      }

      const initialCategories: Record<string, string> = {};
      const initialSelection = new Set<string>();
      for (const row of result.rows) {
        const categoryId = row.type === 'expense' ? defaults.expense : defaults.income;
        if (categoryId) initialCategories[row.key] = categoryId;
        // Las ya importadas y las posibles transferencias internas salen desmarcadas.
        if (row.status === 'new' && !row.isInternalTransfer) initialSelection.add(row.key);
      }

      setPreview({ text, rows: result.rows, errors: result.errors });
      setCategoryByKey(initialCategories);
      setSelected(initialSelection);
    } catch {
      setOutcome({
        kind: 'error',
        message: 'No se pudo leer el archivo. Revisa tu conexión e inténtalo de nuevo.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!preview) return;

    const selections = preview.rows
      .filter((row) => selected.has(row.key) && categoryByKey[row.key] !== undefined)
      .map((row) => ({ key: row.key, categoryId: categoryByKey[row.key] ?? '' }));

    setBusy(true);
    setOutcome(null);
    try {
      const result = await confirmImport(preview.text, selections);

      if (result.status === 'error') {
        setOutcome({ kind: 'error', message: result.message });
        return;
      }

      setPreview(null);
      setSelected(new Set());
      setOutcome({ kind: 'success', message: result.message });
    } catch {
      setOutcome({
        kind: 'error',
        message: 'No se pudo completar la importación. Revisa tu conexión e inténtalo de nuevo.',
      });
    } finally {
      setBusy(false);
    }
  }

  function toggleRow(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const newCount = preview?.rows.filter((row) => row.status === 'new').length ?? 0;
  const existingCount = preview ? preview.rows.length - newCount : 0;
  const internalCount =
    preview?.rows.filter((row) => row.status === 'new' && row.isInternalTransfer).length ?? 0;

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {outcome && (
        <p
          role={outcome.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'bg-card rounded-2xl p-6 text-sm shadow-sm',
            outcome.kind === 'error' ? 'text-rose-500' : 'text-emerald-600',
          )}
        >
          {outcome.message}
        </p>
      )}

      {!preview && (
        <div className="bg-card flex flex-col items-start gap-4 rounded-2xl p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Extracto de la cuenta de Imagin</h2>
            <p className="text-muted-foreground text-sm">
              En la app de Imagin, descarga los movimientos en formato Excel y súbelos aquí. Es el
              extracto de la cuenta (con la columna Saldo), no el de tarjetas. Podrás revisarlo
              antes de importar nada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={busy} onClick={() => fileInputRef.current?.click()}>
              {busy ? 'Leyendo…' : 'Elegir archivo'}
            </Button>
            {outcome?.kind === 'success' && (
              <Button asChild variant="secondary">
                <Link href="/movimientos">Ver movimientos</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {preview && (
        <>
          <div className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {newCount} nuevo{newCount === 1 ? '' : 's'}
                {existingCount > 0 &&
                  ` · ${existingCount} ya importado${existingCount === 1 ? '' : 's'}`}
              </p>
              {internalCount > 0 && (
                <p className="text-muted-foreground text-xs">
                  {internalCount} posible{internalCount === 1 ? '' : 's'} transferencia
                  {internalCount === 1 ? '' : 's'} interna{internalCount === 1 ? '' : 's'}{' '}
                  desmarcada{internalCount === 1 ? '' : 's'}: márcala si quieres importarla.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" disabled={busy} onClick={reset}>
                Cancelar
              </Button>
              <Button disabled={busy || selected.size === 0} onClick={() => void handleConfirm()}>
                {busy ? 'Importando…' : `Importar ${selected.size}`}
              </Button>
            </div>
          </div>

          {preview.errors.length > 0 && (
            <details className="bg-card rounded-2xl p-6 text-sm shadow-sm">
              <summary className="cursor-pointer font-medium text-rose-500">
                {preview.errors.length} línea{preview.errors.length === 1 ? '' : 's'} no se pudieron
                leer
              </summary>
              <ul className="text-muted-foreground mt-3 space-y-1 text-xs">
                {preview.errors.map((error) => (
                  <li key={`${error.line}-${error.message}`}>
                    Línea {error.line}: {error.message}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <ul className="space-y-2">
            {preview.rows.map((row) => {
              const isExisting = row.status === 'existing';
              const signed = row.type === 'expense' ? -row.amount : row.amount;

              return (
                <li
                  key={row.key}
                  className={cn(
                    'bg-card flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 shadow-sm',
                    isExisting && 'opacity-50',
                  )}
                >
                  <input
                    type="checkbox"
                    aria-label={`Importar ${row.description}`}
                    className="accent-primary size-4 shrink-0"
                    checked={selected.has(row.key)}
                    disabled={isExisting || busy}
                    onChange={() => toggleRow(row.key)}
                  />

                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-sm font-medium">{row.description}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatShortDate(row.date)}
                      {isExisting && ' · ya importado'}
                      {!isExisting && row.isInternalTransfer && ' · posible transferencia interna'}
                    </p>
                  </div>

                  <Select
                    value={categoryByKey[row.key]}
                    disabled={isExisting || busy}
                    onValueChange={(value) =>
                      setCategoryByKey((current) => ({ ...current, [row.key]: value }))
                    }
                  >
                    <SelectTrigger size="sm" className="w-40" aria-label="Categoría">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <p
                    className={cn(
                      'w-28 shrink-0 text-right text-sm font-medium',
                      row.type === 'income' ? 'text-emerald-600' : 'text-rose-500',
                    )}
                  >
                    {row.type === 'income' ? '+' : ''}
                    {formatMoney(signed, row.currency)}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

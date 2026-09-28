'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Error boundary para todo el grupo de rutas protegidas (Dashboard,
 * Movimientos, Categorías, Presupuestos, Gastos Fijos, Recordatorios,
 * Configuración). El layout de `app/(app)/layout.tsx` (nav, topbar) sigue
 * renderizado alrededor de este boundary; solo se reemplaza el contenido de
 * la página que falló.
 *
 * Existe específicamente para el caso encontrado en el smoke test QA del
 * 2026-09-29 (ver qa/checklist-control-calidad.md, Sección 4): cuando el
 * `fetch` interno de una Server Action (disparada vía `useActionState`,
 * p. ej. pausar un gasto fijo) falla a nivel de red ANTES de llegar al
 * servidor, la excepción no pasa por ningún `try/catch` de la propia action
 * y, sin este boundary, el navegador reemplazaba toda la app por su pantalla
 * nativa de error. Ver specs/manejo-errores-red-server-actions.md.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="bg-card flex max-w-sm flex-col items-center gap-4 rounded-2xl p-8 text-center shadow-sm">
        <h2 className="text-foreground text-xl font-bold tracking-tight">Algo salió mal</h2>
        <p className="text-muted-foreground text-sm">
          No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.
        </p>
        <div className="mt-2 flex flex-col items-center gap-3">
          <Button onClick={() => reset()}>Reintentar</Button>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

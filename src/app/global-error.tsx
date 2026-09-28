'use client';

import { useEffect } from 'react';

import './globals.css';

/**
 * Red de seguridad para errores que ocurran en el propio `app/layout.tsx`
 * raíz (fuera del alcance de `app/error.tsx` y `app/(app)/error.tsx`, que ya
 * cubren el resto de la app — ver specs/manejo-errores-red-server-actions.md).
 *
 * Next.js exige que este archivo defina su propio `<html>`/`<body>`, ya que
 * reemplaza el layout raíz por completo cuando se activa. Por eso no puede
 * asumir `ThemeProvider` ni ningún otro contexto de la app: se mantiene
 * deliberadamente simple, con clases de `globals.css` (importado de nuevo
 * aquí) para caer en los tokens de modo claro por defecto.
 */
export default function GlobalError({
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
    <html lang="es">
      <body className="bg-background text-foreground flex min-h-screen items-center justify-center p-4 antialiased">
        <div className="bg-card flex max-w-sm flex-col items-center gap-4 rounded-2xl p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold tracking-tight">Algo salió mal</h1>
          <p className="text-muted-foreground text-sm">
            No pudimos cargar la aplicación. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="bg-primary text-primary-foreground inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}

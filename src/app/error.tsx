'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Error boundary para las rutas fuera del grupo `(app)` (login).
 * Mismo objetivo que `app/(app)/error.tsx` — ver ese archivo y
 * specs/manejo-errores-red-server-actions.md para el contexto completo del
 * bug que motivó ambos.
 */
export default function RootSegmentError({
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
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Algo salió mal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground text-sm">
            No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <Button onClick={() => reset()}>Reintentar</Button>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
          >
            Volver al inicio
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

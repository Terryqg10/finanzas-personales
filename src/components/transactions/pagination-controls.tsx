'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';

export function PaginationControls({ page, hasMore }: { page: number; hasMore: boolean }) {
  const searchParams = useSearchParams();

  function buildHref(newPage: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    return `/movimientos?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between">
      {page > 0 ? (
        <Button asChild variant="outline" size="sm">
          <Link href={buildHref(page - 1)}>Anterior</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Anterior
        </Button>
      )}

      <span className="text-muted-foreground text-sm">Página {page + 1}</span>

      {hasMore ? (
        <Button asChild variant="outline" size="sm">
          <Link href={buildHref(page + 1)}>Siguiente</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Siguiente
        </Button>
      )}
    </div>
  );
}

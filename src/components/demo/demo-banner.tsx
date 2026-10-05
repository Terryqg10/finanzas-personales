import { Button } from '@/components/ui/button';
import { logout } from '@/lib/actions/auth';

export function DemoBanner() {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-amber-50 px-6 py-2 text-sm text-amber-900"
    >
      <p>
        <span className="font-semibold">Modo demo</span> · Estás viendo datos de ejemplo. Se borran
        automáticamente en 7 días.
      </p>
      <form action={logout}>
        <Button type="submit" variant="ghost" size="sm" className="text-amber-900">
          Salir de la demo
        </Button>
      </form>
    </div>
  );
}

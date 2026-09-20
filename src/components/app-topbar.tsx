import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { logout } from '@/lib/actions/auth';

export function AppTopbar() {
  return (
    <header className="border-border bg-background sticky top-0 z-30 flex items-center justify-between border-b px-6 py-4 md:hidden">
      <p className="text-foreground text-sm font-bold tracking-tight">Finanzas Personales</p>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <form action={logout}>
          <Button type="submit" variant="ghost" size="icon" aria-label="Cerrar sesión">
            <LogOut size={18} />
          </Button>
        </form>
      </div>
    </header>
  );
}

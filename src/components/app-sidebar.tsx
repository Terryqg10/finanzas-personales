'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { logout } from '@/lib/actions/auth';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/lib/nav-items';

export function AppSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="border-border bg-card hidden w-60 shrink-0 flex-col border-r md:flex">
      <div className="border-border border-b px-4 py-4">
        <p className="text-sm font-semibold tracking-tight">Finanzas Personales</p>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-border space-y-3 border-t p-3">
        <ThemeToggle />
        <p className="text-muted-foreground truncate text-xs">{userEmail}</p>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </aside>
  );
}

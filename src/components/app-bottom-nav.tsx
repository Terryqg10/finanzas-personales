'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV_ITEMS } from '@/lib/nav-items';
import { cn } from '@/lib/utils';

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="border-border bg-card fixed inset-x-6 bottom-5 z-40 flex items-center justify-around rounded-full border px-2 py-2 shadow-lg md:hidden">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              'flex size-11 items-center justify-center rounded-full transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary',
            )}
          >
            <Icon size={20} />
          </Link>
        );
      })}
    </nav>
  );
}

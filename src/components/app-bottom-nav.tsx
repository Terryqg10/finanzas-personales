'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV_ITEMS } from '@/lib/nav-items';
import { cn } from '@/lib/utils';

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="border-border bg-card fixed inset-x-0 bottom-0 z-40 flex border-t md:hidden">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

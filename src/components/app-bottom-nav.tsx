'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, type MouseEvent } from 'react';

import { NAV_ITEMS } from '@/lib/nav-items';
import { getScrollBehavior, isDoubleTap } from '@/lib/scroll';
import { cn } from '@/lib/utils';

export function AppBottomNav() {
  const pathname = usePathname();
  const lastTapRef = useRef<number | null>(null);

  // Doble toque en cualquier icono: se sube al principio de la página. El primer
  // toque navega como siempre; el segundo cancela la navegación y hace el scroll.
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const now = Date.now();

    if (!isDoubleTap(lastTapRef.current, now)) {
      lastTapRef.current = now;
      return;
    }

    // Se reinicia la marca: un tercer toque seguido no cuenta como otro doble toque.
    lastTapRef.current = null;
    event.preventDefault();

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: getScrollBehavior(prefersReducedMotion) });
  }

  return (
    <nav className="bg-card fixed inset-x-6 bottom-5 z-40 flex items-center justify-around rounded-full px-2 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] md:hidden">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            onClick={handleClick}
            className={cn(
              'flex size-11 touch-manipulation items-center justify-center rounded-full transition-colors',
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

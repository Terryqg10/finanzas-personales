import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopbar } from '@/components/app-topbar';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar userEmail={user.email ?? ''} />
      <div className="flex flex-1 flex-col pb-24 md:pb-0">
        <AppTopbar />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
      <AppBottomNav />
    </div>
  );
}

import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { logout } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Finanzas Personales</h1>
      <p className="text-muted-foreground text-sm">Sesión iniciada como {user.email}</p>
      <form action={logout}>
        <Button type="submit" variant="outline">
          Cerrar sesión
        </Button>
      </form>
    </main>
  );
}

'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export async function logout(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error al cerrar sesión:', error.message);
  }

  redirect('/login');
}

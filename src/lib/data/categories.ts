import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

export type Category = Database['public']['Tables']['categories']['Row'];

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('user_id', { ascending: true, nullsFirst: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
  }

  return data;
}

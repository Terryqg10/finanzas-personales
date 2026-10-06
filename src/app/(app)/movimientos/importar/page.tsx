import Link from 'next/link';

import { ImportFlow } from '@/components/import/import-flow';
import { getCategories } from '@/lib/data/categories';
import { createClient } from '@/lib/supabase/server';

export default async function ImportarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDemo = user?.is_anonymous === true;
  const categories = isDemo ? [] : await getCategories();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/movimientos"
          className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
        >
          Volver a movimientos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Importar extracto</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Añade de golpe los movimientos de tu banco sin teclearlos.
        </p>
      </div>

      {isDemo ? (
        <p className="bg-card text-muted-foreground rounded-2xl p-6 text-sm shadow-sm">
          La importación no está disponible en el modo demo.
        </p>
      ) : (
        <ImportFlow categories={categories} />
      )}
    </div>
  );
}

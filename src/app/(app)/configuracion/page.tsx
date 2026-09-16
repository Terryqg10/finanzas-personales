import Link from 'next/link';

import { BaseCurrencyForm } from '@/components/settings/base-currency-form';
import { getUserSettings } from '@/lib/data/user-settings';

export default async function ConfiguracionPage() {
  const settings = await getUserSettings();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground mt-2 text-sm">Moneda base y preferencias.</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-muted-foreground text-sm font-medium">Moneda base</h2>
        <p className="text-muted-foreground text-sm">
          Se usa para consolidar tu saldo y como moneda por defecto al registrar movimientos. Los
          movimientos ya registrados no cambian.
        </p>
        <BaseCurrencyForm currentCurrency={settings.base_currency} />
      </section>

      <Link
        href="/configuracion/categorias"
        className="border-border hover:bg-secondary/60 flex items-center justify-between rounded-md border px-4 py-3 text-sm font-medium"
      >
        Categorías
        <span className="text-muted-foreground">→</span>
      </Link>
    </div>
  );
}

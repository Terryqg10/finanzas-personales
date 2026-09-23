import Link from 'next/link';

import { BaseCurrencyForm } from '@/components/settings/base-currency-form';
import { SavingsRateForm } from '@/components/settings/savings-rate-form';
import { getUserSettings } from '@/lib/data/user-settings';

export default async function ConfiguracionPage() {
  const settings = await getUserSettings();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground mt-2 text-sm">Moneda base y preferencias.</p>
      </div>

      <section className="bg-card space-y-4 rounded-2xl p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-foreground text-sm font-semibold">Moneda base</h2>
          <p className="text-muted-foreground text-sm">
            Se usa para consolidar tu saldo y como moneda por defecto al registrar movimientos. Los
            movimientos ya registrados no cambian.
          </p>
        </div>
        <BaseCurrencyForm currentCurrency={settings.base_currency} />
      </section>

      <section className="bg-card space-y-4 rounded-2xl p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-foreground text-sm font-semibold">Objetivo de ahorro</h2>
          <p className="text-muted-foreground text-sm">
            Porcentaje de tus ingresos que quieres reservar cada mes. Es una guía orientativa, no
            asesoría financiera profesional, y la usamos para calcular cuánto puedes gastar en ocio
            en las Recomendaciones del dashboard.
          </p>
        </div>
        <SavingsRateForm currentRate={settings.savings_rate_target} />
      </section>

      <Link
        href="/configuracion/categorias"
        className="bg-card flex items-center justify-between gap-4 rounded-2xl px-6 py-4 text-sm font-medium shadow-sm transition-shadow hover:shadow-md"
      >
        Categorías
        <span className="text-muted-foreground">→</span>
      </Link>
    </div>
  );
}

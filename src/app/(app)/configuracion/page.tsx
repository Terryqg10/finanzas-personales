import Link from 'next/link';

export default function ConfiguracionPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Moneda base y preferencias llegan en fases posteriores.
      </p>

      <Link
        href="/configuracion/categorias"
        className="border-border hover:bg-secondary/60 mt-6 flex items-center justify-between rounded-md border px-4 py-3 text-sm font-medium"
      >
        Categorías
        <span className="text-muted-foreground">→</span>
      </Link>
    </div>
  );
}

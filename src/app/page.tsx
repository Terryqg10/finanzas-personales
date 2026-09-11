import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Finanzas Personales</h1>
      <p className="text-muted-foreground text-sm">Fase 0 completada — base del proyecto lista.</p>
      <div className="flex gap-2">
        <Button>Botón primario</Button>
        <Button variant="outline">Botón secundario</Button>
      </div>
    </main>
  );
}

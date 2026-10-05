'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { login, startDemo } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { initialAuthState } from '@/lib/validations/auth';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Entrando…' : 'Iniciar sesión'}
    </Button>
  );
}

function DemoButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
      {pending ? 'Preparando la demo…' : 'Probar la demo'}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, initialAuthState);
  const [demoState, demoAction] = useActionState(startDemo, initialAuthState);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>Accede a tus finanzas personales.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {state.status === 'error' && (
              <p role="alert" className="text-destructive text-sm">
                {state.message}
              </p>
            )}
            <SubmitButton />
          </form>
          <div className="text-muted-foreground my-6 flex items-center gap-3 text-xs">
            <span className="bg-muted h-px flex-1" />
            o
            <span className="bg-muted h-px flex-1" />
          </div>
          <form action={demoAction} className="space-y-2">
            <DemoButton />
            <p className="text-muted-foreground text-center text-xs">
              Sin registro · datos de ejemplo
            </p>
            {demoState.status === 'error' && (
              <p role="alert" className="text-destructive text-center text-sm">
                {demoState.message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

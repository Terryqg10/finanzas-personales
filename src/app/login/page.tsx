'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { login } from './actions';
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

export default function LoginPage() {
  const [state, formAction] = useActionState(login, initialAuthState);

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
          <p className="text-muted-foreground mt-4 text-center text-sm">
            ¿No tienes cuenta?{' '}
            <Link href="/signup" className="text-foreground underline underline-offset-4">
              Regístrate
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

'use client';

import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { signup } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPasswordStrength } from '@/lib/password-strength';
import { MULTI_USER_SIGNUP_ENABLED } from '@/lib/feature-flags';
import { initialAuthState } from '@/lib/validations/auth';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Creando cuenta…' : 'Crear cuenta'}
    </Button>
  );
}

const STRENGTH_CONFIG = {
  weak: { label: 'Débil', color: 'bg-destructive', width: 'w-1/3' },
  medium: { label: 'Media', color: 'bg-amber-500', width: 'w-2/3' },
  strong: { label: 'Fuerte', color: 'bg-emerald-500', width: 'w-full' },
} as const;

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const config = STRENGTH_CONFIG[strength];

  return (
    <div className="space-y-1 pt-1">
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div className={`h-full ${config.color} ${config.width} transition-all`} />
      </div>
      <p className="text-muted-foreground text-xs">Seguridad: {config.label}</p>
    </div>
  );
}

export default function SignupPage() {
  const [state, formAction] = useActionState(signup, initialAuthState);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!MULTI_USER_SIGNUP_ENABLED) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Registro cerrado</CardTitle>
            <CardDescription>
              Esta aplicación es de uso personal y no acepta registros nuevos por ahora.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center text-sm">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-foreground underline underline-offset-4">
                Inicia sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>Configura tu acceso a finanzas personales.</CardDescription>
        </CardHeader>
        <CardContent>
          {state.status === 'success' ? (
            <p role="status" className="text-sm text-emerald-600">
              {state.message}
            </p>
          ) : (
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
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
          )}
          <p className="text-muted-foreground mt-4 text-center text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-foreground underline underline-offset-4">
              Inicia sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

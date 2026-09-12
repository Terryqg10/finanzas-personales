import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Introduce un email válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

export const signupSchema = z
  .object({
    email: z.string().email('Introduce un email válido.'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

export interface AuthActionState {
  status: 'idle' | 'error' | 'success';
  message: string | null;
}

export const initialAuthState: AuthActionState = { status: 'idle', message: null };

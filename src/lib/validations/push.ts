import { z } from 'zod';

/** Suscripción tal y como la entrega `PushSubscription.toJSON()` en el navegador. */
export const subscribePushSchema = z.object({
  endpoint: z
    .string()
    .url('Suscripción inválida.')
    .max(2048, 'Suscripción inválida.')
    .refine((value) => value.startsWith('https://'), 'Suscripción inválida.'),
  keys: z.object({
    p256dh: z.string().min(1, 'Suscripción inválida.').max(512, 'Suscripción inválida.'),
    auth: z.string().min(1, 'Suscripción inválida.').max(512, 'Suscripción inválida.'),
  }),
});

export const unsubscribePushSchema = z.object({
  endpoint: z.string().url('Suscripción inválida.').max(2048, 'Suscripción inválida.'),
});

export type SubscribePushInput = z.infer<typeof subscribePushSchema>;

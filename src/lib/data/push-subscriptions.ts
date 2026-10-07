import type { SupabaseClient } from '@supabase/supabase-js';

import type { PushTarget } from '@/lib/push/send-push';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;

/** Suscripciones push del usuario autenticado (RLS filtra por propietario). */
export async function getUserPushSubscriptions(supabase: Client): Promise<PushTarget[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth');

  if (error) {
    throw new Error('No se pudieron leer tus suscripciones push.');
  }

  return data;
}

/**
 * Guarda (o actualiza) la suscripción de este dispositivo para el usuario.
 *
 * El `endpoint` identifica al navegador, no a la cuenta: si otra cuenta se
 * suscribe desde el mismo navegador, la suscripción anterior debe desaparecer
 * o el segundo usuario recibiría los avisos del primero. Esa fila pertenece a
 * otro usuario y RLS no deja tocarla con el cliente del propio usuario, por
 * eso el borrado va con el cliente admin y solo para ese caso concreto.
 */
export async function savePushSubscription(
  supabase: Client,
  admin: Client,
  params: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string | null;
  },
): Promise<boolean> {
  const { error: cleanupError } = await admin
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', params.endpoint)
    .neq('user_id', params.userId);

  if (cleanupError) return false;

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: params.userId,
      endpoint: params.endpoint,
      p256dh: params.p256dh,
      auth: params.auth,
      user_agent: params.userAgent,
    },
    { onConflict: 'endpoint' },
  );

  return !error;
}

/** Borra la suscripción de un dispositivo del usuario autenticado (RLS). */
export async function deletePushSubscription(supabase: Client, endpoint: string): Promise<boolean> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return !error;
}

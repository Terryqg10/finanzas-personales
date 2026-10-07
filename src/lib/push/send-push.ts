/**
 * Envío de una notificación push con la librería `web-push`.
 * Spec: specs/alertas-presupuesto-push.md, secciones 3 y 4.4.
 *
 * Nunca lanza: devuelve un resultado tipado. `expired` indica una suscripción
 * que el servicio de push ya no reconoce (404 o 410) y que conviene borrar.
 */

import webpush from 'web-push';

/** Contacto que el servicio de push puede usar si hay un problema con las claves. */
const VAPID_SUBJECT = 'mailto:contacto@terryq.com';
const TTL_SECONDS = 60 * 60 * 12;

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type SendPushResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'missing_keys' | 'expired' | 'rejected' | 'network';
      message: string;
    };

type SendNotification = (
  subscription: webpush.PushSubscription,
  payload: string,
  options: webpush.RequestOptions,
) => Promise<unknown>;

interface SendPushDeps {
  /** Por defecto, `process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`. */
  publicKey?: string | undefined;
  /** Por defecto, `process.env.WEB_PUSH_PRIVATE_KEY`. */
  privateKey?: string | undefined;
  send?: SendNotification;
}

function getStatusCode(err: unknown): number | null {
  if (typeof err === 'object' && err !== null && 'statusCode' in err) {
    const { statusCode } = err as { statusCode: unknown };
    return typeof statusCode === 'number' ? statusCode : null;
  }
  return null;
}

export async function sendPush(
  target: PushTarget,
  payload: unknown,
  deps: SendPushDeps = {},
): Promise<SendPushResult> {
  const publicKey =
    'publicKey' in deps ? deps.publicKey : process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  const privateKey = 'privateKey' in deps ? deps.privateKey : process.env.WEB_PUSH_PRIVATE_KEY;
  const send = deps.send ?? webpush.sendNotification.bind(webpush);

  if (!publicKey || !privateKey) {
    return {
      ok: false,
      reason: 'missing_keys',
      message: 'Faltan las claves VAPID (NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY / WEB_PUSH_PRIVATE_KEY).',
    };
  }

  try {
    await send(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      {
        TTL: TTL_SECONDS,
        urgency: 'normal',
        vapidDetails: { subject: VAPID_SUBJECT, publicKey, privateKey },
      },
    );
    return { ok: true };
  } catch (err) {
    const statusCode = getStatusCode(err);
    const message = err instanceof Error ? err.message : 'No se pudo enviar la notificación.';

    if (statusCode === 404 || statusCode === 410) {
      return { ok: false, reason: 'expired', message };
    }
    if (statusCode !== null) {
      return { ok: false, reason: 'rejected', message: `${statusCode}: ${message}` };
    }
    return { ok: false, reason: 'network', message };
  }
}

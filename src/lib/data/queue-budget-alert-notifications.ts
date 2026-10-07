import type { SupabaseClient } from '@supabase/supabase-js';
import { after } from 'next/server';

import type { BudgetAlert } from '@/lib/budget-alerts';
import { claimBudgetAlert } from '@/lib/data/budget-alert-notifications';
import { deletePushSubscription, getUserPushSubscriptions } from '@/lib/data/push-subscriptions';
import { buildBudgetAlertEmail } from '@/lib/email/budget-alert-email';
import { canSendBudgetAlertEmail } from '@/lib/email/budget-alert-eligibility';
import { APP_URL } from '@/lib/email/config';
import { sendEmail } from '@/lib/email/send-email';
import { buildBudgetAlertPush } from '@/lib/push/budget-alert-push';
import { canSendBudgetAlertPush } from '@/lib/push/eligibility';
import { sendPush } from '@/lib/push/send-push';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;

interface QueueParams {
  supabase: Client;
  alert: BudgetAlert;
  /** Moneda base del usuario, para formatear importes en el email. */
  currency: string;
  notifyEmail: boolean;
  notifyPush: boolean;
}

interface Recipient {
  id: string;
  email: string | undefined;
  isAnonymous: boolean;
}

/**
 * Encola los avisos de presupuesto por email y por push tras un gasto que
 * cruza un nivel. Specs: alertas-presupuesto-email.md y alertas-presupuesto-push.md.
 *
 * Por canal, la reserva `(usuario, presupuesto, mes, nivel, canal)` se hace
 * aquí, antes de responder, porque decide quién envía; solo las llamadas de
 * red van en `after()`, para que el usuario no espere a Resend ni al servicio
 * de push. Es secundario: nunca lanza ni afecta al gasto, y un canal que falle
 * no impide al otro.
 */
export async function queueBudgetAlertNotifications(params: QueueParams): Promise<void> {
  let recipient: Recipient | null = null;

  try {
    const {
      data: { user },
    } = await params.supabase.auth.getUser();

    if (user) {
      recipient = { id: user.id, email: user.email, isAnonymous: user.is_anonymous === true };
    }
  } catch (err) {
    console.error(
      '[budget-alert] No se pudo leer el usuario.',
      err instanceof Error ? err.message : err,
    );
  }

  if (!recipient) return;

  await queueEmail(params, recipient);
  await queuePush(params, recipient);
}

async function queueEmail(params: QueueParams, recipient: Recipient): Promise<void> {
  try {
    const to = recipient.email;
    if (
      !to ||
      !canSendBudgetAlertEmail({
        email: to,
        isAnonymous: recipient.isAnonymous,
        notifyEmail: params.notifyEmail,
      })
    ) {
      return;
    }

    const claim = await claimBudgetAlert(params.supabase, {
      userId: recipient.id,
      budgetId: params.alert.budgetId,
      level: params.alert.level,
      channel: 'email',
    });

    if (claim === 'already_sent') return;
    if (claim === 'error') {
      console.error('[budget-alert-email] No se pudo reservar el aviso.');
      return;
    }

    const email = buildBudgetAlertEmail(params.alert, params.currency, APP_URL);

    after(async () => {
      const result = await sendEmail({ to, ...email });
      if (!result.ok) {
        console.error(`[budget-alert-email] ${result.reason}: ${result.message}`);
      }
    });
  } catch (err) {
    console.error('[budget-alert-email]', err instanceof Error ? err.message : err);
  }
}

async function queuePush(params: QueueParams, recipient: Recipient): Promise<void> {
  try {
    // Sin suscripciones no se reserva nada: si el usuario activa las push más tarde, aún puede recibir el aviso.
    const subscriptions = recipient.isAnonymous
      ? []
      : await getUserPushSubscriptions(params.supabase);

    if (
      !canSendBudgetAlertPush({
        isAnonymous: recipient.isAnonymous,
        notifyPush: params.notifyPush,
        subscriptionCount: subscriptions.length,
      })
    ) {
      return;
    }

    const claim = await claimBudgetAlert(params.supabase, {
      userId: recipient.id,
      budgetId: params.alert.budgetId,
      level: params.alert.level,
      channel: 'push',
    });

    if (claim === 'already_sent') return;
    if (claim === 'error') {
      console.error('[budget-alert-push] No se pudo reservar el aviso.');
      return;
    }

    const payload = buildBudgetAlertPush(params.alert);

    after(async () => {
      for (const subscription of subscriptions) {
        const result = await sendPush(subscription, payload);

        if (result.ok) continue;

        if (result.reason === 'expired') {
          // El dispositivo ya no existe o revocó el permiso: se borra la suscripción.
          await deletePushSubscription(params.supabase, subscription.endpoint);
        } else {
          console.error(`[budget-alert-push] ${result.reason}: ${result.message}`);
        }
      }
    });
  } catch (err) {
    console.error('[budget-alert-push]', err instanceof Error ? err.message : err);
  }
}

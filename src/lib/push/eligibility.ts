/**
 * Quién puede recibir el aviso por push. Función pura.
 * Spec: specs/alertas-presupuesto-push.md, sección 3.
 */

export interface PushRecipient {
  isAnonymous: boolean;
  /** `user_settings.notify_push`: interruptor global de la cuenta. */
  notifyPush: boolean;
  /** Dispositivos suscritos (el consentimiento real es la suscripción). */
  subscriptionCount: number;
}

/**
 * No se envía a usuarios anónimos de la demo, a quien desactivó las push en su
 * cuenta ni a quien no tiene ningún dispositivo suscrito.
 */
export function canSendBudgetAlertPush(recipient: PushRecipient): boolean {
  return !recipient.isAnonymous && recipient.notifyPush && recipient.subscriptionCount > 0;
}

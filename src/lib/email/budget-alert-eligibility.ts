/**
 * Quién puede recibir el aviso por email. Función pura.
 * Spec: specs/alertas-presupuesto-email.md, sección 3.
 */

export interface EmailRecipient {
  email: string | undefined;
  isAnonymous: boolean;
  /** `user_settings.notify_email`. */
  notifyEmail: boolean;
}

/**
 * No se envía a quien desactivó los emails, a los usuarios anónimos de la
 * demo ni a cuentas sin dirección de correo.
 */
export function canSendBudgetAlertEmail(recipient: EmailRecipient): boolean {
  return recipient.notifyEmail && !recipient.isAnonymous && Boolean(recipient.email);
}

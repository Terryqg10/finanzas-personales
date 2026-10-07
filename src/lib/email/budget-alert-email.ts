/**
 * Contenido del email de aviso de presupuesto. Función pura, sin I/O.
 * Spec: specs/alertas-presupuesto-email.md, sección 4.4.
 *
 * El HTML lleva estilos en línea: los clientes de correo no entienden
 * Tailwind ni el modo oscuro de la app.
 */

import type { BudgetAlert } from '@/lib/budget-alerts';
import { formatMoney } from '@/lib/format-money';

export interface BudgetAlertEmail {
  subject: string;
  text: string;
  html: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** El asunto es texto plano de una sola línea: se quitan saltos de línea del nombre. */
function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function buildBudgetAlertEmail(
  alert: BudgetAlert,
  currency: string,
  appUrl: string,
): BudgetAlertEmail {
  const isLimit = alert.level === 'limit';
  const category = singleLine(alert.categoryName);
  const link = `${appUrl}/presupuestos`;

  const subject = isLimit
    ? `Superaste el límite de ${category}`
    : `Vas por el ${alert.percentage}% de tu límite de ${category}`;

  const headline = isLimit
    ? `Has superado el límite mensual de ${category}.`
    : `Vas por el ${alert.percentage}% de tu límite de ${category} (umbral: ${alert.threshold}%).`;

  const amounts = `${formatMoney(alert.spent, currency)} de ${formatMoney(alert.monthlyLimit, currency)}`;
  const footer =
    'Recibes este aviso porque tienes activados los emails de presupuesto. Puedes desactivarlos en Configuración.';

  const text = [
    'Hola,',
    '',
    headline,
    '',
    `${category}: ${amounts} este mes (${alert.percentage}%).`,
    '',
    `Revisa tus presupuestos: ${link}`,
    '',
    footer,
  ].join('\n');

  const accent = isLimit ? '#e11d48' : '#b45309';

  const html = [
    '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a;">',
    `<p style="font-size:16px;font-weight:600;color:${accent};margin:0 0 12px;">${escapeHtml(headline)}</p>`,
    `<p style="font-size:14px;margin:0 0 20px;color:#334155;">${escapeHtml(category)}: <strong>${escapeHtml(amounts)}</strong> este mes (${alert.percentage}%).</p>`,
    `<p style="margin:0 0 24px;"><a href="${escapeHtml(link)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 20px;border-radius:999px;">Ver presupuestos</a></p>`,
    `<p style="font-size:12px;color:#64748b;margin:0;">${escapeHtml(footer)}</p>`,
    '</div>',
  ].join('');

  return { subject, text, html };
}

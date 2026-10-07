/**
 * Cliente mínimo de la API de Resend con `fetch` (sin dependencias).
 * Spec: specs/alertas-presupuesto-email.md, sección 4.3.
 *
 * Nunca lanza: devuelve un resultado tipado para que quien lo llame decida
 * qué hacer (el aviso por email es secundario y no debe romper la acción).
 */

import { EMAIL_FROM } from './config';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type SendEmailResult =
  { ok: true } | { ok: false; reason: 'missing_api_key' | 'rejected' | 'network'; message: string };

interface SendEmailDeps {
  /** Por defecto, `process.env.RESEND_API_KEY`. */
  apiKey?: string | undefined;
  fetchFn?: typeof fetch;
}

export async function sendEmail(
  input: SendEmailInput,
  deps: SendEmailDeps = {},
): Promise<SendEmailResult> {
  const apiKey = 'apiKey' in deps ? deps.apiKey : process.env.RESEND_API_KEY;
  const fetchFn = deps.fetchFn ?? fetch;

  if (!apiKey) {
    return {
      ok: false,
      reason: 'missing_api_key',
      message: 'Falta la variable de entorno RESEND_API_KEY.',
    };
  }

  try {
    const response = await fetchFn(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return {
        ok: false,
        reason: 'rejected',
        message: `Resend respondió ${response.status}. ${detail.slice(0, 300)}`.trim(),
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'No se pudo contactar con Resend.',
    };
  }
}

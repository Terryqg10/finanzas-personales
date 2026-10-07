import { describe, expect, it, vi } from 'vitest';

import { EMAIL_FROM } from './config';
import { sendEmail } from './send-email';

const input = {
  to: 'persona@example.com',
  subject: 'Asunto',
  text: 'Texto',
  html: '<p>Texto</p>',
};

describe('sendEmail', () => {
  it('envía el email a Resend con la clave, el remitente y el destinatario', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    const result = await sendEmail(input, { apiKey: 're_test', fetchFn });

    expect(result).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test');
    expect(JSON.parse(init.body as string)).toEqual({
      from: EMAIL_FROM,
      to: ['persona@example.com'],
      subject: 'Asunto',
      text: 'Texto',
      html: '<p>Texto</p>',
    });
  });

  it('no llama a la red si falta la clave', async () => {
    const fetchFn = vi.fn();

    const result = await sendEmail(input, { apiKey: undefined, fetchFn });

    expect(result).toMatchObject({ ok: false, reason: 'missing_api_key' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('informa del rechazo de Resend con su código de estado', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('domain not verified', { status: 403 }));

    const result = await sendEmail(input, { apiKey: 're_test', fetchFn });

    expect(result).toMatchObject({ ok: false, reason: 'rejected' });
    expect(result.ok === false && result.message).toContain('403');
  });

  it('captura los fallos de red sin lanzar', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('sin conexión'));

    const result = await sendEmail(input, { apiKey: 're_test', fetchFn });

    expect(result).toEqual({ ok: false, reason: 'network', message: 'sin conexión' });
  });
});

import { describe, expect, it, vi } from 'vitest';

import { sendPush } from './send-push';

const target = { endpoint: 'https://push.example.com/abc', p256dh: 'key-p256dh', auth: 'key-auth' };
const keys = { publicKey: 'public-key', privateKey: 'private-key' };

class FakePushError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

describe('sendPush', () => {
  it('envía el payload en JSON con la suscripción y las claves VAPID', async () => {
    const send = vi.fn().mockResolvedValue({ statusCode: 201 });

    const result = await sendPush(target, { title: 'Hola' }, { ...keys, send });

    expect(result).toEqual({ ok: true });
    expect(send).toHaveBeenCalledTimes(1);

    const [subscription, payload, options] = send.mock.calls[0] as [
      { endpoint: string; keys: { p256dh: string; auth: string } },
      string,
      { TTL: number; vapidDetails: { subject: string; publicKey: string; privateKey: string } },
    ];
    expect(subscription).toEqual({
      endpoint: 'https://push.example.com/abc',
      keys: { p256dh: 'key-p256dh', auth: 'key-auth' },
    });
    expect(JSON.parse(payload)).toEqual({ title: 'Hola' });
    expect(options.TTL).toBeGreaterThan(0);
    expect(options.vapidDetails).toEqual({
      subject: 'mailto:contacto@terryq.com',
      publicKey: 'public-key',
      privateKey: 'private-key',
    });
  });

  it('no llama a la red si faltan las claves VAPID', async () => {
    const send = vi.fn();

    const missingPrivate = await sendPush(
      target,
      {},
      { publicKey: 'public-key', privateKey: undefined, send },
    );
    const missingPublic = await sendPush(
      target,
      {},
      { publicKey: undefined, privateKey: 'private-key', send },
    );

    expect(missingPrivate).toMatchObject({ ok: false, reason: 'missing_keys' });
    expect(missingPublic).toMatchObject({ ok: false, reason: 'missing_keys' });
    expect(send).not.toHaveBeenCalled();
  });

  it('marca como caducada la suscripción rechazada con 404 o 410', async () => {
    for (const statusCode of [404, 410]) {
      const send = vi.fn().mockRejectedValue(new FakePushError('gone', statusCode));

      const result = await sendPush(target, {}, { ...keys, send });

      expect(result).toMatchObject({ ok: false, reason: 'expired' });
    }
  });

  it('informa de otros rechazos del servicio de push con su código', async () => {
    const send = vi.fn().mockRejectedValue(new FakePushError('server error', 500));

    const result = await sendPush(target, {}, { ...keys, send });

    expect(result).toMatchObject({ ok: false, reason: 'rejected' });
    expect(result.ok === false && result.message).toContain('500');
  });

  it('captura los fallos de red sin lanzar', async () => {
    const send = vi.fn().mockRejectedValue(new Error('sin conexión'));

    const result = await sendPush(target, {}, { ...keys, send });

    expect(result).toEqual({ ok: false, reason: 'network', message: 'sin conexión' });
  });
});

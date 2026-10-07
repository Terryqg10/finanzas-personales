import { describe, expect, it } from 'vitest';

import { subscribePushSchema, unsubscribePushSchema } from './push';

const valid = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'BKey', auth: 'authKey' },
};

describe('subscribePushSchema', () => {
  it('acepta una suscripción válida', () => {
    expect(subscribePushSchema.safeParse(valid).success).toBe(true);
  });

  it('rechaza endpoints que no son https', () => {
    expect(
      subscribePushSchema.safeParse({ ...valid, endpoint: 'http://push.example.com/a' }).success,
    ).toBe(false);
  });

  it('rechaza endpoints que no son una URL', () => {
    expect(subscribePushSchema.safeParse({ ...valid, endpoint: 'no-es-una-url' }).success).toBe(
      false,
    );
  });

  it('rechaza claves ausentes o vacías', () => {
    expect(subscribePushSchema.safeParse({ endpoint: valid.endpoint }).success).toBe(false);
    expect(
      subscribePushSchema.safeParse({ ...valid, keys: { p256dh: '', auth: 'a' } }).success,
    ).toBe(false);
  });
});

describe('unsubscribePushSchema', () => {
  it('exige un endpoint con forma de URL', () => {
    expect(unsubscribePushSchema.safeParse({ endpoint: valid.endpoint }).success).toBe(true);
    expect(unsubscribePushSchema.safeParse({ endpoint: 'nada' }).success).toBe(false);
  });
});

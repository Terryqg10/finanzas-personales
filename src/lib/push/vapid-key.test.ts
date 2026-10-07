import { describe, expect, it } from 'vitest';

import { urlBase64ToUint8Array } from './vapid-key';

describe('urlBase64ToUint8Array', () => {
  it('decodifica base64 con relleno implícito', () => {
    // "hola" en base64 es "aG9sYQ==" (aquí sin los '=').
    expect(Array.from(urlBase64ToUint8Array('aG9sYQ'))).toEqual([104, 111, 108, 97]);
  });

  it('acepta los caracteres url-safe (- y _) como + y /', () => {
    // 0xfb 0xff 0xbf en base64 estándar es "+/+/"; en url-safe, "-_-_".
    expect(Array.from(urlBase64ToUint8Array('-_-_'))).toEqual([251, 255, 191]);
  });

  it('devuelve 65 bytes para una clave pública VAPID típica de 87 caracteres', () => {
    const key = 'B'.padEnd(87, 'A');

    expect(urlBase64ToUint8Array(key)).toHaveLength(65);
  });
});

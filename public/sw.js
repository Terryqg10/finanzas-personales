/*
 * Service worker de Finanzas Personales. Solo atiende notificaciones push:
 * no intercepta peticiones ni guarda nada en caché, así que nunca puede
 * servir datos obsoletos. Spec: specs/alertas-presupuesto-push.md, 4.3.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = typeof data.title === 'string' ? data.title : 'Finanzas Personales';
  // Solo rutas internas: un payload nunca debe poder abrir otra web.
  const url = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/';

  // iOS exige mostrar siempre una notificación por cada push recibido.
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === 'string' ? data.body : '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: typeof data.tag === 'string' ? data.tag : undefined,
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = new URL(event.notification.data?.url ?? '/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ('navigate' in client) {
            await client.navigate(target);
          }
          return;
        }
      }

      await self.clients.openWindow(target);
    })(),
  );
});

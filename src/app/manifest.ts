import type { MetadataRoute } from 'next';

/**
 * Manifiesto de la app instalable (PWA mínima). Necesario para las
 * notificaciones push en iPhone, que solo funcionan con la web añadida a la
 * pantalla de inicio. Spec: specs/alertas-presupuesto-push.md, sección 4.3.
 *
 * Se sirve en `/manifest.webmanifest`; al llevar extensión, el middleware de
 * autenticación no la redirige a `/login`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Finanzas Personales',
    short_name: 'Finanzas',
    description: 'Control de finanzas personales — dashboard, movimientos y presupuestos.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'es',
    background_color: '#f9fafb',
    theme_color: '#266260',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

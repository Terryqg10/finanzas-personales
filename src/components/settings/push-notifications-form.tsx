'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { urlBase64ToUint8Array } from '@/lib/push/vapid-key';

type PushStatus =
  | 'loading'
  | 'unsupported'
  | 'ios-needs-install'
  | 'missing-key'
  | 'denied'
  | 'inactive'
  | 'active';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;

const STATUS_MESSAGES: Record<Exclude<PushStatus, 'loading' | 'inactive' | 'active'>, string> = {
  unsupported: 'Este navegador no admite notificaciones push.',
  'ios-needs-install':
    'En iPhone, las notificaciones solo funcionan con la web añadida a la pantalla de inicio: toca Compartir → "Añadir a pantalla de inicio" y ábrela desde ese icono.',
  'missing-key': 'Las notificaciones push no están configuradas todavía en el servidor.',
  denied:
    'Has bloqueado las notificaciones para esta web. Actívalas desde los ajustes del navegador o del móvil y vuelve aquí.',
};

function isIos(): boolean {
  const { userAgent, maxTouchPoints } = navigator;
  // Los iPad recientes se identifican como Mac pero tienen pantalla táctil.
  return (
    /iphone|ipad|ipod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

function supportsPush(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

async function detectStatus(): Promise<PushStatus> {
  if (!supportsPush()) {
    return isIos() && !isStandalone() ? 'ios-needs-install' : 'unsupported';
  }
  if (!VAPID_PUBLIC_KEY) return 'missing-key';
  if (Notification.permission === 'denied') return 'denied';

  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? 'active' : 'inactive';
}

export function PushNotificationsForm({ isDemo }: { isDemo: boolean }) {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isDemo) return;

    let cancelled = false;
    detectStatus()
      .then((detected) => {
        if (!cancelled) setStatus(detected);
      })
      .catch(() => {
        if (!cancelled) setStatus('unsupported');
      });

    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  async function activate() {
    if (!VAPID_PUBLIC_KEY) return;
    setBusy(true);

    try {
      // El permiso solo se pide aquí, tras un clic del usuario (lo exigen Safari y Chrome).
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'inactive');
        return;
      }

      const registration = await getRegistration();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        // Sin registro en el servidor la suscripción no sirve: se deshace para no dejar el estado a medias.
        await subscription.unsubscribe();
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? 'No se pudo activar las notificaciones en este dispositivo.');
        return;
      }

      setStatus('active');
      toast.success('Notificaciones activadas en este dispositivo.');
    } catch {
      toast.error('No se pudo activar las notificaciones. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);

    try {
      const registration = await getRegistration();
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const { endpoint } = subscription;
        await subscription.unsubscribe();
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }

      setStatus('inactive');
      toast.success('Notificaciones desactivadas en este dispositivo.');
    } catch {
      toast.error('No se pudo desactivar las notificaciones. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (isDemo) {
    return (
      <p className="text-muted-foreground text-sm">
        Las notificaciones no están disponibles en el modo demo.
      </p>
    );
  }

  if (status === 'loading') {
    return <p className="text-muted-foreground text-sm">Comprobando este dispositivo…</p>;
  }

  if (status !== 'inactive' && status !== 'active') {
    return <p className="text-muted-foreground text-sm">{STATUS_MESSAGES[status]}</p>;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-foreground text-sm font-medium">
        {status === 'active' ? 'Activadas en este dispositivo' : 'Desactivadas en este dispositivo'}
      </p>

      {status === 'active' ? (
        <Button variant="secondary" disabled={busy} onClick={() => void deactivate()}>
          Desactivar
        </Button>
      ) : (
        <Button disabled={busy} onClick={() => void activate()}>
          Activar
        </Button>
      )}
    </div>
  );
}

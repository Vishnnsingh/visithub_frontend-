import { api } from './api';

export type VisitNotice = {
  title: string;
  body: string;
  kind?: 'timer' | 'status';
};

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function subscribeVisitPush(code: string, visitorId: string, vapidKey?: string | null) {
  if (!code || !visitorId || !vapidKey) return false;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }
    const raw = subscription.toJSON();
    if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) return false;
    await api.post(`/qr/visit/${code}/push/${visitorId}`, {
      endpoint: raw.endpoint,
      keys: { p256dh: raw.keys.p256dh, auth: raw.keys.auth },
    });
    return true;
  } catch {
    return false;
  }
}

export async function showVisitNotice(notice: VisitNotice, path: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const options = {
    body: notice.body,
    data: { path },
    tag: 'kavion-visit',
    renotify: true,
    requireInteraction: true,
  } as NotificationOptions;
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(notice.title, options);
      return;
    }
  } catch {
    // fall through to page notification
  }
  try {
    new Notification(notice.title, options);
  } catch {
    // ignore blocked banners
  }
}

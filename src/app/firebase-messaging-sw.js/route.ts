import {
  getFirebaseWebConfig,
  isFirebaseWebConfigured,
} from "@/lib/firebase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dynamically serves the FCM service worker with public Firebase config injected.
 * Path: /firebase-messaging-sw.js
 */
export async function GET() {
  const config = getFirebaseWebConfig();
  const configured = isFirebaseWebConfigured() && Boolean(config);

  const body = configured
    ? buildConfiguredWorker(config!)
    : buildNoopWorker();

  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

function buildNoopWorker(): string {
  return `/* PingOf FCM SW — Firebase yapılandırılmamış */
self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
`;
}

function buildConfiguredWorker(
  config: NonNullable<ReturnType<typeof getFirebaseWebConfig>>,
): string {
  const configJson = JSON.stringify(config);
  return `/* PingOf Firebase Messaging Service Worker */
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');

firebase.initializeApp(${configJson});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Data-only pushes: SW is the single display path (no FCM auto-notification).
  const title =
    (payload.data && payload.data.title) ||
    (payload.notification && payload.notification.title) ||
    'PingOf';
  const body =
    (payload.data && payload.data.body) ||
    (payload.notification && payload.notification.body) ||
    '';
  const icon =
    (payload.data && payload.data.icon) ||
    (payload.notification && payload.notification.icon) ||
    '/icons/icon-192.png';
  const badge =
    (payload.data && payload.data.badge) || '/icons/icon-192.png';
  const image =
    (payload.data && payload.data.image) || undefined;
  const url =
    (payload.data && payload.data.url) ||
    (payload.fcmOptions && payload.fcmOptions.link) ||
    '';
  const tag =
    (payload.data && (payload.data.tag || payload.data.notificationType)) ||
    'pingof';

  // Never invent routes in the SW — only open payload.url (path extracted).
  function toNavPath(raw) {
    const value = String(raw || '').trim();
    if (!value) return '/notifications';
    if (value.charAt(0) === '/' && value.charAt(1) !== '/') return value;
    try {
      const u = new URL(value, self.location.origin);
      return (u.pathname + u.search + u.hash) || '/notifications';
    } catch (_) {
      return '/notifications';
    }
  }

  const options = {
    body: body,
    icon: icon,
    badge: badge,
    tag: tag,
    data: {
      url: toNavPath(url),
      notificationType: (payload.data && payload.data.notificationType) || '',
      entityId: (payload.data && payload.data.entityId) || '',
      organizationId: (payload.data && payload.data.organizationId) || '',
      challengeId: (payload.data && payload.data.challengeId) || '',
      matchId: (payload.data && payload.data.matchId) || '',
      tournamentId: (payload.data && payload.data.tournamentId) || '',
      notificationId: (payload.data && payload.data.notificationId) || '',
    },
    renotify: true,
  };
  if (image) {
    options.image = image;
  }

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const rawUrl = data.url || '/notifications';
  let targetUrl = '/notifications';
  try {
    const value = String(rawUrl || '').trim();
    if (value.charAt(0) === '/' && value.charAt(1) !== '/') {
      targetUrl = value;
    } else {
      const u = new URL(value, self.location.origin);
      // Always use path+search even if absolute URL host differs (APP_URL mismatch).
      targetUrl = (u.pathname + u.search + u.hash) || '/notifications';
    }
  } catch (_) {
    targetUrl = '/notifications';
  }

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus();
          try {
            client.postMessage({
              type: 'PINGOF_NAVIGATE',
              url: targetUrl,
              source: 'sw',
              notificationType: data.notificationType || '',
              entityId: data.entityId || '',
              organizationId: data.organizationId || '',
              challengeId: data.challengeId || '',
              matchId: data.matchId || '',
              tournamentId: data.tournamentId || '',
              notificationId: data.notificationId || '',
            });
          } catch (_) {
            if ('navigate' in client) {
              try {
                await client.navigate(targetUrl);
              } catch (_) {}
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
`;
}

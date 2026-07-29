"use client";

import { useEffect, useState, useTransition } from "react";

import {
  getPushPublicKeyAction,
  getPushStatusAction,
  subscribePushAction,
  unsubscribePushAction,
} from "@/lib/actions/push";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

function subscriptionPayload(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
  };
}

export function PushNotificationsCard() {
  const [supported, setSupported] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [isDev, setIsDev] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const pushOk =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setSupported(pushOk);
    setIsDev(process.env.NODE_ENV !== "production");

    if (!pushOk) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);

    startTransition(() => {
      void (async () => {
        const [keyInfo, status] = await Promise.all([
          getPushPublicKeyAction(),
          getPushStatusAction(),
        ]);
        const isConfigured = keyInfo.configured && Boolean(keyInfo.publicKey);
        setConfigured(isConfigured);
        setEnabled(status.hasSubscription);

        try {
          const reg = await navigator.serviceWorker.getRegistration("/");
          const sub = await reg?.pushManager.getSubscription();
          if (!sub) return;

          // Browser has a subscription — keep UI in sync and re-save to DB if missing
          setEnabled(true);
          if (isConfigured && !status.hasSubscription) {
            const result = await subscribePushAction(
              subscriptionPayload(sub),
              navigator.userAgent,
            );
            if (!result.error) {
              setEnabled(true);
            }
          }
        } catch {
          // ignore resync failures on mount
        }
      })();
    });
  }, []);

  function clearFeedback() {
    setMessage(null);
    setError(null);
  }

  function enablePush() {
    clearFeedback();
    startTransition(() => {
      void (async () => {
        try {
          if (!supported) {
            setError("Bu tarayıcı Web Push desteklemiyor.");
            return;
          }

          const { publicKey, configured: isConfigured } = await getPushPublicKeyAction();
          if (!isConfigured || !publicKey) {
            setError("Sunucuda VAPID anahtarları tanımlı değil.");
            return;
          }

          const permissionResult = await Notification.requestPermission();
          setPermission(permissionResult);
          if (permissionResult !== "granted") {
            setError(
              permissionResult === "denied"
                ? "Bildirim izni reddedildi. Tarayıcı ayarlarından açabilirsiniz."
                : "Bildirim izni verilmedi.",
            );
            return;
          }

          const registration = await ensureServiceWorker();
          if (!registration) {
            setError("Service worker kaydı başarısız.");
            return;
          }

          await navigator.serviceWorker.ready;

          let subscription = await registration.pushManager.getSubscription();
          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
            });
          }

          const result = await subscribePushAction(
            subscriptionPayload(subscription),
            navigator.userAgent,
          );

          if (result.error) {
            setError(result.error);
            return;
          }

          setEnabled(true);
          setMessage(result.success ?? "Tarayıcı bildirimleri açıldı.");
        } catch (err) {
          console.error(err);
          setError("Bildirimler açılırken bir hata oluştu.");
        }
      })();
    });
  }

  function disablePush() {
    clearFeedback();
    startTransition(() => {
      void (async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration("/");
          const subscription = await registration?.pushManager.getSubscription();
          const endpoint = subscription?.endpoint;

          if (subscription) {
            await subscription.unsubscribe();
          }

          if (endpoint) {
            const result = await unsubscribePushAction(endpoint);
            if (result.error) {
              setError(result.error);
              return;
            }
            setMessage(result.success ?? "Tarayıcı bildirimleri kapatıldı.");
          } else {
            setMessage("Tarayıcı bildirimleri kapatıldı.");
          }

          setEnabled(false);
        } catch {
          setError("Bildirimler kapatılırken bir hata oluştu.");
        }
      })();
    });
  }

  return (
    <div className="card mb-4">
      <div className="card-title">Tarayıcı Bildirimleri</div>
      <p className="text-text-secondary mb-3 text-sm">
        Uygulama kapalıyken de meydan okuma, maç sonucu ve turnuva bildirimlerini almak
        için tarayıcı bildirimlerini açın. (HTTPS veya localhost gerekir.)
      </p>
      {isDev ? (
        <p className="text-text-muted mb-3 text-xs">
          Geliştirmede service worker varsayılan kapalıdır. Push testi için adrese{" "}
          <code className="text-xs">?sw=1</code> ekleyin veya{" "}
          <code className="text-xs">npm run build && npm run start</code> kullanın.
        </p>
      ) : null}

      {!supported ? (
        <p className="text-sm text-amber-300">
          Bu cihaz veya tarayıcı Web Push desteklemiyor. iOS&apos;ta uygulamayı Ana Ekrana
          ekledikten sonra deneyin (iOS 16.4+).
        </p>
      ) : !configured ? (
        <p className="text-sm text-amber-300">
          Web Push henüz sunucuda yapılandırılmamış. Yönetici{" "}
          <code className="text-xs">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> ve{" "}
          <code className="text-xs">VAPID_PRIVATE_KEY</code> değerlerini eklemeli.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {enabled && permission === "granted" ? (
            <button
              type="button"
              className="btn btn-secondary min-h-11 min-w-11"
              disabled={pending}
              onClick={disablePush}
            >
              {pending ? "İşleniyor…" : "Bildirimleri kapat"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary min-h-11 min-w-11"
              disabled={pending}
              onClick={enablePush}
            >
              {pending ? "İşleniyor…" : "Bildirimleri aç"}
            </button>
          )}
          <span className="text-text-muted text-xs">
            Durum:{" "}
            {permission === "denied"
              ? "İzin reddedildi"
              : enabled
                ? "Açık"
                : "Kapalı"}
          </span>
        </div>
      )}

      {message ? (
        <p className="mt-3 text-sm text-emerald-400" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

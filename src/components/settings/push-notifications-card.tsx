"use client";

import { useEffect, useState, useTransition } from "react";

import { isFirebaseWebConfigured } from "@/lib/firebase/config";
import {
  disableWebPush,
  enableWebPush,
  getStoredFcmToken,
} from "@/lib/firebase/messaging-client";

export function PushNotificationsCard() {
  const configured = isFirebaseWebConfigured();
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported" | "unknown"
  >("unknown");
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    setEnabled(
      Notification.permission === "granted" && Boolean(getStoredFcmToken()),
    );
  }, []);

  function enable() {
    setMessage(null);
    setError(null);
    startTransition(() => {
      void (async () => {
        const result = await enableWebPush();
        if (!result.ok) {
          setError(result.error);
          if (typeof Notification !== "undefined") {
            setPermission(Notification.permission);
          }
          return;
        }
        setEnabled(true);
        setPermission("granted");
        setMessage("Tarayıcı bildirimleri açıldı.");
      })();
    });
  }

  function disable() {
    setMessage(null);
    setError(null);
    startTransition(() => {
      void (async () => {
        const result = await disableWebPush();
        if (!result.ok) {
          setError(result.error ?? "Bildirimler kapatılamadı.");
          return;
        }
        setEnabled(false);
        setMessage("Tarayıcı bildirimleri kapatıldı.");
      })();
    });
  }

  return (
    <div className="card mb-4">
      <div className="card-title">Tarayıcı Bildirimleri</div>
      <p className="text-text-secondary mb-3 text-sm">
        Uygulama kapalıyken de bildirim almak için tarayıcı iznini açın. Push
        gönderimi Firebase Cloud Messaging üzerinden yapılır; uygulama içi
        bildirim merkezi ayrı çalışır.
      </p>

      {!configured ? (
        <p className="text-sm text-amber-300">
          Push bildirimleri henüz yapılandırılmamış. Yönetici Firebase ortam
          değişkenlerini eklemelidir.
        </p>
      ) : permission === "unsupported" ? (
        <p className="text-sm text-amber-300">
          Bu tarayıcı bildirimleri desteklemiyor. Android Chrome PWA önerilir.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {enabled ? (
            <button
              type="button"
              className="btn btn-secondary min-h-11 min-w-11"
              disabled={pending}
              onClick={disable}
            >
              {pending ? "İşleniyor…" : "Bildirimleri kapat"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary min-h-11 min-w-11"
              disabled={pending}
              onClick={enable}
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

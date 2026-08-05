"use client";

import { useEffect, useState, useTransition } from "react";
import OneSignal from "react-onesignal";

import {
  getOneSignalPushStatus,
  optInOneSignalPush,
  optOutOneSignalPush,
  waitForOneSignalReady,
} from "@/components/onesignal/onesignal-provider";
import { ONESIGNAL_APP_ID } from "@/lib/onesignal/config";

export function PushNotificationsCard() {
  const [configured] = useState(Boolean(ONESIGNAL_APP_ID));
  const [optedIn, setOptedIn] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">(
    "unknown",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }

    void (async () => {
      try {
        // Provider owns init — only wait here.
        const ready = await waitForOneSignalReady();
        if (!ready) return;
        const status = getOneSignalPushStatus();
        setOptedIn(status.optedIn);
        if (typeof Notification !== "undefined") {
          setPermission(Notification.permission);
        }
        OneSignal.User.PushSubscription.addEventListener("change", () => {
          setOptedIn(Boolean(OneSignal.User.PushSubscription.optedIn));
        });
      } catch {
        // SDK may still be loading
      }
    })();
  }, []);

  function enablePush() {
    setMessage(null);
    setError(null);
    startTransition(() => {
      void (async () => {
        const result = await optInOneSignalPush();
        if (!result.ok) {
          setError(result.error ?? "Push açılamadı.");
          if (typeof Notification !== "undefined") {
            setPermission(Notification.permission);
          }
          return;
        }
        setOptedIn(true);
        setPermission("granted");
        setMessage("Tarayıcı bildirimleri açıldı (OneSignal).");
      })();
    });
  }

  function disablePush() {
    setMessage(null);
    setError(null);
    startTransition(() => {
      void (async () => {
        const result = await optOutOneSignalPush();
        if (!result.ok) {
          setError(result.error ?? "Bildirimler kapatılırken bir hata oluştu.");
          return;
        }
        setOptedIn(false);
        setMessage("Tarayıcı bildirimleri kapatıldı.");
      })();
    });
  }

  return (
    <div className="card mb-4">
      <div className="card-title">Tarayıcı Bildirimleri</div>
      <p className="text-text-secondary mb-3 text-sm">
        Uygulama kapalıyken de bildirim almak için tarayıcı iznini açın. Push gönderimi
        OneSignal üzerinden yapılır; uygulama içi bildirim merkezi ayrı çalışır. İzin,
        OneSignal doğrulama diyalogundaki &quot;Got it&quot; ile istenir.
      </p>

      {!configured ? (
        <p className="text-sm text-amber-300">
          OneSignal henüz yapılandırılmamış. Yönetici App ID ve{" "}
          <code className="text-xs">ONESIGNAL_REST_API_KEY</code> değerlerini eklemeli.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {optedIn && permission === "granted" ? (
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
              : optedIn
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

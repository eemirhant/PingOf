"use client";

import {
  getClientVapidKey,
  getFirebaseMessagingClient,
} from "@/lib/firebase/client";
import { isFirebaseWebConfigured } from "@/lib/firebase/config";
import { pushLog } from "@/lib/notifications/push-log";

const DEVICE_ID_KEY = "pingof-device-id";
const FCM_TOKEN_KEY = "pingof-fcm-token";
const SW_PATH = "/firebase-messaging-sw.js";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return `dev-${Date.now()}`;
  }
}

export function getStoredFcmToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(FCM_TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeFcmToken(token: string): void {
  try {
    window.localStorage.setItem(FCM_TOKEN_KEY, token);
  } catch {
    // ignore quota / private mode
  }
}

export function clearStoredFcmToken(): void {
  try {
    window.localStorage.removeItem(FCM_TOKEN_KEY);
  } catch {
    // ignore
  }
}

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "chrome";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "safari";
  return "unknown";
}

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android-web";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios-web";
  return "web";
}

async function ensureMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (
      existing?.active?.scriptURL.includes("firebase-messaging-sw.js") ||
      existing?.waiting?.scriptURL.includes("firebase-messaging-sw.js") ||
      existing?.installing?.scriptURL.includes("firebase-messaging-sw.js")
    ) {
      await existing.update().catch(() => undefined);
      return existing;
    }
    return await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch (error) {
    pushLog.failed({
      reason: "service_worker_register_failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export type EnablePushResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

function vapidKeyPreview(vapidKey: string): {
  length: number;
  first10: string;
  last10: string;
} {
  return {
    length: vapidKey.length,
    first10: vapidKey.slice(0, 10),
    last10: vapidKey.slice(-10),
  };
}

function swWorkerSnapshot(worker: ServiceWorker | null | undefined): {
  scriptURL: string | null;
  state: string | null;
} | null {
  if (!worker) return null;
  return {
    scriptURL: worker.scriptURL ?? null,
    state: worker.state ?? null,
  };
}

/**
 * Request notification permission, obtain FCM token, register device on server.
 */
export async function enableWebPush(): Promise<EnablePushResult> {
  console.info("[fcm-register] enableWebPush() başladı", {
    href: typeof window !== "undefined" ? window.location.href : null,
    isSecureContext:
      typeof window !== "undefined" ? window.isSecureContext : null,
  });

  if (typeof window === "undefined") {
    console.info("[fcm-register] RETURN early: window yok (SSR)", {
      step: "window",
    });
    return { ok: false, error: "Tarayıcı ortamı gerekli." };
  }

  if (!isFirebaseWebConfigured()) {
    console.info("[fcm-register] RETURN early: Firebase web config yok", {
      step: "isFirebaseWebConfigured",
    });
    return {
      ok: false,
      error: "Push bildirimleri henüz yapılandırılmamış.",
    };
  }

  if (!("Notification" in window)) {
    console.info("[fcm-register] RETURN early: Notification API yok", {
      step: "Notification",
    });
    return {
      ok: false,
      error: "Bu tarayıcı bildirimleri desteklemiyor.",
    };
  }

  console.info(
    "[fcm-register] Notification.permission =",
    Notification.permission,
  );

  if (Notification.permission === "denied") {
    console.info("[fcm-register] RETURN early: permission denied", {
      step: "Notification.permission",
    });
    return {
      ok: false,
      error:
        "Tarayıcı bildirimi reddedildi. İzni tarayıcı ayarlarından açıp tekrar deneyin.",
    };
  }

  if (Notification.permission !== "granted") {
    console.info("[fcm-register] requestPermission() çağrılıyor…");
    const permission = await Notification.requestPermission();
    console.info("[fcm-register] requestPermission sonucu =", permission);
    if (permission !== "granted") {
      console.info("[fcm-register] RETURN early: izin verilmedi", {
        step: "Notification.requestPermission",
        permission,
      });
      return { ok: false, error: "Bildirim izni verilmedi." };
    }
  }

  console.info("[fcm-register] getFirebaseMessagingClient() çağrılıyor…");
  const messaging = await getFirebaseMessagingClient();
  const vapidKey = getClientVapidKey();
  console.info("[fcm-register] messaging/vapid durumu", {
    step: "getMessaging+VAPID",
    hasMessaging: Boolean(messaging),
    hasVapidKey: Boolean(vapidKey),
    vapidKey_preview: vapidKey ? vapidKeyPreview(vapidKey) : null,
  });

  if (!messaging || !vapidKey) {
    console.error("[fcm-register] RETURN early: messaging veya vapidKey yok", {
      step: !messaging ? "getMessaging()" : "VAPID",
      hasMessaging: Boolean(messaging),
      hasVapidKey: Boolean(vapidKey),
      Notification_permission: Notification.permission,
      isSecureContext: window.isSecureContext,
      location_href: window.location.href,
    });
    return {
      ok: false,
      error: "Push bildirimleri bu cihazda desteklenmiyor.",
    };
  }

  console.info("[fcm-register] ensureMessagingServiceWorker() çağrılıyor…");
  const registration = await ensureMessagingServiceWorker();
  console.info("[fcm-register] Service Worker sonucu", {
    step: "ServiceWorker.register",
    hasRegistration: Boolean(registration),
    scope: registration?.scope ?? null,
    active: swWorkerSnapshot(registration?.active),
    waiting: swWorkerSnapshot(registration?.waiting),
    installing: swWorkerSnapshot(registration?.installing),
    controller: swWorkerSnapshot(navigator.serviceWorker.controller),
  });

  if (!registration) {
    console.error("[fcm-register] RETURN early: Service Worker kaydı yok", {
      step: "ServiceWorker",
    });
    return {
      ok: false,
      error: "Service Worker kaydı başarısız oldu.",
    };
  }

  let token: string;
  let getTokenCalled = false;
  try {
    const { getToken, isSupported } = await import("firebase/messaging");
    const supported = await isSupported().catch((supportError: unknown) => {
      console.error("[fcm-register] isSupported() failed", supportError);
      return false;
    });

    console.info("[fcm-register] getToken() çağrılıyor", {
      step: "getToken()",
      Firebase_isSupported: supported,
      Notification_permission: Notification.permission,
      isSecureContext: window.isSecureContext,
      location_href: window.location.href,
      registration_scope: registration.scope,
      registration_active: swWorkerSnapshot(registration.active),
      registration_waiting: swWorkerSnapshot(registration.waiting),
      registration_installing: swWorkerSnapshot(registration.installing),
      controller: swWorkerSnapshot(navigator.serviceWorker.controller),
      vapidKey_preview: vapidKeyPreview(vapidKey),
    });

    getTokenCalled = true;
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    console.info("[fcm-register] getToken() tamamlandı", {
      step: "getToken()",
      tokenLength: token?.length ?? 0,
      tokenPreview: token ? `${token.slice(0, 8)}…${token.slice(-8)}` : null,
    });
  } catch (error) {
    const err = error as {
      name?: string;
      code?: string;
      message?: string;
      stack?: string;
    };
    let readyRegistration: ServiceWorkerRegistration | null = null;
    try {
      readyRegistration = await navigator.serviceWorker.ready;
    } catch {
      readyRegistration = null;
    }

    console.error("[fcm-register] RETURN early: getToken() exception", {
      step: "getToken()",
      error,
      error_name: err?.name ?? null,
      error_code: err?.code ?? null,
      error_message:
        err?.message ??
        (error instanceof Error ? error.message : String(error)),
      error_stack: err?.stack ?? (error instanceof Error ? error.stack : null),
      registration_scope: registration.scope,
      registration_active: swWorkerSnapshot(registration.active),
      registration_waiting: swWorkerSnapshot(registration.waiting),
      registration_installing: swWorkerSnapshot(registration.installing),
      navigator_serviceWorker_controller: swWorkerSnapshot(
        navigator.serviceWorker.controller,
      ),
      navigator_serviceWorker_ready: readyRegistration
        ? {
            scope: readyRegistration.scope,
            active: swWorkerSnapshot(readyRegistration.active),
          }
        : null,
      Notification_permission: Notification.permission,
      isSecureContext: window.isSecureContext,
      location_href: window.location.href,
      vapidKey_preview: vapidKeyPreview(vapidKey),
      getTokenCalled,
    });

    pushLog.failed({
      reason: "get_token_failed",
      error:
        err?.message ??
        (error instanceof Error ? error.message : String(error)),
      code: err?.code ?? null,
      name: err?.name ?? null,
    });

    if (window.isSecureContext === false) {
      return {
        ok: false,
        error: "FCM token alınamadı. HTTPS veya localhost gerekir.",
      };
    }

    const realMessage =
      typeof err?.message === "string" && err.message.trim()
        ? err.message.trim()
        : error instanceof Error && error.message
          ? error.message
          : String(error);
    const codePrefix =
      typeof err?.code === "string" && err.code ? `[${err.code}] ` : "";
    return {
      ok: false,
      error: `FCM token alınamadı: ${codePrefix}${realMessage}`,
    };
  }

  if (!getTokenCalled) {
    console.error(
      "[fcm-register] getToken() hiç çağrılmadı (beklenmeyen kontrol akışı)",
    );
  }

  if (!token) {
    console.error("[fcm-register] RETURN early: getToken() null/boş", {
      step: "getToken() null",
      token,
    });
    pushLog.failed({
      reason: "get_token_null",
      message: "FCM getToken returned empty string",
    });
    return {
      ok: false,
      error:
        "FCM token boş döndü. VAPID key / Service Worker / Firebase Web Push ayarlarını kontrol edin.",
    };
  }

  storeFcmToken(token);

  const deviceId = getOrCreateDeviceId();
  const requestBody = {
    deviceId,
    fcmToken: token,
    platform: detectPlatform(),
    browser: detectBrowser(),
    deviceName:
      typeof navigator !== "undefined"
        ? navigator.userAgent.slice(0, 180)
        : null,
  };

  console.info("[fcm-register] POST /api/push/register gönderiliyor", {
    step: "POST /api/push/register",
    url: "/api/push/register",
    body: {
      deviceId: requestBody.deviceId,
      platform: requestBody.platform,
      browser: requestBody.browser,
      deviceName: requestBody.deviceName,
      fcmTokenLength: requestBody.fcmToken.length,
      fcmTokenPreview: `${requestBody.fcmToken.slice(0, 8)}…${requestBody.fcmToken.slice(-8)}`,
    },
  });

  let res: Response;
  try {
    res = await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError) {
    console.error("[fcm-register] POST /api/push/register network hatası", {
      step: "POST /api/push/register fetch",
      error:
        networkError instanceof Error
          ? networkError.message
          : String(networkError),
    });
    return { ok: false, error: "Cihaz kaydı ağ hatası." };
  }

  const responseText = await res.text();
  let responseJson: unknown = null;
  try {
    responseJson = responseText ? JSON.parse(responseText) : null;
  } catch {
    responseJson = { raw: responseText.slice(0, 500) };
  }

  console.info("[fcm-register] POST /api/push/register yanıtı", {
    step: "POST /api/push/register response",
    status: res.status,
    ok: res.ok,
    body: responseJson,
  });

  if (!res.ok) {
    const json = responseJson as { error?: string } | null;
    console.info("[fcm-register] RETURN early: register API başarısız", {
      step: "POST /api/push/register",
      status: res.status,
      error: json?.error ?? null,
    });
    return {
      ok: false,
      error: json?.error ?? "Cihaz kaydı başarısız oldu.",
    };
  }

  console.info(
    "[fcm-register] enableWebPush() BAŞARILI — DeviceToken kaydı istenmiş olmalı",
    {
      deviceId,
      tokenLength: token.length,
    },
  );

  return { ok: true, token };
}

export async function disableWebPush(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Tarayıcı ortamı gerekli." };
  }

  const deviceId = getOrCreateDeviceId();
  const fcmToken = getStoredFcmToken();

  try {
    const res = await fetch("/api/push/register", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, fcmToken }),
    });
    clearStoredFcmToken();
    if (!res.ok) {
      return { ok: false, error: "Cihaz kaydı kapatılamadı." };
    }
    return { ok: true };
  } catch {
    clearStoredFcmToken();
    return { ok: false, error: "Ağ hatası." };
  }
}

/** Best-effort deactivate before logout (never throws). */
export async function deactivatePushOnLogout(): Promise<void> {
  try {
    await disableWebPush();
  } catch {
    // never block logout
  }
}

/**
 * Sync token on authenticated page load (refresh / new session).
 */
export async function syncWebPushToken(): Promise<void> {
  console.info("[fcm-register] syncWebPushToken() çağrıldı", {
    href: typeof window !== "undefined" ? window.location.href : null,
    configured:
      typeof window !== "undefined" ? isFirebaseWebConfigured() : null,
    permission:
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : null,
  });

  if (typeof window === "undefined") {
    console.info("[fcm-register] syncWebPushToken RETURN: window yok");
    return;
  }
  if (!isFirebaseWebConfigured()) {
    console.info(
      "[fcm-register] syncWebPushToken RETURN: Firebase yapılandırılmamış",
    );
    return;
  }
  if (!("Notification" in window) || Notification.permission !== "granted") {
    console.info(
      "[fcm-register] syncWebPushToken RETURN: permission granted değil — enableWebPush çağrılmayacak",
      {
        hasNotificationApi: "Notification" in window,
        permission:
          "Notification" in window ? Notification.permission : null,
        hint: "Telefonda Ayarlar → Bildirimleri aç ile enableWebPush() çalışmalı",
      },
    );
    return;
  }

  try {
    console.info(
      "[fcm-register] syncWebPushToken → enableWebPush() çağrılıyor",
    );
    const result = await enableWebPush();
    console.info("[fcm-register] syncWebPushToken → enableWebPush sonucu", result);
  } catch (error) {
    console.error("[fcm-register] syncWebPushToken enableWebPush exception", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function listenForegroundMessages(
  onNotify: (payload: {
    title: string;
    body: string;
    url?: string;
    notificationType?: string;
    entityId?: string;
    challengeId?: string;
    matchId?: string;
    tournamentId?: string;
  }) => void,
): Promise<() => void> {
  const messaging = await getFirebaseMessagingClient();
  if (!messaging) return () => undefined;

  const { onMessage } = await import("firebase/messaging");
  return onMessage(messaging, (payload) => {
    const data = payload.data ?? {};
    const title =
      payload.notification?.title ?? data.title ?? "PingOf";
    const body = payload.notification?.body ?? data.body ?? "";
    const url = data.url;
    onNotify({
      title,
      body,
      url,
      notificationType: data.notificationType,
      entityId: data.entityId,
      challengeId: data.challengeId,
      matchId: data.matchId,
      tournamentId: data.tournamentId,
    });
  });
}

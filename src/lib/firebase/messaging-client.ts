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

/**
 * Request notification permission, obtain FCM token, register device on server.
 */
export async function enableWebPush(): Promise<EnablePushResult> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Tarayıcı ortamı gerekli." };
  }

  if (!isFirebaseWebConfigured()) {
    return {
      ok: false,
      error: "Push bildirimleri henüz yapılandırılmamış.",
    };
  }

  if (!("Notification" in window)) {
    return {
      ok: false,
      error: "Bu tarayıcı bildirimleri desteklemiyor.",
    };
  }

  if (Notification.permission === "denied") {
    return {
      ok: false,
      error:
        "Tarayıcı bildirimi reddedildi. İzni tarayıcı ayarlarından açıp tekrar deneyin.",
    };
  }

  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, error: "Bildirim izni verilmedi." };
    }
  }

  const messaging = await getFirebaseMessagingClient();
  const vapidKey = getClientVapidKey();
  if (!messaging || !vapidKey) {
    return {
      ok: false,
      error: "Push bildirimleri bu cihazda desteklenmiyor.",
    };
  }

  const registration = await ensureMessagingServiceWorker();
  if (!registration) {
    return {
      ok: false,
      error: "Service Worker kaydı başarısız oldu.",
    };
  }

  let token: string;
  try {
    const { getToken } = await import("firebase/messaging");
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
  } catch (error) {
    pushLog.failed({
      reason: "get_token_failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      error: "FCM token alınamadı. HTTPS veya localhost gerekir.",
    };
  }

  if (!token) {
    pushLog.failed({
      reason: "get_token_null",
      message: "FCM getToken returned empty string",
    });
    return { ok: false, error: "FCM token boş döndü." };
  }

  storeFcmToken(token);

  const deviceId = getOrCreateDeviceId();
  const res = await fetch("/api/push/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      fcmToken: token,
      platform: detectPlatform(),
      browser: detectBrowser(),
      deviceName:
        typeof navigator !== "undefined"
          ? navigator.userAgent.slice(0, 180)
          : null,
    }),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    return {
      ok: false,
      error: json?.error ?? "Cihaz kaydı başarısız oldu.",
    };
  }

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
  if (typeof window === "undefined") return;
  if (!isFirebaseWebConfigured()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    await enableWebPush();
  } catch {
    // ignore — in-app notifications still work
  }
}

export async function listenForegroundMessages(
  onNotify: (payload: { title: string; body: string; url?: string }) => void,
): Promise<() => void> {
  const messaging = await getFirebaseMessagingClient();
  if (!messaging) return () => undefined;

  const { onMessage } = await import("firebase/messaging");
  return onMessage(messaging, (payload) => {
    const title =
      payload.notification?.title ?? payload.data?.title ?? "PingOf";
    const body = payload.notification?.body ?? payload.data?.body ?? "";
    const url = payload.data?.url;
    onNotify({ title, body, url });
  });
}

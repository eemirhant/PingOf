"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OneSignal from "react-onesignal";

import {
  ONESIGNAL_APP_ID,
  ONESIGNAL_DEFAULT_NOTIFICATION_ICON,
  ONESIGNAL_SERVICE_WORKER_PATH,
  ONESIGNAL_SERVICE_WORKER_SCOPE,
  ONESIGNAL_SERVICE_WORKER_UPDATER_PATH,
  onesignalNotificationIconUrl,
} from "@/lib/onesignal/config";
import {
  describeAllowedOneSignalOrigins,
  extractConfiguredSiteUrl,
  isAllowedOneSignalOrigin,
  isWrongSiteUrlError,
} from "@/lib/onesignal/allowed-origin";
import {
  ensureOneSignalServiceWorkerReady,
  listServiceWorkerRegistrations,
} from "@/lib/onesignal/service-worker-cleanup";

const VERIFICATION_SHOWN_KEY = "onesignal-verification-dialog-shown";

/** Survives Fast Refresh / duplicate module instances (unlike bare `let` flags). */
const GLOBAL_INIT_KEY = "__pingof_onesignal_init__";

type OneSignalInitGlobal = {
  promise: Promise<void>;
  done: boolean;
};

function getInitGlobal(): OneSignalInitGlobal | undefined {
  if (typeof globalThis === "undefined") return undefined;
  return (globalThis as Record<string, unknown>)[GLOBAL_INIT_KEY] as
    | OneSignalInitGlobal
    | undefined;
}

function setInitGlobal(state: OneSignalInitGlobal | undefined): void {
  if (typeof globalThis === "undefined") return;
  if (state === undefined) {
    delete (globalThis as Record<string, unknown>)[GLOBAL_INIT_KEY];
    return;
  }
  (globalThis as Record<string, unknown>)[GLOBAL_INIT_KEY] = state;
}

function isAlreadyInitializedError(error: unknown): boolean {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : String(error ?? "");
  return /already initialized/i.test(message);
}

function buildInitOptions(isLocalhost: boolean) {
  const icon = onesignalNotificationIconUrl(window.location.origin);
  return {
    appId: ONESIGNAL_APP_ID,
    allowLocalhostAsSecureOrigin: isLocalhost,
    // We register SW ourselves and wait for active before init.
    autoRegister: false,
    serviceWorkerPath: ONESIGNAL_SERVICE_WORKER_PATH.replace(/^\//, ""),
    serviceWorkerUpdaterPath: ONESIGNAL_SERVICE_WORKER_UPDATER_PATH.replace(
      /^\//,
      "",
    ),
    serviceWorkerParam: { scope: ONESIGNAL_SERVICE_WORKER_SCOPE },
    serviceWorkerOverrideForTypical: true,
    // Avoid broken CDN /default-icon 404 — use PWA icon.
    notificationIcons: {
      chrome_web: icon,
      firefox: icon,
      safari: icon,
    },
    path: ONESIGNAL_DEFAULT_NOTIFICATION_ICON,
  };
}

async function runOneSignalInit(isLocalhost: boolean): Promise<void> {
  await OneSignal.init(buildInitOptions(isLocalhost));
}

/**
 * Wait until PushSubscription has a real browser push token.
 * Avoids OneSignal PATCH with enabled:false / token:"" (400).
 */
export async function waitForPushToken(
  timeoutMs = 20_000,
): Promise<string | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const token = OneSignal.User.PushSubscription.token;
      if (typeof token === "string" && token.length > 0) return token;
    } catch {
      // SDK not ready
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  try {
    const token = OneSignal.User.PushSubscription.token;
    return typeof token === "string" && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

function currentNotificationPermission(): NotificationPermission {
  if (typeof Notification === "undefined") return "denied";
  return Notification.permission;
}

/**
 * Permission → optIn → wait for token. Does not call login.
 */
export async function enablePushSubscription(): Promise<{
  ok: boolean;
  token: string | null;
  error?: string;
}> {
  try {
    const ready = await waitForOneSignalReady();
    if (!ready) {
      return {
        ok: false,
        token: null,
        error: "OneSignal henüz hazır değil. Sayfayı yenileyip tekrar deneyin.",
      };
    }

    if (typeof Notification === "undefined") {
      return { ok: false, token: null, error: "Notification API yok" };
    }

    if (currentNotificationPermission() === "denied") {
      return {
        ok: false,
        token: null,
        error: "Bildirim izni engellenmiş. Tarayıcı ayarlarından izin verin.",
      };
    }

    if (currentNotificationPermission() !== "granted") {
      await OneSignal.Notifications.requestPermission();
      if (currentNotificationPermission() !== "granted") {
        return { ok: false, token: null, error: "Bildirim izni verilmedi" };
      }
    }

    await OneSignal.User.PushSubscription.optIn();
    const token = await waitForPushToken();
    if (!token) {
      const regs = await listServiceWorkerRegistrations();
      console.error(
        "[onesignal] Push token empty after optIn — SW snapshot:",
        regs,
      );
      return {
        ok: false,
        token: null,
        error:
          "Push token oluşmadı (Service Worker / izin). Sayfayı yenileyip tekrar deneyin.",
      };
    }

    console.info("[onesignal] Push token ready", { tokenLength: token.length });
    return { ok: true, token };
  } catch (error) {
    return {
      ok: false,
      token: null,
      error: error instanceof Error ? error.message : "Push açılamadı",
    };
  }
}

/**
 * Initialize OneSignal at most once.
 * Order: SW register+ready → OneSignal.init (no login/optIn here).
 */
export function ensureOneSignalInitialized(): Promise<void> {
  const existing = getInitGlobal();
  if (existing?.done) return Promise.resolve();
  if (existing?.promise) return existing.promise;

  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  setInitGlobal({ promise, done: false });

  void (async () => {
    try {
      const origin = window.location.origin;
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (!isAllowedOneSignalOrigin(origin)) {
        throw new Error(
          `OneSignal bu origin'de başlatılamaz: ${origin}. İzinli: ${describeAllowedOneSignalOrigins()}`,
        );
      }

      // 1) Service Worker Register → 2) Ready (ACTIVE) before init
      await ensureOneSignalServiceWorkerReady();

      if (getInitGlobal()?.done) {
        resolve();
        return;
      }

      // 3) OneSignal.init
      try {
        await runOneSignalInit(isLocalhost);
      } catch (error) {
        if (isAlreadyInitializedError(error)) {
          console.info("[onesignal] init skipped — SDK already initialized");
        } else if (isWrongSiteUrlError(error)) {
          const configured = extractConfiguredSiteUrl(error);
          throw new Error(
            `OneSignal Site URL uyuşmuyor. Dashboard'da Site URL = ${origin} olmalı` +
              (configured ? ` (şimdi: ${configured})` : "") +
              `. Ham hata: ${error instanceof Error ? error.message : String(error)}`,
          );
        } else {
          throw error;
        }
      }

      setInitGlobal({ promise, done: true });
      console.info("[onesignal] init OK", {
        origin,
        secure: window.isSecureContext,
        icon: onesignalNotificationIconUrl(origin),
        environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? "development",
      });
      resolve();
    } catch (error) {
      setInitGlobal(undefined);
      reject(error);
    }
  })();

  return promise;
}

export function isOneSignalSdkReady(): boolean {
  return Boolean(getInitGlobal()?.done);
}

export async function waitForOneSignalReady(timeoutMs = 20_000): Promise<boolean> {
  const existing = getInitGlobal();
  if (existing?.done) return true;
  if (existing?.promise) {
    try {
      await existing.promise;
      return true;
    } catch {
      return false;
    }
  }

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, 50));
    const state = getInitGlobal();
    if (state?.done) return true;
    if (state?.promise) {
      try {
        await state.promise;
        return true;
      } catch {
        return false;
      }
    }
  }
  return false;
}

function wasVerificationShown(): boolean {
  try {
    return window.localStorage.getItem(VERIFICATION_SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

function markVerificationShown(): void {
  try {
    window.localStorage.setItem(VERIFICATION_SHOWN_KEY, "1");
  } catch {
    // ignore
  }
}

/**
 * Sole owner of OneSignal.init().
 * Order after init: Permission/Subscription (+ token) → Login(externalId).
 */
export function OneSignalProvider({ userId }: { userId: string | null }) {
  const [showDialog, setShowDialog] = useState(false);
  const listenerAttached = useRef(false);

  const attachSubscriptionObserver = useCallback(() => {
    if (listenerAttached.current) return;
    listenerAttached.current = true;

    const logIfRegistered = () => {
      const id = OneSignal.User.PushSubscription.id;
      const token = OneSignal.User.PushSubscription.token;
      if (id && token) {
        console.log("OneSignal push subscription registered:", id);
      }
    };

    OneSignal.User.PushSubscription.addEventListener("change", logIfRegistered);
    logIfRegistered();
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await ensureOneSignalInitialized();
        if (cancelled) return;

        attachSubscriptionObserver();

        const permission =
          typeof Notification !== "undefined"
            ? Notification.permission
            : "default";

        // If already granted, finish subscription + login (token-first).
        if (permission === "granted") {
          const sub = await enablePushSubscription();
          if (cancelled) return;
          if (sub.ok && sub.token && userId) {
            await OneSignal.login(userId);
            console.info("[onesignal] login after token OK", { userId });
          }
          if (process.env.NODE_ENV === "development" && userId) {
            void reportSubscriptionDiagnostics(userId);
          }
          return;
        }

        // First-time prompt — do NOT login/optIn without permission (empty token PATCH).
        if (!wasVerificationShown()) {
          markVerificationShown();
          setShowDialog(true);
        } else if (userId) {
          // Soft identity without push subscription update when possible.
          try {
            await OneSignal.login(userId);
          } catch (error) {
            console.warn("[onesignal] login without push skipped/failed", error);
          }
        }
      } catch (error) {
        console.error("[onesignal] init failed", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, attachSubscriptionObserver]);

  function handleGotIt() {
    setShowDialog(false);
    void (async () => {
      try {
        // 4) Permission → 5) Subscription (+ token) → 6) Login
        const sub = await enablePushSubscription();
        if (!sub.ok) {
          console.error("[onesignal] permission/subscription failed", sub.error);
          return;
        }
        if (userId) {
          await OneSignal.login(userId);
          console.info("[onesignal] login after Got it OK", { userId });
        }
        if (process.env.NODE_ENV === "development" && userId) {
          void reportSubscriptionDiagnostics(userId);
        }
      } catch (error) {
        console.error("[onesignal] permission request failed", error);
      }
    })();
  }

  if (!showDialog) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onesignal-verify-title"
      aria-describedby="onesignal-verify-desc"
    >
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-bg-800 p-5 shadow-xl">
        <h2
          id="onesignal-verify-title"
          className="text-lg font-semibold text-text-primary"
        >
          Your OneSignal SDK integration is complete!
        </h2>
        <p id="onesignal-verify-desc" className="text-text-secondary mt-3 text-sm">
          You can now send Push Notifications &amp; In-App Messages through
          OneSignal. Tap below to enable push notifications.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className="btn btn-primary min-h-11 min-w-11"
            onClick={handleGotIt}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export async function optInOneSignalPush(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const result = await enablePushSubscription();
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function optOutOneSignalPush(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const ready = await waitForOneSignalReady();
    if (!ready) {
      return {
        ok: false,
        error: "OneSignal henüz hazır değil. Sayfayı yenileyip tekrar deneyin.",
      };
    }
    await OneSignal.User.PushSubscription.optOut();
    return { ok: true };
  } catch {
    return { ok: false, error: "Bildirimler kapatılırken bir hata oluştu." };
  }
}

export function getOneSignalPushStatus(): {
  optedIn: boolean;
  subscriptionId: string | null | undefined;
} {
  try {
    return {
      optedIn: Boolean(OneSignal.User.PushSubscription.optedIn),
      subscriptionId: OneSignal.User.PushSubscription.id,
    };
  } catch {
    return { optedIn: false, subscriptionId: undefined };
  }
}

async function reportSubscriptionDiagnostics(userId: string): Promise<void> {
  try {
    const issues: string[] = [];
    const permission =
      typeof Notification !== "undefined" ? Notification.permission : "unsupported";
    const optedIn = Boolean(OneSignal.User.PushSubscription.optedIn);
    const subscriptionId = OneSignal.User.PushSubscription.id ?? null;
    const pushToken = OneSignal.User.PushSubscription.token ?? null;
    const externalId = OneSignal.User.externalId ?? userId;

    if (permission !== "granted") issues.push("Push izni yok");
    if (!optedIn) issues.push("optedIn false");
    if (!subscriptionId) issues.push("Subscription bulunamadı");
    if (!pushToken) issues.push("Push Token oluşturulamadı");
    if (externalId && externalId !== userId) issues.push("External ID eşleşmedi");

    const regs = await listServiceWorkerRegistrations();
    const swOk = regs.some(
      (r) =>
        r.active &&
        (r.scriptURL.includes("/OneSignalSDKWorker.js") ||
          r.scriptURL.includes("OneSignalSDKWorker")),
    );
    if (!swOk) issues.push("Service Worker bulunamadı / aktif değil");

    await fetch("/api/admin/notification-debug/client-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        onesignalUserId: OneSignal.User.onesignalId ?? null,
        subscriptionId,
        pushToken,
        permission,
        optedIn,
        sdkInitialized: true,
        serviceWorkerRegistered: swOk,
        issues,
      }),
    });
  } catch {
    // Diagnostic only
  }
}

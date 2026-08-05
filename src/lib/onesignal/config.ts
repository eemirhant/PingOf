/**
 * OneSignal Web App ID (public). Prefer env override for multi-env deploys.
 */
export const ONESIGNAL_APP_ID =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim()) ||
  "2d337375-e1a4-4cfa-bc5e-67d205188e9c";

/**
 * Root-scoped service worker (required for an active registration on app pages).
 * A SW under `/push/onesignal/` with scope `/push/onesignal/` does NOT match `/`,
 * so `navigator.serviceWorker.ready` has no active registration → empty push token
 * → OneSignal PATCH subscriptions 400 (enabled:false, token:"").
 *
 * @see https://documentation.onesignal.com/docs/onesignal-service-worker
 */
export const ONESIGNAL_SERVICE_WORKER_PATH = "/OneSignalSDKWorker.js";

export const ONESIGNAL_SERVICE_WORKER_UPDATER_PATH =
  "/OneSignalSDKUpdaterWorker.js";

/** Must be `/` so the worker can serve push for the whole origin. */
export const ONESIGNAL_SERVICE_WORKER_SCOPE = "/";

/** Absolute path used as default notification icon (avoids /default-icon 404). */
export const ONESIGNAL_DEFAULT_NOTIFICATION_ICON = "/icons/icon-192.png";

export function onesignalNotificationIconUrl(origin?: string): string {
  const base = (origin ?? "").replace(/\/$/, "");
  if (base) return `${base}${ONESIGNAL_DEFAULT_NOTIFICATION_ICON}`;
  return ONESIGNAL_DEFAULT_NOTIFICATION_ICON;
}

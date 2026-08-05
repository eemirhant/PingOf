/**
 * Browser helpers for OneSignal service-worker hygiene + pre-registration.
 *
 * Root cause of "No active ServiceWorkerRegistration" / empty push token:
 * a worker scoped to `/push/onesignal/` never becomes the active registration
 * for app pages at `/`, so PushManager.subscribe cannot produce a token.
 */

import {
  ONESIGNAL_SERVICE_WORKER_PATH,
  ONESIGNAL_SERVICE_WORKER_SCOPE,
} from "@/lib/onesignal/config";

const ONESIGNAL_WORKER_MARKER = "OneSignalSDKWorker";

function scriptUrlOf(reg: ServiceWorkerRegistration): string {
  return (
    reg.active?.scriptURL ||
    reg.waiting?.scriptURL ||
    reg.installing?.scriptURL ||
    ""
  );
}

function isRootOneSignalWorker(reg: ServiceWorkerRegistration): boolean {
  try {
    const path = new URL(scriptUrlOf(reg)).pathname;
    return (
      path === "/OneSignalSDKWorker.js" ||
      path === "/OneSignalSDKUpdaterWorker.js"
    );
  } catch {
    return false;
  }
}

export async function listServiceWorkerRegistrations(): Promise<
  Array<{
    scriptURL: string;
    scope: string;
    active: boolean;
    installing: boolean;
    waiting: boolean;
    state: string | null;
  }>
> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return [];
  const regs = await navigator.serviceWorker.getRegistrations();
  return regs.map((reg) => ({
    scriptURL: scriptUrlOf(reg),
    scope: reg.scope,
    active: Boolean(reg.active),
    installing: Boolean(reg.installing),
    waiting: Boolean(reg.waiting),
    state: reg.active?.state ?? reg.waiting?.state ?? reg.installing?.state ?? null,
  }));
}

/**
 * Unregister every SW that is not the root OneSignal worker
 * (drops `/sw.js`, stale `/push/onesignal/*`, etc.).
 */
export async function unregisterConflictingServiceWorkers(): Promise<{
  unregistered: string[];
  kept: string[];
}> {
  const unregistered: string[] = [];
  const kept: string[] = [];

  if (typeof navigator === "undefined" || !navigator.serviceWorker) {
    return { unregistered, kept };
  }

  const regs = await navigator.serviceWorker.getRegistrations();
  for (const reg of regs) {
    const url = scriptUrlOf(reg);
    if (isRootOneSignalWorker(reg)) {
      kept.push(url || reg.scope);
      continue;
    }
    const ok = await reg.unregister();
    if (ok) unregistered.push(url || reg.scope);
  }

  return { unregistered, kept };
}

/** Nuclear option for the debug UI — unregister everything, then reload. */
export async function unregisterAllServiceWorkers(): Promise<string[]> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return [];
  const regs = await navigator.serviceWorker.getRegistrations();
  const removed: string[] = [];
  for (const reg of regs) {
    const url = scriptUrlOf(reg);
    const ok = await reg.unregister();
    if (ok) removed.push(url || reg.scope);
  }
  return removed;
}

function waitForWorkerActivated(worker: ServiceWorker): Promise<void> {
  if (worker.state === "activated") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(
        new Error(
          `Service Worker activate timeout (state=${worker.state})`,
        ),
      );
    }, 20_000);

    worker.addEventListener("statechange", () => {
      console.info("[onesignal] SW state →", worker.state);
      if (worker.state === "activated") {
        window.clearTimeout(timeout);
        resolve();
      }
      if (worker.state === "redundant") {
        window.clearTimeout(timeout);
        reject(new Error("Service Worker became redundant before activate"));
      }
    });
  });
}

/**
 * Register root OneSignal SW and wait until there is an *active* registration
 * covering `/`. Call this before OneSignal.init().
 */
export async function ensureOneSignalServiceWorkerReady(): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) {
    throw new Error("Bu tarayıcı Service Worker desteklemiyor");
  }

  if (!window.isSecureContext) {
    const host = window.location.hostname;
    const local = host === "localhost" || host === "127.0.0.1";
    if (!local) {
      throw new Error(
        "Secure context yok — HTTP LAN IP üzerinden SW/push çalışmaz. localhost veya Vercel Preview (HTTPS) kullanın.",
      );
    }
  }

  const cleanup = await unregisterConflictingServiceWorkers();
  if (cleanup.unregistered.length > 0) {
    console.info(
      "[onesignal] unregistered conflicting service workers:",
      cleanup.unregistered,
    );
  }

  let registration =
    (await navigator.serviceWorker.getRegistration(
      ONESIGNAL_SERVICE_WORKER_SCOPE,
    )) ?? null;

  const needsRegister =
    !registration || !isRootOneSignalWorker(registration);

  if (needsRegister) {
    console.info("[onesignal] registering SW", {
      path: ONESIGNAL_SERVICE_WORKER_PATH,
      scope: ONESIGNAL_SERVICE_WORKER_SCOPE,
    });
    registration = await navigator.serviceWorker.register(
      ONESIGNAL_SERVICE_WORKER_PATH,
      {
        scope: ONESIGNAL_SERVICE_WORKER_SCOPE,
        updateViaCache: "none",
      },
    );
  }

  if (!registration) {
    throw new Error("OneSignal Service Worker kaydı oluşturulamadı");
  }

  const installing = registration.installing;
  const waiting = registration.waiting;
  if (installing) {
    console.info("[onesignal] SW installing…");
    await waitForWorkerActivated(installing);
  } else if (waiting && !registration.active) {
    console.info("[onesignal] SW waiting → waiting for activate…");
    await waitForWorkerActivated(waiting);
  }

  // Prefer navigator.serviceWorker.ready (active worker for this origin/page).
  const ready = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(
          new Error(
            "navigator.serviceWorker.ready timeout — aktif registration yok",
          ),
        );
      }, 20_000);
    }),
  ]);

  if (!ready.active) {
    const snapshot = await listServiceWorkerRegistrations();
    console.error("[onesignal] No active ServiceWorkerRegistration", snapshot);
    throw new Error("No active ServiceWorkerRegistration");
  }

  if (!ready.active.scriptURL.includes(ONESIGNAL_WORKER_MARKER)) {
    console.warn(
      "[onesignal] ready SW is not OneSignal worker:",
      ready.active.scriptURL,
    );
  }

  console.info("[onesignal] SW ready", {
    scriptURL: ready.active.scriptURL,
    scope: ready.scope,
    state: ready.active.state,
    installing: Boolean(ready.installing),
    waiting: Boolean(ready.waiting),
    active: true,
  });

  return ready;
}

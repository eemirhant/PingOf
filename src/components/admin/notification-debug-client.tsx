"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import OneSignal from "react-onesignal";

import {
  getOneSignalPushStatus,
  waitForOneSignalReady,
} from "@/components/onesignal/onesignal-provider";
import { ONESIGNAL_APP_ID } from "@/lib/onesignal/config";
import {
  listServiceWorkerRegistrations,
  unregisterAllServiceWorkers,
} from "@/lib/onesignal/service-worker-cleanup";

type DiagStep = {
  name: string;
  status: string;
  at: string;
  message: string;
  reasonCode?: string;
  detail?: unknown;
};

type DiagTrace = {
  id: string;
  startedAt: string;
  eventType: string;
  title: string;
  steps: DiagStep[];
  pushSent: boolean;
  success: boolean;
  failureReasons: string[];
  onesignal?: {
    statusCode?: number;
    requestBody?: unknown;
    responseBody?: unknown;
    errorMessage?: string | null;
    durationMs?: number;
    notificationId?: string | null;
  };
  inAppRecipients: string[];
  pushRecipients: string[];
  recipientUserIds: string[];
};

type DebugPayload = {
  onesignal: {
    configured: boolean;
    appId: string;
    restKeyPresent: boolean;
  };
  user: {
    id: string;
    organizationId: string;
    role: string;
    externalId: string;
    preferences: unknown;
    challengeReceivedPush: boolean | null;
    challengeAcceptedPush: boolean | null;
  };
  traces: DiagTrace[];
  events: Array<{
    id: string;
    at: string;
    eventName: string;
    notificationType: string;
    recipientUserIds: string[];
    pushSent: boolean | null;
    traceId?: string | null;
  }>;
  clientReports: Array<{
    at: string;
    userId: string;
    issues: string[];
    subscriptionId?: string | null;
    pushToken?: string | null;
    permission?: string | null;
    optedIn?: boolean | null;
  }>;
  recentDbNotifications: Array<{
    id: string;
    type: string;
    title: string;
    createdAt: string;
    isRead: boolean;
  }>;
};

type ClientProbe = {
  sdkInitialized: boolean;
  appId: string;
  onesignalUserId: string | null;
  externalId: string | null;
  subscriptionId: string | null;
  pushToken: string | null;
  permission: NotificationPermission | "unsupported";
  optedIn: boolean;
  pushSupported: boolean;
  serviceWorkerSupported: boolean;
  serviceWorkerRegistered: boolean;
  serviceWorkerScope: string | null;
  serviceWorkerActive: boolean;
  serviceWorkerScriptURL: string | null;
  isSecureContext: boolean;
  userAgent: string;
  platform: string;
  issues: string[];
};

function statusColor(status: string): string {
  if (status === "ok") return "text-emerald-400";
  if (status === "fail") return "text-red-400";
  if (status === "skip") return "text-amber-300";
  return "text-text-secondary";
}

export function NotificationDebugClient() {
  const [data, setData] = useState<DebugPayload | null>(null);
  const [probe, setProbe] = useState<ClientProbe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<unknown>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/notification-debug", {
      cache: "no-store",
    });
    if (!res.ok) {
      setError(`Durum alınamadı (${res.status})`);
      return;
    }
    setData((await res.json()) as DebugPayload);
  }, []);

  const collectProbe = useCallback(async (): Promise<ClientProbe> => {
    const issues: string[] = [];
    const pushSupported =
      typeof window !== "undefined" &&
      "PushManager" in window &&
      typeof ServiceWorkerRegistration !== "undefined" &&
      "pushManager" in ServiceWorkerRegistration.prototype;

    const serviceWorkerSupported =
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      Boolean(navigator.serviceWorker);

    let sdkInitialized = false;
    let onesignalUserId: string | null = null;
    let subscriptionId: string | null = null;
    let pushToken: string | null = null;
    let optedIn = false;
    let externalId: string | null = null;

    try {
      await waitForOneSignalReady();
      sdkInitialized = true;
      const status = getOneSignalPushStatus();
      optedIn = status.optedIn;
      subscriptionId = status.subscriptionId ?? null;
      pushToken = OneSignal.User.PushSubscription.token ?? null;
      onesignalUserId = OneSignal.User.onesignalId ?? null;
      externalId = OneSignal.User.externalId ?? null;
    } catch {
      issues.push("SDK initialize edilemedi");
    }

    const permission =
      typeof Notification === "undefined"
        ? ("unsupported" as const)
        : Notification.permission;

    if (permission !== "granted") issues.push("Push izni yok");
    if (!optedIn) issues.push("optedIn false");
    if (!subscriptionId) issues.push("Subscription bulunamadı");
    if (!pushToken) issues.push("Push Token oluşturulamadı");
    if (externalId && data?.user.id && externalId !== data.user.id) {
      issues.push("External ID eşleşmedi");
    }

    let serviceWorkerRegistered = false;
    let serviceWorkerScope: string | null = null;
    let serviceWorkerActive = false;
    let serviceWorkerScriptURL: string | null = null;

    if (serviceWorkerSupported) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        const onesignalReg =
          regs.find((r) =>
            r.active?.scriptURL.includes("/OneSignalSDKWorker.js"),
          ) ??
          regs.find((r) =>
            r.active?.scriptURL.includes("OneSignalSDKWorker"),
          ) ??
          regs[0];
        if (onesignalReg) {
          serviceWorkerRegistered = true;
          serviceWorkerScope = onesignalReg.scope;
          serviceWorkerActive = Boolean(onesignalReg.active);
          serviceWorkerScriptURL = onesignalReg.active?.scriptURL ?? null;
        } else {
          issues.push("Service Worker bulunamadı");
        }
      } catch {
        issues.push("Service Worker bulunamadı");
      }
    } else {
      issues.push("Service Worker desteklenmiyor");
    }

    if (!window.isSecureContext) {
      issues.push("HTTPS / secure context yok");
    }

    const probeResult: ClientProbe = {
      sdkInitialized,
      appId: ONESIGNAL_APP_ID,
      onesignalUserId,
      externalId,
      subscriptionId,
      pushToken,
      permission,
      optedIn,
      pushSupported,
      serviceWorkerSupported,
      serviceWorkerRegistered,
      serviceWorkerScope,
      serviceWorkerActive,
      serviceWorkerScriptURL,
      isSecureContext: window.isSecureContext,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      issues,
    };

    void fetch("/api/admin/notification-debug/client-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        onesignalUserId,
        subscriptionId,
        pushToken,
        permission,
        optedIn,
        sdkInitialized,
        serviceWorkerRegistered,
        issues,
      }),
    }).catch(() => undefined);

    return probeResult;
  }, [data?.user.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void collectProbe().then(setProbe);
  }, [collectProbe]);

  function runTestPush() {
    startTransition(() => {
      void (async () => {
        setError(null);
        const res = await fetch("/api/admin/notification-debug/test-push", {
          method: "POST",
        });
        const json = await res.json().catch(() => null);
        setLastAction({ action: "test-push", http: res.status, json });
        await refresh();
        setProbe(await collectProbe());
      })();
    });
  }

  function runChallengeTest() {
    startTransition(() => {
      void (async () => {
        setError(null);
        const res = await fetch(
          "/api/admin/notification-debug/challenge-test",
          { method: "POST" },
        );
        const json = await res.json().catch(() => null);
        setLastAction({ action: "challenge-test", http: res.status, json });
        await refresh();
        setProbe(await collectProbe());
      })();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary min-h-11"
          disabled={pending}
          onClick={runTestPush}
        >
          {pending ? "Gönderiliyor…" : "Push Testi Gönder"}
        </button>
        <button
          type="button"
          className="btn btn-secondary min-h-11"
          disabled={pending}
          onClick={runChallengeTest}
        >
          Challenge Event Testi
        </button>
        <button
          type="button"
          className="btn btn-secondary min-h-11"
          disabled={pending}
          onClick={() => {
            startTransition(() => {
              void (async () => {
                await refresh();
                setProbe(await collectProbe());
              })();
            });
          }}
        >
          Yenile
        </button>
        <button
          type="button"
          className="btn btn-secondary min-h-11 border-amber-500/40 text-amber-200"
          disabled={pending}
          onClick={() => {
            startTransition(() => {
              void (async () => {
                const removed = await unregisterAllServiceWorkers();
                setLastAction({
                  action: "unregister-all-sw",
                  removed,
                  tip: "Sayfa yenilenecek — sonra Got it / izin ver.",
                });
                window.location.reload();
              })();
            });
          }}
        >
          SW temizle + yenile
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <section className="card">
        <div className="card-title">OneSignal (istemci)</div>
        {probe ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Item label="SDK initialize" value={String(probe.sdkInitialized)} />
            <Item label="App ID" value={probe.appId} />
            <Item label="OneSignal User ID" value={probe.onesignalUserId ?? "—"} />
            <Item label="External User ID" value={probe.externalId ?? "—"} />
            <Item label="Subscription ID" value={probe.subscriptionId ?? "—"} />
            <Item
              label="Push Token"
              value={
                probe.pushToken
                  ? `${probe.pushToken.slice(0, 24)}…`
                  : "—"
              }
            />
            <Item label="Permission" value={probe.permission} />
            <Item label="optedIn" value={String(probe.optedIn)} />
            <Item label="Push destek" value={String(probe.pushSupported)} />
            <Item
              label="SW kayıtlı"
              value={String(probe.serviceWorkerRegistered)}
            />
            <Item label="SW scope" value={probe.serviceWorkerScope ?? "—"} />
            <Item label="SW aktif" value={String(probe.serviceWorkerActive)} />
            <Item
              label="SW script"
              value={probe.serviceWorkerScriptURL ?? "—"}
            />
            <Item label="Secure context" value={String(probe.isSecureContext)} />
            <Item label="Platform" value={probe.platform} />
            <Item label="Tarayıcı" value={probe.userAgent} />
          </dl>
        ) : (
          <p className="text-text-muted text-sm">Probe yükleniyor…</p>
        )}
        {probe ? <SwRegistrationList /> : null}
        {probe?.issues.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-300">
            {probe.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card">
        <div className="card-title">Kullanıcı (sunucu)</div>
        {data ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Item label="User ID" value={data.user.id} />
            <Item label="Organization ID" value={data.user.organizationId} />
            <Item label="External ID" value={data.user.externalId} />
            <Item
              label="OneSignal configured"
              value={String(data.onesignal.configured)}
            />
            <Item
              label="REST key"
              value={data.onesignal.restKeyPresent ? "var" : "yok"}
            />
            <Item
              label="CHALLENGE_RECEIVED push"
              value={String(data.user.challengeReceivedPush)}
            />
            <Item
              label="CHALLENGE_ACCEPTED push"
              value={String(data.user.challengeAcceptedPush)}
            />
          </dl>
        ) : (
          <p className="text-text-muted text-sm">Yükleniyor…</p>
        )}
        {data ? (
          <pre className="bg-bg-900 mt-3 max-h-48 overflow-auto rounded-lg p-3 text-xs">
            {JSON.stringify({ preferences: data.user.preferences }, null, 2)}
          </pre>
        ) : null}
      </section>

      <section className="card">
        <div className="card-title">Son API / test yanıtı</div>
        <pre className="bg-bg-900 max-h-72 overflow-auto rounded-lg p-3 text-xs">
          {lastAction ? JSON.stringify(lastAction, null, 2) : "Henüz test yok."}
        </pre>
      </section>

      <section className="card">
        <div className="card-title">Bildirim geçmişi (trace — son 50)</div>
        <div className="space-y-4">
          {(data?.traces ?? []).length === 0 ? (
            <p className="text-text-muted text-sm">Henüz trace yok.</p>
          ) : (
            data!.traces.map((t) => (
              <div
                key={t.id}
                className="border-white/10 rounded-lg border p-3 text-sm"
              >
                <div className="mb-2 flex flex-wrap gap-2 font-medium">
                  <span>{t.eventType}</span>
                  <span className="text-text-muted text-xs">{t.startedAt}</span>
                  <span
                    className={
                      t.success ? "text-emerald-400" : "text-amber-300"
                    }
                  >
                    {t.success ? "başarılı" : "eksik/başarısız"}
                  </span>
                  <span className="text-text-muted text-xs">
                    pushSent={String(t.pushSent)}
                  </span>
                </div>
                <ol className="space-y-1">
                  {t.steps.map((s, idx) => (
                    <li key={`${t.id}-${idx}`} className={statusColor(s.status)}>
                      [{s.status}] {s.name}: {s.message}
                      {s.reasonCode ? ` (${s.reasonCode})` : ""}
                    </li>
                  ))}
                </ol>
                {t.failureReasons.length > 0 ? (
                  <p className="mt-2 text-xs text-red-400">
                    Nedenler: {t.failureReasons.join(" · ")}
                  </p>
                ) : null}
                {t.onesignal ? (
                  <pre className="bg-bg-900 mt-2 max-h-40 overflow-auto rounded p-2 text-xs">
                    {JSON.stringify(t.onesignal, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-title">Event logger</div>
        <ul className="space-y-2 text-sm">
          {(data?.events ?? []).map((e) => (
            <li key={e.id} className="border-white/10 border-b pb-2">
              <span className="font-medium">{e.eventName}</span>{" "}
              <span className="text-text-muted text-xs">{e.at}</span>
              <div className="text-text-secondary text-xs">
                type={e.notificationType} · recipients=
                {e.recipientUserIds.join(", ") || "—"} · pushSent=
                {String(e.pushSent)}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="card-title">DB bildirimleri (son 20 — bu kullanıcı)</div>
        <ul className="space-y-2 text-sm">
          {(data?.recentDbNotifications ?? []).map((n) => (
            <li key={n.id}>
              {n.createdAt} · {n.type} · {n.title}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-muted text-xs">{label}</dt>
      <dd className="text-text-primary break-all">{value}</dd>
    </div>
  );
}

function SwRegistrationList() {
  const [regs, setRegs] = useState<
    Array<{ scriptURL: string; scope: string; active: boolean }>
  >([]);

  useEffect(() => {
    void listServiceWorkerRegistrations().then(setRegs);
  }, []);

  if (regs.length === 0) {
    return (
      <p className="text-text-muted mt-3 text-xs">
        Kayıtlı Service Worker yok (veya henüz yüklenmedi).
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-1 text-xs">
      {regs.map((r) => (
        <li key={`${r.scope}-${r.scriptURL}`} className="break-all">
          <span className={r.active ? "text-emerald-400" : "text-amber-300"}>
            {r.active ? "active" : "inactive"}
          </span>{" "}
          scope={r.scope} · {r.scriptURL || "(script yok)"}
        </li>
      ))}
    </ul>
  );
}

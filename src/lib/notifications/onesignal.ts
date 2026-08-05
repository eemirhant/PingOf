/**
 * OneSignal REST push provider (server-only).
 * Targets users by external_id === PingOf user.id (org isolation at call sites).
 */

import { ONESIGNAL_APP_ID } from "@/lib/onesignal/config";
import { getPublicAppUrl } from "@/lib/dev/public-url";
import { lookupOneSignalUserByExternalId } from "@/lib/notifications/diagnostics/onesignal-lookup";
import {
  appendDiagStep,
  getAlsContext,
  isNotificationDiagVerbose,
  startNotificationTrace,
  updateTrace,
} from "@/lib/notifications/diagnostics/store";
import { pushDebug, pushDebugError } from "@/lib/notifications/push-debug";

export type OneSignalPushPayload = {
  title: string;
  body: string;
  /** App-relative path e.g. /matches/xyz */
  url?: string | null;
  /** Dedup / grouping hint */
  tag?: string;
};

type OneSignalCreateResponse = {
  id?: string;
  errors?: unknown;
  recipients?: number;
};

function formatOneSignalError(
  json: OneSignalCreateResponse | null,
  text: string,
  status: number,
): string {
  if (Array.isArray(json?.errors) && json.errors.length > 0) {
    return json.errors.map(String).join(" · ").slice(0, 500);
  }
  if (json?.errors != null) {
    return JSON.stringify(json.errors).slice(0, 500);
  }
  return text.slice(0, 500) || `HTTP ${status}`;
}

function getConfig() {
  const appId =
    process.env.ONESIGNAL_APP_ID?.trim() ||
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim() ||
    ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY?.trim();
  return {
    appId: appId || null,
    apiKey: apiKey || null,
    configured: Boolean(appId && apiKey),
  };
}

export function isOneSignalConfigured(): boolean {
  return getConfig().configured;
}

export function getOneSignalPublicAppId(): string | null {
  return (
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim() || ONESIGNAL_APP_ID || null
  );
}

function toAbsoluteUrl(pathOrUrl: string | null | undefined): string {
  const fallback = "/notifications";
  const raw = (pathOrUrl ?? fallback).trim() || fallback;
  if (/^https?:\/\//i.test(raw)) return raw;

  const base = getPublicAppUrl().replace(/\/$/, "");
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return base ? `${base}${path}` : path;
}

const BATCH_SIZE = 2000;

export type SendOneSignalResult = {
  sentBatches: number;
  skipped: boolean;
  lastApi?: {
    statusCode: number;
    requestBody: unknown;
    responseBody: unknown;
    errorMessage: string | null;
    durationMs: number;
    notificationId: string | null;
  };
};

/**
 * Best-effort push via OneSignal. Never throws to callers.
 * external_id values must be PingOf user ids already filtered by prefs/org.
 */
export async function sendOneSignalPushToUsers(
  userIds: string[],
  payload: OneSignalPushPayload,
): Promise<SendOneSignalResult> {
  const unique = [...new Set(userIds.filter(Boolean))];

  pushDebug("sendOneSignalPushToUsers çağrıldı", {
    targetUserIds: unique,
    targetExternalIds: unique,
    title: payload.title,
    body: payload.body,
    url: payload.url ?? null,
    tag: payload.tag ?? null,
  });

  if (unique.length === 0) {
    pushDebug("OneSignal API isteği gönderilmedi — boş alıcı listesi", {
      skipped: true,
    });
    return { sentBatches: 0, skipped: true };
  }

  const als = getAlsContext();
  const shouldDiag = Boolean(als?.traceId) || isNotificationDiagVerbose();
  let traceId = als?.traceId;
  if (shouldDiag && !traceId) {
    traceId = startNotificationTrace({
      eventType: payload.tag ?? "ONESIGNAL_PUSH",
      title: payload.title,
      body: payload.body,
      recipientUserIds: unique,
    }).id;
  }

  const { appId, apiKey, configured } = getConfig();
  if (!configured || !appId || !apiKey) {
    pushDebug("OneSignal API isteği gönderilmedi — yapılandırma eksik", {
      hasAppId: Boolean(appId),
      hasApiKey: Boolean(apiKey),
      targetUserIds: unique,
      targetExternalIds: unique,
    });
    if (traceId) {
      appendDiagStep(traceId, {
        name: "onesignal_api_called",
        status: "fail",
        message: "OneSignal yapılandırılmamış — push atlandı",
        reasonCode: "OneSignal API hatası",
      });
    } else {
      console.warn("[onesignal] not configured — push skipped");
    }
    return { sentBatches: 0, skipped: true };
  }

  if (traceId && shouldDiag) {
    for (const externalId of unique.slice(0, 5)) {
      const lookup = await lookupOneSignalUserByExternalId(externalId);
      appendDiagStep(traceId, {
        name: "onesignal_user_lookup",
        status: lookup.found ? "ok" : "fail",
        message: lookup.found
          ? `OneSignal user bulundu (${externalId.slice(0, 8)}…)`
          : (lookup.error ?? "OneSignal user bulunamadı"),
        reasonCode: lookup.found ? undefined : "External ID eşleşmedi",
        detail: lookup,
      });

      const pushSubs = lookup.subscriptions.filter(
        (s) =>
          !s.type ||
          s.type === "ChromePush" ||
          s.type === "SafariPush" ||
          s.type === "FirefoxPush" ||
          s.type === "EdgePush" ||
          String(s.type).toLowerCase().includes("push"),
      );
      const anyEnabled = pushSubs.some((s) => s.enabled !== false && s.token);
      appendDiagStep(traceId, {
        name: "push_subscription_lookup",
        status: anyEnabled ? "ok" : "fail",
        message: anyEnabled
          ? `Push subscription bulundu (${pushSubs.length})`
          : "Push subscription bulunamadı / token yok",
        reasonCode: anyEnabled
          ? undefined
          : lookup.found
            ? "Subscription bulunamadı"
            : "External ID eşleşmedi",
        detail: { externalId, subscriptions: pushSubs },
      });
    }
  }

  const webUrl = toAbsoluteUrl(payload.url);
  let sentBatches = 0;
  let lastApi: SendOneSignalResult["lastApi"];

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const requestBody: Record<string, unknown> = {
      app_id: appId,
      target_channel: "push",
      include_aliases: {
        external_id: batch,
      },
      headings: { en: payload.title, tr: payload.title },
      contents: { en: payload.body, tr: payload.body },
      // OneSignal 400: "Remove url field when setting app_url or web_url"
      // Web-only apps must set exactly one of url | web_url — not both.
      url: webUrl,
      data: {
        url: payload.url ?? "/notifications",
        ...(payload.tag ? { tag: payload.tag } : {}),
      },
    };

    // API key lives only in Authorization header — never log it.
    pushDebug("OneSignal API isteği gönderildi", {
      httpMethod: "POST",
      url: "https://api.onesignal.com/notifications",
      targetUserIds: batch,
      targetExternalIds: batch,
      requestBody,
      authHeaderPresent: true,
      authHeaderRedacted: "Key ***",
    });

    if (traceId) {
      appendDiagStep(traceId, {
        name: "onesignal_api_called",
        status: "info",
        message: `OneSignal API çağrılıyor (${batch.length} external_id)`,
        detail: { batch },
      });
    }

    const started = Date.now();
    try {
      const res = await fetch("https://api.onesignal.com/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const durationMs = Date.now() - started;
      const text = await res.text().catch(() => "");
      let json: OneSignalCreateResponse | null = null;
      try {
        json = text ? (JSON.parse(text) as OneSignalCreateResponse) : null;
      } catch {
        json = null;
      }

      const responseBody: unknown = json ?? text;

      lastApi = {
        statusCode: res.status,
        requestBody,
        responseBody,
        errorMessage: res.ok
          ? null
          : formatOneSignalError(json, text, res.status),
        durationMs,
        notificationId: json?.id ?? null,
      };

      pushDebug("OneSignal API yanıtı alındı", {
        httpStatusCode: res.status,
        ok: res.ok,
        durationMs,
        targetUserIds: batch,
        targetExternalIds: batch,
        requestBody,
        responseBody,
        notificationId: json?.id ?? null,
        recipients: json?.recipients ?? null,
        errorMessage: lastApi.errorMessage,
      });

      if (traceId) {
        updateTrace(traceId, { onesignal: lastApi });
        appendDiagStep(traceId, {
          name: "onesignal_api_response",
          status: res.ok ? "ok" : "fail",
          message: res.ok
            ? `API ${res.status} (${durationMs}ms)`
            : `API hata ${res.status}: ${lastApi.errorMessage ?? "bilinmeyen"}`,
          reasonCode: res.ok ? undefined : "OneSignal API hatası",
          detail: lastApi,
        });
      }

      if (!res.ok) {
        console.error("[onesignal] send failed", res.status, text.slice(0, 300));
        if (traceId) {
          appendDiagStep(traceId, {
            name: "push_sent",
            status: "fail",
            message: "Push gönderilemedi",
            reasonCode: "OneSignal API hatası",
            detail: lastApi,
          });
        }
        continue;
      }

      if (!json?.id) {
        pushDebug("OneSignal notification id yok (abone yok olabilir)", {
          httpStatusCode: res.status,
          responseBody,
          targetExternalIds: batch,
        });
        console.warn(
          "[onesignal] no notification id (no subscribers?)",
          json?.errors,
        );
        if (traceId) {
          appendDiagStep(traceId, {
            name: "push_sent",
            status: "fail",
            message: "OneSignal notification id yok (abone yok olabilir)",
            reasonCode: "Subscription bulunamadı",
            detail: json,
          });
        }
      } else {
        sentBatches += 1;
        pushDebug("OneSignal push başarıyla gönderildi", {
          httpStatusCode: res.status,
          notificationId: json.id,
          recipients: json.recipients ?? null,
          targetExternalIds: batch,
        });
        if (traceId) {
          appendDiagStep(traceId, {
            name: "push_sent",
            status: "ok",
            message: `Push başarıyla gönderildi (id=${json.id})`,
            detail: { notificationId: json.id, recipients: json.recipients },
          });
          updateTrace(traceId, { pushSent: true, success: true });
        }
      }
    } catch (error) {
      const durationMs = Date.now() - started;
      pushDebugError("OneSignal network/runtime hatası", error, {
        durationMs,
        targetUserIds: batch,
        targetExternalIds: batch,
        requestBody,
        httpStatusCode: 0,
      });
      console.error("[onesignal] network error", error);
      lastApi = {
        statusCode: 0,
        requestBody,
        responseBody: null,
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs,
        notificationId: null,
      };
      if (traceId) {
        updateTrace(traceId, { onesignal: lastApi });
        appendDiagStep(traceId, {
          name: "onesignal_api_response",
          status: "fail",
          message: "OneSignal network hatası",
          reasonCode: "OneSignal API hatası",
          detail: lastApi,
        });
        appendDiagStep(traceId, {
          name: "push_sent",
          status: "fail",
          message: "Push gönderilemedi (network)",
          reasonCode: "OneSignal API hatası",
        });
      }
    }
  }

  return { sentBatches, skipped: false, lastApi };
}

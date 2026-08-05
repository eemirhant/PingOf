/**
 * Diagnostic-only OneSignal lookups (does not send push).
 */

import { ONESIGNAL_APP_ID } from "@/lib/onesignal/config";

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

export type OneSignalUserLookupResult = {
  found: boolean;
  onesignalId?: string | null;
  externalId: string;
  subscriptions: Array<{
    id?: string | null;
    type?: string | null;
    token?: string | null;
    enabled?: boolean | null;
    notificationTypes?: number | null;
  }>;
  error?: string | null;
  statusCode?: number;
};

/**
 * GET /apps/{app_id}/users/by/external_id/{external_id}
 */
export async function lookupOneSignalUserByExternalId(
  externalId: string,
): Promise<OneSignalUserLookupResult> {
  const { appId, apiKey, configured } = getConfig();
  if (!configured || !appId || !apiKey) {
    return {
      found: false,
      externalId,
      subscriptions: [],
      error: "OneSignal yapılandırılmamış",
    };
  }

  try {
    const res = await fetch(
      `https://api.onesignal.com/apps/${encodeURIComponent(appId)}/users/by/external_id/${encodeURIComponent(externalId)}`,
      {
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    if (res.status === 404) {
      return {
        found: false,
        externalId,
        subscriptions: [],
        statusCode: 404,
        error: "OneSignal user bulunamadı (external_id eşleşmedi)",
      };
    }

    const json = (await res.json().catch(() => null)) as {
      identity?: { onesignal_id?: string; external_id?: string };
      subscriptions?: Array<{
        id?: string;
        type?: string;
        token?: string;
        enabled?: boolean;
        notification_types?: number;
      }>;
      errors?: unknown;
    } | null;

    if (!res.ok) {
      return {
        found: false,
        externalId,
        subscriptions: [],
        statusCode: res.status,
        error: JSON.stringify(json?.errors ?? json).slice(0, 400),
      };
    }

    const subscriptions = (json?.subscriptions ?? []).map((s) => ({
      id: s.id ?? null,
      type: s.type ?? null,
      token: s.token ?? null,
      enabled: s.enabled ?? null,
      notificationTypes: s.notification_types ?? null,
    }));

    return {
      found: true,
      onesignalId: json?.identity?.onesignal_id ?? null,
      externalId,
      subscriptions,
      statusCode: res.status,
    };
  } catch (error) {
    return {
      found: false,
      externalId,
      subscriptions: [],
      error: error instanceof Error ? error.message : "lookup failed",
    };
  }
}

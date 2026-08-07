"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { recordNotificationOpenAction } from "@/lib/actions/notification-navigation";
import {
  NOTIFICATION_NAVIGATE_MESSAGE,
  parseNotificationDeepLink,
  toNotificationNavPath,
  type NotificationNavigateMessage,
} from "@/lib/notifications/deep-link";

export type NavigateFromNotificationOptions = {
  source?: NotificationNavigateMessage["source"];
  notificationType?: string;
  entityId?: string;
  organizationId?: string;
  challengeId?: string;
  matchId?: string;
  tournamentId?: string;
  notificationId?: string;
};

/**
 * Soft-navigate from SW / foreground notification clicks without full reload.
 * Dedupes rapid duplicate navigate messages.
 */
export function navigateFromNotificationUrl(
  rawUrl: string | undefined | null,
  options: NavigateFromNotificationOptions = {},
): void {
  if (typeof window === "undefined") return;
  const path = toNotificationNavPath(rawUrl);
  const key = `pingof-nav:${path}`;
  const now = Date.now();
  try {
    const prev = Number(sessionStorage.getItem(key) ?? "0");
    if (now - prev < 1500) return;
    sessionStorage.setItem(key, String(now));
  } catch {
    // private mode
  }

  window.dispatchEvent(
    new CustomEvent("pingof:notification-navigate", {
      detail: {
        path,
        source: options.source ?? "foreground",
        notificationType: options.notificationType,
        entityId: options.entityId,
        organizationId: options.organizationId,
        challengeId: options.challengeId,
        matchId: options.matchId,
        tournamentId: options.tournamentId,
        notificationId: options.notificationId,
      },
    }),
  );
}

type NavDetail = NavigateFromNotificationOptions & { path?: string };

/**
 * Listens for SW postMessage + custom events and runs router.push once.
 */
export function NotificationDeepLinkListener() {
  const router = useRouter();
  const lastPathRef = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    function go(path: string, meta: NavigateFromNotificationOptions = {}) {
      const now = Date.now();
      if (
        lastPathRef.current &&
        lastPathRef.current.path === path &&
        now - lastPathRef.current.at < 1500
      ) {
        return;
      }
      lastPathRef.current = { path, at: now };

      const parsed = parseNotificationDeepLink(path);
      void recordNotificationOpenAction({
        source: meta.source ?? "sw",
        url: path,
        notificationType: meta.notificationType,
        entityId: meta.entityId ?? parsed.matchId ?? parsed.challengeId,
        organizationId: meta.organizationId,
        challengeId: meta.challengeId ?? parsed.challengeId,
        matchId: meta.matchId ?? parsed.matchId,
        tournamentId: meta.tournamentId ?? parsed.tournamentId,
        notificationId: meta.notificationId ?? parsed.notificationId,
      });

      router.push(path);
    }

    function onCustom(event: Event) {
      const detail = (event as CustomEvent<NavDetail>).detail;
      if (detail?.path) {
        go(detail.path, {
          source: detail.source ?? "foreground",
          notificationType: detail.notificationType,
          entityId: detail.entityId,
          organizationId: detail.organizationId,
          challengeId: detail.challengeId,
          matchId: detail.matchId,
          tournamentId: detail.tournamentId,
          notificationId: detail.notificationId,
        });
      }
    }

    function onMessage(event: MessageEvent) {
      const data = event.data as NotificationNavigateMessage | null;
      if (!data || data.type !== NOTIFICATION_NAVIGATE_MESSAGE) return;
      const path = toNotificationNavPath(data.url);
      go(path, {
        source: data.source ?? "sw",
        notificationType: data.notificationType,
        entityId: data.entityId,
        organizationId: data.organizationId,
        challengeId: data.challengeId,
        matchId: data.matchId,
        tournamentId: data.tournamentId,
        notificationId: data.notificationId,
      });
    }

    // Landing via openWindow with entityMissing is handled by EntityMissingToast.
    window.addEventListener("pingof:notification-navigate", onCustom);
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("pingof:notification-navigate", onCustom);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [router]);

  return null;
}

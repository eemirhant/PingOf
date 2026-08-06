"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  NOTIFICATION_NAVIGATE_MESSAGE,
  type NotificationNavigateMessage,
} from "@/lib/notifications/deep-link";
import { toSafeInternalPath } from "@/lib/url/safe-path";

/**
 * Soft-navigate from SW / foreground notification clicks without full reload.
 * Dedupes rapid duplicate navigate messages.
 */
export function navigateFromNotificationUrl(rawUrl: string | undefined | null): void {
  if (typeof window === "undefined") return;
  const path = toSafeInternalPath(rawUrl, "/notifications");
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
    new CustomEvent("pingof:notification-navigate", { detail: { path } }),
  );
}

/**
 * Listens for SW postMessage + custom events and runs router.push once.
 */
export function NotificationDeepLinkListener() {
  const router = useRouter();
  const lastPathRef = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    function go(path: string) {
      const now = Date.now();
      if (
        lastPathRef.current &&
        lastPathRef.current.path === path &&
        now - lastPathRef.current.at < 1500
      ) {
        return;
      }
      lastPathRef.current = { path, at: now };
      router.push(path);
    }

    function onCustom(event: Event) {
      const detail = (event as CustomEvent<{ path?: string }>).detail;
      if (detail?.path) go(detail.path);
    }

    function onMessage(event: MessageEvent) {
      const data = event.data as NotificationNavigateMessage | null;
      if (!data || data.type !== NOTIFICATION_NAVIGATE_MESSAGE) return;
      const path = toSafeInternalPath(data.url, "/notifications");
      go(path);
    }

    window.addEventListener("pingof:notification-navigate", onCustom);
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("pingof:notification-navigate", onCustom);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [router]);

  return null;
}

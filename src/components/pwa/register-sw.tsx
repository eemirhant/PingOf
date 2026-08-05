"use client";

import { useEffect } from "react";

import { ONESIGNAL_APP_ID } from "@/lib/onesignal/config";

/**
 * Offline shell SW at root scope — only when OneSignal is not active.
 * With OneSignal configured, push uses root-scoped
 * `/OneSignalSDKWorker.js` (localhost ve Vercel Preview HTTPS dahil).
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker) return;

    // OneSignal owns root scope for push when configured.
    if (ONESIGNAL_APP_ID) return;

    const force =
      new URLSearchParams(window.location.search).get("sw") === "1" ||
      process.env.NEXT_PUBLIC_ENABLE_SW === "true";

    if (process.env.NODE_ENV !== "production" && !force) {
      try {
        if (window.localStorage.getItem("pingof-enable-sw") !== "1") return;
      } catch {
        return;
      }
    }

    let updateTimer: number | undefined;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        updateTimer = window.setInterval(() => {
          void reg.update();
        }, 60 * 60 * 1000);
      })
      .catch(() => {
        // Progressive enhancement
      });

    return () => {
      if (updateTimer != null) window.clearInterval(updateTimer);
    };
  }, []);

  return null;
}

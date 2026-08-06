"use client";

import { useEffect } from "react";

import { isFirebaseWebConfigured } from "@/lib/firebase/config";

/**
 * Offline shell SW at root scope — only when FCM is not configured.
 * With Firebase configured, `/firebase-messaging-sw.js` owns root scope for push.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker) return;

    // FCM messaging SW owns root scope when Firebase web config is present.
    if (isFirebaseWebConfigured()) return;

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

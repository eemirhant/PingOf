"use client";

import { useEffect } from "react";

/**
 * Registers the PingOf service worker in production (PRD §7.1).
 * Skips next dev to avoid stale-cache friction.
 * Opt-in during development: append ?sw=1
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const force =
      new URLSearchParams(window.location.search).get("sw") === "1";

    if (process.env.NODE_ENV !== "production" && !force) return;

    let updateTimer: number | undefined;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        updateTimer = window.setInterval(() => {
          void reg.update();
        }, 60 * 60 * 1000);
      })
      .catch(() => {
        // Progressive enhancement — ignore registration failures
      });

    return () => {
      if (updateTimer != null) window.clearInterval(updateTimer);
    };
  }, []);

  return null;
}

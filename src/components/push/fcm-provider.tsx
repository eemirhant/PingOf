"use client";

import { useEffect } from "react";

import { isFirebaseWebConfigured } from "@/lib/firebase/config";
import {
  listenForegroundMessages,
  syncWebPushToken,
} from "@/lib/firebase/messaging-client";

/**
 * After login: sync FCM token when permission already granted.
 * Foreground messages show a lightweight browser notification if permission allows.
 */
export function FcmProvider({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!isFirebaseWebConfigured()) return;

    void syncWebPushToken();

    let unsubscribe: (() => void) | undefined;
    void listenForegroundMessages(({ title, body, url }) => {
      if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
      }
      try {
        const n = new Notification(title, {
          body,
          icon: "/icons/icon-192.png",
          data: { url },
        });
        n.onclick = () => {
          window.focus();
          if (url) window.location.href = url;
          n.close();
        };
      } catch {
        // Safari / restricted contexts
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      unsubscribe?.();
    };
  }, [enabled]);

  return null;
}

"use client";

import { useEffect } from "react";

import { isFirebaseWebConfigured } from "@/lib/firebase/config";
import {
  listenForegroundMessages,
  syncWebPushToken,
} from "@/lib/firebase/messaging-client";
import { navigateFromNotificationUrl } from "@/components/notifications/notification-deep-link-listener";
import { toSafeInternalPath } from "@/lib/url/safe-path";

/**
 * After login: sync FCM token when permission already granted.
 * Foreground messages show a lightweight browser notification if permission allows.
 */
export function FcmProvider({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) {
      console.info("[fcm-register] FcmProvider: enabled=false — sync yok");
      return;
    }
    if (typeof window === "undefined") return;
    if (!isFirebaseWebConfigured()) {
      console.info(
        "[fcm-register] FcmProvider: Firebase yapılandırılmamış — sync yok",
      );
      return;
    }

    console.info("[fcm-register] FcmProvider: syncWebPushToken tetikleniyor", {
      permission:
        "Notification" in window ? Notification.permission : "no-api",
    });
    void syncWebPushToken();

    let unsubscribe: (() => void) | undefined;
    void listenForegroundMessages((payload) => {
      if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
      }
      try {
        const path = toSafeInternalPath(payload.url, "/notifications");
        const n = new Notification(payload.title, {
          body: payload.body,
          icon: "/icons/icon-192.png",
          data: {
            url: path,
            notificationType: payload.notificationType ?? "",
            entityId: payload.entityId ?? "",
            organizationId: payload.organizationId ?? "",
            challengeId: payload.challengeId ?? "",
            matchId: payload.matchId ?? "",
            tournamentId: payload.tournamentId ?? "",
          },
        });
        n.onclick = () => {
          window.focus();
          n.close();
          navigateFromNotificationUrl(path, {
            source: "foreground",
            notificationType: payload.notificationType,
            entityId: payload.entityId ?? undefined,
            organizationId: payload.organizationId ?? undefined,
            challengeId: payload.challengeId ?? undefined,
            matchId: payload.matchId ?? undefined,
            tournamentId: payload.tournamentId ?? undefined,
          });
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

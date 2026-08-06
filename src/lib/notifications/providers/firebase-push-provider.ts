import "server-only";

import type { MulticastMessage } from "firebase-admin/messaging";

import { getFirebaseMessaging } from "@/lib/firebase/admin";
import {
  listActiveTokensForUsers,
  removeInvalidTokens,
} from "@/lib/notifications/device-tokens";
import { pushLog } from "@/lib/notifications/push-log";
import {
  isFcmPayloadValidationError,
  isInvalidFcmTokenError,
  withExponentialBackoff,
} from "@/lib/notifications/providers/retry";
import type {
  PushNotificationPayload,
  PushProvider,
  PushSendResult,
} from "@/lib/notifications/providers/types";

const BATCH_SIZE = 500;

/**
 * Data-only FCM message so the service worker is the sole display path
 * (avoids duplicate OS notifications on Android Chrome PWA).
 */
function buildMulticast(
  tokens: string[],
  notification: PushNotificationPayload,
): MulticastMessage {
  const url = notification.url ?? "/notifications";
  const icon = notification.icon ?? "/icons/icon-192.png";
  const badge = notification.badge ?? "/icons/icon-192.png";
  const priority = notification.priority === "high" ? "high" : "normal";

  return {
    tokens,
    data: {
      title: notification.title,
      body: notification.body,
      url,
      icon,
      badge,
      image: notification.image ?? "",
      notificationType: notification.notificationType ?? "",
      entityId: notification.entityId ?? "",
      organizationId: notification.organizationId ?? "",
      timestamp: notification.timestamp ?? new Date().toISOString(),
      priority,
      tag: notification.tag ?? "",
    },
    webpush: {
      headers: {
        Urgency: priority === "high" ? "high" : "normal",
        TTL: "86400",
      },
      fcmOptions: {
        link: url,
      },
    },
    android: {
      priority: priority === "high" ? "high" : "normal",
    },
  };
}

export class FirebasePushProvider implements PushProvider {
  readonly name = "firebase";

  async send(
    userIds: string[],
    notification: PushNotificationPayload,
  ): Promise<PushSendResult> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return { attempted: 0, succeeded: 0, failed: 0, invalidTokensRemoved: 0 };
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      pushLog.skipped({
        reason: "firebase_admin_not_configured",
        userCount: uniqueIds.length,
      });
      return { attempted: 0, succeeded: 0, failed: 0, invalidTokensRemoved: 0 };
    }

    const devices = await listActiveTokensForUsers(uniqueIds);
    if (devices.length === 0) {
      pushLog.skipped({
        reason: "no_active_tokens",
        userCount: uniqueIds.length,
      });
      return { attempted: 0, succeeded: 0, failed: 0, invalidTokensRemoved: 0 };
    }

    let succeeded = 0;
    let failed = 0;
    const invalidTokens: string[] = [];

    for (let i = 0; i < devices.length; i += BATCH_SIZE) {
      const batch = devices.slice(i, i + BATCH_SIZE);
      const tokens = batch.map((d) => d.fcmToken);
      const multicast = buildMulticast(tokens, notification);

      try {
        const response = await withExponentialBackoff(() =>
          messaging.sendEachForMulticast(multicast),
        );

        response.responses.forEach((resp, index) => {
          if (resp.success) {
            succeeded += 1;
            return;
          }

          failed += 1;
          const error = resp.error;
          const token = batch[index]?.fcmToken;

          if (error && isInvalidFcmTokenError(error) && token) {
            invalidTokens.push(token);
            return;
          }

          if (error && isFcmPayloadValidationError(error)) {
            pushLog.failed({
              reason: "payload_validation",
              userId: batch[index]?.userId,
              error: error.message,
              code: error.code,
            });
            return;
          }

          pushLog.failed({
            userId: batch[index]?.userId,
            fcmTokenPrefix: token?.slice(0, 12) ?? null,
            error: error?.message ?? "unknown",
            code: error?.code ?? null,
          });
        });
      } catch (error) {
        failed += batch.length;
        if (isFcmPayloadValidationError(error)) {
          pushLog.failed({
            reason: "payload_validation_batch",
            error: error instanceof Error ? error.message : String(error),
          });
        } else {
          pushLog.failed({
            reason: "batch_send_failed",
            batchSize: batch.length,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const invalidTokensRemoved = await removeInvalidTokens(invalidTokens);

    return {
      attempted: devices.length,
      succeeded,
      failed,
      invalidTokensRemoved,
    };
  }
}

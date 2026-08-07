import "server-only";

import type { MulticastMessage } from "firebase-admin/messaging";

import { getFirebaseMessaging } from "@/lib/firebase/admin";
import {
  diagnoseDeviceTokensForUsers,
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

function tokenPreview(token: string): string {
  if (token.length <= 16) return `${token.slice(0, 4)}…`;
  return `${token.slice(0, 8)}…${token.slice(-8)}`;
}

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
      challengeId: notification.challengeId ?? "",
      matchId: notification.matchId ?? "",
      tournamentId: notification.tournamentId ?? "",
      notificationId: notification.notificationId ?? "",
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
      console.info("[push-diag] Target users: (empty) — push atlandı");
      return { attempted: 0, succeeded: 0, failed: 0, invalidTokensRemoved: 0 };
    }

    console.info("[push-diag] Target user(s):", uniqueIds);

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.info("[push-diag] Firebase Admin yapılandırılmamış — push atlandı");
      pushLog.skipped({
        reason: "firebase_admin_not_configured",
        userCount: uniqueIds.length,
      });
      return { attempted: 0, succeeded: 0, failed: 0, invalidTokensRemoved: 0 };
    }

    // Diagnostic query (active + inactive) — does not affect send filter.
    const diagnosed = await diagnoseDeviceTokensForUsers(uniqueIds);
    const inactive = diagnosed.filter((d) => !d.isActive);
    const activeDiagnosed = diagnosed.filter((d) => d.isActive);

    console.info("[push-diag] Device tokens found:", diagnosed.length);
    console.info(
      "[push-diag] Device tokens detail:",
      diagnosed.map((d) => ({
        userId: d.userId,
        deviceId: d.deviceId,
        platform: d.platform,
        browser: d.browser,
        isActive: d.isActive,
        lastSeenAt: d.lastSeenAt.toISOString(),
        tokenLength: d.tokenLength,
        tokenPreview: d.tokenPreview,
      })),
    );

    if (inactive.length > 0) {
      console.info(
        "[push-diag] isActive=false nedeniyle filtrelenen cihazlar:",
        inactive.map((d) => ({
          userId: d.userId,
          deviceId: d.deviceId,
          platform: d.platform,
          lastSeenAt: d.lastSeenAt.toISOString(),
          tokenPreview: d.tokenPreview,
        })),
      );
    }

    const devices = await listActiveTokensForUsers(uniqueIds);
    if (devices.length === 0) {
      const reason =
        diagnosed.length === 0
          ? "Bu kullanıcı(lar) için DeviceToken kaydı yok (hiç kayıt edilmemiş veya silinmiş)"
          : inactive.length === diagnosed.length
            ? "Tüm DeviceToken kayıtları isActive=false (logout veya manuel deaktif)"
            : "Aktif token yok (beklenmeyen durum)";

      console.info("[push-diag] Aktif token yok — push atlandı. Sebep:", reason, {
        targetUserIds: uniqueIds,
        totalRows: diagnosed.length,
        inactiveCount: inactive.length,
        activeDiagnosedCount: activeDiagnosed.length,
      });

      pushLog.skipped({
        reason: "no_active_tokens",
        userCount: uniqueIds.length,
        detail: reason,
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

      console.info("[push-diag] sendEachForMulticast öncesi token listesi:", {
        batchIndex: Math.floor(i / BATCH_SIZE),
        count: tokens.length,
        tokens: batch.map((d) => ({
          userId: d.userId,
          tokenPreview: tokenPreview(d.fcmToken),
        })),
        notificationType: notification.notificationType ?? null,
        title: notification.title,
      });

      try {
        const response = await withExponentialBackoff(() =>
          messaging.sendEachForMulticast(multicast),
        );

        console.info("[push-diag] Firebase multicast response:", {
          successCount: response.successCount,
          failureCount: response.failureCount,
        });

        response.responses.forEach((resp, index) => {
          if (resp.success) {
            succeeded += 1;
            return;
          }

          failed += 1;
          const error = resp.error;
          const token = batch[index]?.fcmToken;

          console.info("[push-diag] Başarısız token:", {
            userId: batch[index]?.userId ?? null,
            tokenPreview: token ? tokenPreview(token) : null,
            error_code: error?.code ?? null,
            error_message: error?.message ?? null,
          });

          if (error && isInvalidFcmTokenError(error) && token) {
            console.info(
              "[push-diag] Invalid token — DB'den silinecek:",
              tokenPreview(token),
              { code: error.code, message: error.message },
            );
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
        console.error("[push-diag] sendEachForMulticast batch exception:", {
          batchSize: batch.length,
          error: error instanceof Error ? error.message : String(error),
        });
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

    if (invalidTokens.length > 0) {
      console.info("[push-diag] Invalid token silme başlıyor:", {
        count: invalidTokens.length,
        previews: invalidTokens.map(tokenPreview),
      });
    }

    const invalidTokensRemoved = await removeInvalidTokens(invalidTokens);

    if (invalidTokensRemoved > 0) {
      console.info("[push-diag] Invalid token DB'den silindi:", {
        removed: invalidTokensRemoved,
      });
    }

    console.info("[push-diag] Push gönderim özeti:", {
      attempted: devices.length,
      succeeded,
      failed,
      invalidTokensRemoved,
    });

    return {
      attempted: devices.length,
      succeeded,
      failed,
      invalidTokensRemoved,
    };
  }
}

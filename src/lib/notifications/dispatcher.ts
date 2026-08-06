import "server-only";

import { getPushProvider } from "@/lib/notifications/providers";
import type { PushNotificationPayload } from "@/lib/notifications/providers/types";
import { pushLog } from "@/lib/notifications/push-log";

/**
 * Thin dispatcher: only invokes the configured PushProvider.
 * Does not check preferences or write to the database.
 */
export class NotificationDispatcher {
  async dispatch(
    userIds: string[],
    notification: PushNotificationPayload,
  ): Promise<{
    sentBatches: number;
    skipped: boolean;
    succeeded: number;
    failed: number;
  }> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return { sentBatches: 0, skipped: true, succeeded: 0, failed: 0 };
    }

    const provider = getPushProvider();
    if (!provider) {
      pushLog.skipped({
        reason: "no_push_provider",
        userCount: uniqueIds.length,
      });
      return { sentBatches: 0, skipped: true, succeeded: 0, failed: 0 };
    }

    pushLog.requested({
      provider: provider.name,
      userCount: uniqueIds.length,
      notificationType: notification.notificationType ?? null,
      title: notification.title,
    });

    try {
      const result = await provider.send(uniqueIds, notification);
      pushLog.sent({
        provider: provider.name,
        attempted: result.attempted,
        succeeded: result.succeeded,
        failed: result.failed,
        invalidTokensRemoved: result.invalidTokensRemoved,
      });
      return {
        sentBatches: result.succeeded > 0 ? 1 : 0,
        skipped: result.attempted === 0,
        succeeded: result.succeeded,
        failed: result.failed,
      };
    } catch (error) {
      pushLog.failed({
        provider: provider.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return { sentBatches: 0, skipped: false, succeeded: 0, failed: 1 };
    }
  }
}

export const notificationDispatcher = new NotificationDispatcher();

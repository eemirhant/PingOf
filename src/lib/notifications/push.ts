import "server-only";

import { notificationDispatcher } from "@/lib/notifications/dispatcher";
import type { PushNotificationPayload } from "@/lib/notifications/providers/types";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  image?: string;
  notificationType?: string;
  entityId?: string | null;
  organizationId?: string | null;
  challengeId?: string | null;
  matchId?: string | null;
  tournamentId?: string | null;
  timestamp?: string;
  priority?: "normal" | "high";
};

export type SendPushResult = {
  sentBatches: number;
  skipped: boolean;
  succeeded?: number;
  failed?: number;
};

/**
 * Best-effort push delivery entry point used by createNotificationsForUsers.
 * Never throws. Delegates to NotificationDispatcher → PushProvider (FCM).
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<SendPushResult> {
  if (userIds.length === 0) {
    return { sentBatches: 0, skipped: true };
  }

  const notification: PushNotificationPayload = {
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
    icon: payload.icon ?? "/icons/icon-192.png",
    badge: payload.badge ?? "/icons/icon-192.png",
    image: payload.image,
    notificationType: payload.notificationType,
    entityId: payload.entityId ?? null,
    organizationId: payload.organizationId ?? null,
    challengeId: payload.challengeId ?? null,
    matchId: payload.matchId ?? null,
    tournamentId: payload.tournamentId ?? null,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    priority: payload.priority ?? "high",
  };

  try {
    const result = await notificationDispatcher.dispatch(userIds, notification);
    return {
      sentBatches: result.sentBatches,
      skipped: result.skipped,
      succeeded: result.succeeded,
      failed: result.failed,
    };
  } catch {
    return { sentBatches: 0, skipped: false, succeeded: 0, failed: 1 };
  }
}

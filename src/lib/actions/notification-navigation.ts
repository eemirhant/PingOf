"use server";

import { auth } from "@/auth";
import { pushLog } from "@/lib/notifications/push-log";
import { markUnreadNotificationsFromDeepLink } from "@/lib/notifications/service";

export type RecordNotificationOpenInput = {
  source: "push" | "foreground" | "in_app" | "sw";
  url?: string | null;
  notificationType?: string | null;
  entityId?: string | null;
  organizationId?: string | null;
  challengeId?: string | null;
  matchId?: string | null;
  tournamentId?: string | null;
  notificationId?: string | null;
};

/**
 * Client-callable: mark matching notifications read + structured open logs.
 * Never throws to the client — deep link navigation must not fail.
 */
export async function recordNotificationOpenAction(
  input: RecordNotificationOpenInput,
): Promise<{ marked: number }> {
  try {
    const session = await auth();
    if (!session?.user) {
      pushLog.deepLinkFailed({
        reason: "unauthenticated",
        source: input.source,
        url: input.url,
      });
      return { marked: 0 };
    }

    if (input.source === "push" || input.source === "sw") {
      pushLog.opened({
        userId: session.user.id,
        notificationType: input.notificationType,
        entityId: input.entityId,
        url: input.url,
        source: input.source,
      });
    }

    pushLog.notificationClicked({
      userId: session.user.id,
      notificationType: input.notificationType,
      entityId: input.entityId,
      url: input.url,
      source: input.source,
    });

    const marked = await markUnreadNotificationsFromDeepLink(session.user.id, {
      notificationId: input.notificationId,
      notificationType: input.notificationType,
      entityId: input.entityId,
      challengeId: input.challengeId,
      matchId: input.matchId,
      tournamentId: input.tournamentId,
    });

    if (marked > 0) {
      pushLog.markRead({
        userId: session.user.id,
        marked,
        notificationType: input.notificationType,
        entityId: input.entityId,
        source: input.source,
      });
    }

    pushLog.navigation({
      userId: session.user.id,
      url: input.url,
      notificationType: input.notificationType,
      entityId: input.entityId,
      source: input.source,
      marked,
    });

    return { marked };
  } catch (error) {
    pushLog.deepLinkFailed({
      reason: error instanceof Error ? error.message : "unknown",
      source: input.source,
      url: input.url,
    });
    return { marked: 0 };
  }
}

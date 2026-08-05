import { NextResponse } from "next/server";

import { NotificationType } from "@/domain/notification";
import { createNotificationsForUsers } from "@/lib/notifications/create";
import { requireNotificationDebugAccess } from "@/lib/notifications/diagnostics/access";
import {
  appendDiagStep,
  getAlsContext,
  getTrace,
  recordDiagEvent,
  runWithNotificationTrace,
  updateTrace,
} from "@/lib/notifications/diagnostics/store";

/**
 * Exercises the real createNotificationsForUsers chain as CHALLENGE_ACCEPTED
 * for the current user (does not create a Challenge row).
 */
export async function POST() {
  const access = await requireNotificationDebugAccess();
  if (!access.ok) return access.response;

  const title = "Meydan okuma kabul edildi (tanılama)";
  const body =
    "Challenge Event Testi: CHALLENGE_ACCEPTED → prefs → DB → OneSignal → Push";

  const { result: count, traceId } = await runWithNotificationTrace(
    {
      eventType: NotificationType.CHALLENGE_ACCEPTED,
      title,
      body,
      recipientUserIds: [access.userId],
      organizationId: access.organizationId,
      senderUserId: access.userId,
      awaitPush: true,
    },
    async () => {
      const tid = getAlsContext()?.traceId;
      if (tid) {
        appendDiagStep(tid, {
          name: "event_created",
          status: "ok",
          message: "ChallengeAccepted event (tanılama)",
          detail: {
            event: "ChallengeAccepted",
            senderUserId: access.userId,
            recipientUserId: access.userId,
            organizationId: access.organizationId,
          },
        });
        recordDiagEvent({
          eventName: "ChallengeAccepted",
          notificationType: NotificationType.CHALLENGE_ACCEPTED,
          senderUserId: access.userId,
          recipientUserIds: [access.userId],
          organizationId: access.organizationId,
          pushSent: null,
          traceId: tid,
        });
      }

      return createNotificationsForUsers({
        userIds: [access.userId],
        type: NotificationType.CHALLENGE_ACCEPTED,
        title,
        body,
        linkUrl: "/challenges",
      });
    },
  );

  const trace = getTrace(traceId);
  updateTrace(traceId, {
    success: Boolean(trace?.pushSent || count > 0),
  });

  return NextResponse.json({
    ok: true,
    dbNotificationCount: count,
    trace: getTrace(traceId) ?? null,
  });
}

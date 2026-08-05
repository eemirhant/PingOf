import { NextResponse } from "next/server";

import { requireNotificationDebugAccess } from "@/lib/notifications/diagnostics/access";
import {
  appendDiagStep,
  getAlsContext,
  getTrace,
  runWithNotificationTrace,
  updateTrace,
} from "@/lib/notifications/diagnostics/store";
import { sendOneSignalPushToUsers } from "@/lib/notifications/onesignal";

export async function POST() {
  const access = await requireNotificationDebugAccess();
  if (!access.ok) return access.response;

  const { result, traceId } = await runWithNotificationTrace(
    {
      eventType: "DEBUG_PUSH_TEST",
      title: "PingOf Push Testi",
      body: "Bu bir tanılama test bildirimidir.",
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
          message: "Push Testi Gönder tetiklendi",
        });
      }
      return sendOneSignalPushToUsers([access.userId], {
        title: "PingOf Push Testi",
        body: "Bu bir tanılama test bildirimidir.",
        url: "/admin/notification-debug",
        tag: "pingof-debug-push-test",
      });
    },
  );

  updateTrace(traceId, {
    pushSent: result.sentBatches > 0 && !result.skipped,
    success: result.sentBatches > 0 && !result.skipped,
  });

  return NextResponse.json({
    ok: result.sentBatches > 0 && !result.skipped,
    send: result,
    trace: getTrace(traceId) ?? null,
  });
}

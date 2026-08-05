import { NextResponse } from "next/server";

import { NotificationType } from "@/domain/notification";
import { prisma } from "@/lib/db";
import { ONESIGNAL_APP_ID } from "@/lib/onesignal/config";
import { requireNotificationDebugAccess } from "@/lib/notifications/diagnostics/access";
import {
  getClientReports,
  getRecentEvents,
  getRecentTraces,
} from "@/lib/notifications/diagnostics/store";
import { isOneSignalConfigured } from "@/lib/notifications/onesignal";
import { getResolvedNotificationSettings } from "@/lib/notifications/preferences";

export const runtime = "nodejs";

export async function GET() {
  console.log("[Runtime Info]", {
    runtime: process.env.NEXT_RUNTIME,
    nodeEnv: process.env.NODE_ENV,
    apiKeyExists: !!process.env.ONESIGNAL_REST_API_KEY,
  });

  const access = await requireNotificationDebugAccess();
  if (!access.ok) return access.response;

  const [settings, recentDb] = await Promise.all([
    getResolvedNotificationSettings(access.userId),
    prisma.notification.findMany({
      where: { userId: access.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        createdAt: true,
        isRead: true,
        linkUrl: true,
      },
    }),
  ]);

  const traces = getRecentTraces(50);
  const events = getRecentEvents(50);
  const clientReports = getClientReports().filter(
    (r) => r.userId === access.userId || r.organizationId === access.organizationId,
  );

  return NextResponse.json({
    env: process.env.NODE_ENV,
    onesignal: {
      configured: isOneSignalConfigured(),
      appId: ONESIGNAL_APP_ID,
      restKeyPresent: Boolean(process.env.ONESIGNAL_REST_API_KEY?.trim()),
    },
    user: {
      id: access.userId,
      organizationId: access.organizationId,
      role: access.role,
      externalId: access.userId,
      preferences: settings.preferences,
      challengeReceivedPush:
        settings.preferences[NotificationType.CHALLENGE_RECEIVED]?.push ?? null,
      challengeAcceptedPush:
        settings.preferences[NotificationType.CHALLENGE_ACCEPTED]?.push ?? null,
    },
    traces,
    events,
    clientReports,
    recentDbNotifications: recentDb.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

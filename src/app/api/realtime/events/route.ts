import { ChallengeStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { RealtimeEventsResponse } from "@/lib/realtime/types";

/**
 * GET /api/realtime/events?since=<iso>
 * Org-scoped poll feed for visibility-aware client sync.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const { organizationId, id: userId } = session.user;
  const { searchParams } = new URL(request.url);
  const sinceRaw = searchParams.get("since");

  let since: Date | null = null;
  if (sinceRaw) {
    const parsed = new Date(sinceRaw);
    if (!Number.isNaN(parsed.getTime())) {
      since = parsed;
    }
  }

  const [events, unreadNotifications, pendingChallenges] = await Promise.all([
    prisma.orgRealtimeEvent.findMany({
      where: {
        organizationId,
        ...(since ? { createdAt: { gt: since } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        type: true,
        entityId: true,
        actorUserId: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
    prisma.challenge.count({
      where: {
        organizationId,
        toUserId: userId,
        status: ChallengeStatus.PENDING,
      },
    }),
  ]);

  const body: RealtimeEventsResponse = {
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      entityId: e.entityId,
      actorUserId: e.actorUserId,
      createdAt: e.createdAt.toISOString(),
    })),
    unreadNotifications,
    pendingChallenges,
    serverTime: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

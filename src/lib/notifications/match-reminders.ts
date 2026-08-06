import { MatchStatus } from "@prisma/client";

import { NotificationType } from "@/domain/notification";
import {
  canCreateMatchTimeReminder,
  createNotificationsForUsers,
} from "@/lib/notifications/create";
import { prisma } from "@/lib/db";
import { withOrgScope } from "@/lib/org-scope";

const REMINDER_WINDOW_MS = 30 * 60 * 1000;
const REMINDER_SLACK_MS = 5 * 60 * 1000;

/**
 * Sends MATCH_REMINDER for org matches starting in ~30 minutes.
 * Intended for a cron/Vercel scheduled job — preference filtering happens in create.
 * Dedupes via a short-lived note in OrgRealtimeEvent is overkill; we use
 * linkUrl+type recent check per user is expensive — instead only matches in window.
 */
export async function sendMatchRemindersForOrganization(
  organizationId: string,
  now: Date = new Date(),
): Promise<number> {
  const windowStart = new Date(now.getTime() + REMINDER_WINDOW_MS - REMINDER_SLACK_MS);
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS + REMINDER_SLACK_MS);

  const matches = await prisma.match.findMany({
    where: withOrgScope(organizationId, {
      status: { in: [MatchStatus.PLANNED, MatchStatus.PENDING] },
      scheduledAt: { gte: windowStart, lte: windowEnd },
    }),
    include: {
      participants: { select: { userId: true } },
    },
  });

  let sent = 0;
  for (const match of matches) {
    if (!canCreateMatchTimeReminder(match.scheduledAt)) continue;

    // Skip if a reminder was already created for this match in the last hour
    const recent = await prisma.notification.findFirst({
      where: {
        type: NotificationType.MATCH_REMINDER,
        linkUrl: `/matches/${match.id}`,
        createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (recent) continue;

    const userIds = match.participants.map((p) => p.userId);
    const count = await createNotificationsForUsers({
      userIds,
      type: NotificationType.MATCH_REMINDER,
      title: "Maç hatırlatması",
      body: "Maçına yaklaşık 30 dakika kaldı.",
      linkUrl: `/matches/${match.id}`,
      matchId: match.id,
      entityId: match.id,
      organizationId,
    });
    sent += count;
  }

  return sent;
}

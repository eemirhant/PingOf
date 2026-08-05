import { findPlayerRank } from "@/domain/leaderboard";
import { NotificationType } from "@/domain/notification";
import { computePlayerStats } from "@/domain/player-stats";
import { createNotificationsForUsers } from "@/lib/notifications/create";
import { loadCompletedMatchesForOrg } from "@/lib/stats/service";
import { prisma } from "@/lib/db";
import { withOrgScope } from "@/lib/org-scope";

async function loadPlayerInputs(organizationId: string) {
  return prisma.user.findMany({
    where: withOrgScope(organizationId),
    select: { id: true, fullName: true },
  });
}

export async function snapshotPlayerRanks(
  organizationId: string,
  userIds: string[],
): Promise<Map<string, number | null>> {
  const unique = [...new Set(userIds)];
  const [matches, players] = await Promise.all([
    loadCompletedMatchesForOrg(organizationId),
    loadPlayerInputs(organizationId),
  ]);
  const map = new Map<string, number | null>();
  for (const userId of unique) {
    map.set(userId, findPlayerRank(userId, players, matches));
  }
  return map;
}

/**
 * Emit leaderboard preference-gated notifications after a completed match.
 * Defaults are OFF — only users who opt in receive these.
 */
export async function notifyLeaderboardAfterMatch(
  organizationId: string,
  participantUserIds: string[],
  previousRanks: Map<string, number | null>,
): Promise<void> {
  const unique = [...new Set(participantUserIds)];
  if (unique.length === 0) return;

  const [matches, players] = await Promise.all([
    loadCompletedMatchesForOrg(organizationId),
    loadPlayerInputs(organizationId),
  ]);

  for (const userId of unique) {
    const before = previousRanks.get(userId) ?? null;
    const after = findPlayerRank(userId, players, matches);
    const stats = computePlayerStats(userId, matches);

    if (after != null && before != null && after > before) {
      await createNotificationsForUsers({
        userIds: [userId],
        type: NotificationType.LEADERBOARD_OVERTAKEN,
        title: "Sıralamada geriledin",
        body: `Sıralaman #${before} → #${after} oldu.`,
        linkUrl: "/leaderboard",
      });
    } else if (before !== after && after != null) {
      await createNotificationsForUsers({
        userIds: [userId],
        type: NotificationType.LEADERBOARD_RANK_CHANGED,
        title: "Sıralaman değişti",
        body:
          before == null
            ? `Sıralamaya #${after} oldun.`
            : `Sıralaman #${before} → #${after} oldu.`,
        linkUrl: "/leaderboard",
      });
    }

    if (after != null && after <= 3 && (before == null || before > 3)) {
      await createNotificationsForUsers({
        userIds: [userId],
        type: NotificationType.LEADERBOARD_TOP3,
        title: "İlk 3'e girdin",
        body: `Tebrikler! Sıralamada #${after} oldun.`,
        linkUrl: "/leaderboard",
      });
    }

    if (
      stats.currentStreak?.type === "W" &&
      stats.currentStreak.count >= 3 &&
      stats.currentStreak.count % 3 === 0
    ) {
      await createNotificationsForUsers({
        userIds: [userId],
        type: NotificationType.LEADERBOARD_STREAK,
        title: "Galibiyet serisi",
        body: `${stats.currentStreak.count} maçlık galibiyet serisi oluşturdun.`,
        linkUrl: `/players/${userId}`,
      });
    }
  }
}

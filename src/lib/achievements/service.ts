import { MatchStatus, TournamentStatus, TournamentType } from "@prisma/client";

import {
  evaluateAchievements,
  type AchievementProgress,
  type TournamentAchievementHint,
} from "@/domain/achievements";
import type { StatsMatch } from "@/domain/player-stats";
import { prisma } from "@/lib/db";
import { withOrgScope } from "@/lib/org-scope";
import { loadCompletedMatchesForOrg } from "@/lib/stats/service";

/**
 * Lightweight tournament snapshot for achievement evaluation (read-only).
 */
export async function loadTournamentAchievementHints(
  organizationId: string,
): Promise<TournamentAchievementHint[]> {
  const tournaments = await prisma.tournament.findMany({
    where: withOrgScope(organizationId, {
      status: { not: TournamentStatus.CANCELLED },
    }),
    select: {
      id: true,
      type: true,
      status: true,
      participants: { select: { userId: true } },
      matches: {
        where: { status: MatchStatus.COMPLETED },
        select: {
          tournamentRound: true,
          bracketSlot: true,
          winnerTeam: true,
          participants: { select: { userId: true, team: true } },
        },
      },
    },
  });

  return tournaments.map((t) => {
    const participantUserIds = t.participants.map((p) => p.userId);
    const recordMap = new Map<
      string,
      { userId: string; played: number; wins: number; losses: number }
    >();

    const bump = (userId: string, won: boolean) => {
      const cur = recordMap.get(userId) ?? {
        userId,
        played: 0,
        wins: 0,
        losses: 0,
      };
      cur.played += 1;
      if (won) cur.wins += 1;
      else cur.losses += 1;
      recordMap.set(userId, cur);
    };

    for (const match of t.matches) {
      if (match.winnerTeam !== 1 && match.winnerTeam !== 2) continue;
      for (const p of match.participants) {
        bump(p.userId, p.team === match.winnerTeam);
      }
    }

    let championUserIds: string[] = [];

    if (t.status === TournamentStatus.COMPLETED) {
      if (t.type === TournamentType.KNOCKOUT) {
        const maxRound = t.matches.reduce(
          (max, m) => Math.max(max, m.tournamentRound ?? 0),
          0,
        );
        const finals = t.matches.filter(
          (m) =>
            maxRound > 0 &&
            m.tournamentRound === maxRound &&
            m.winnerTeam != null,
        );
        const final =
          finals.find((m) => m.bracketSlot != null) ?? finals[0] ?? null;
        if (final && final.winnerTeam != null) {
          championUserIds = final.participants
            .filter((p) => p.team === final.winnerTeam)
            .map((p) => p.userId);
        }
      } else {
        // Round-robin: highest win count among players who competed.
        let bestWins = -1;
        for (const rec of recordMap.values()) {
          if (rec.wins > bestWins) bestWins = rec.wins;
        }
        if (bestWins > 0) {
          championUserIds = [...recordMap.values()]
            .filter((r) => r.wins === bestWins)
            .map((r) => r.userId);
        }
      }
    }

    return {
      id: t.id,
      type: t.type === TournamentType.KNOCKOUT ? "KNOCKOUT" : "ROUND_ROBIN",
      status: t.status as TournamentAchievementHint["status"],
      participantUserIds,
      championUserIds,
      playerRecords: [...recordMap.values()],
    };
  });
}

/** Compute achievements once per request (pass matches to avoid double DB load). */
export async function getPlayerAchievements(
  organizationId: string,
  playerId: string,
  matches?: StatsMatch[],
): Promise<AchievementProgress[]> {
  const [orgMatches, tournaments] = await Promise.all([
    matches
      ? Promise.resolve(matches)
      : loadCompletedMatchesForOrg(organizationId),
    loadTournamentAchievementHints(organizationId),
  ]);

  return evaluateAchievements(playerId, orgMatches, tournaments);
}

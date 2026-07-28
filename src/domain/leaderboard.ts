/**
 * Leaderboard ranking domain (PRD US-15 / KK-15).
 * Pure functions — no UI / Prisma / React dependencies.
 */

import { MIN_MATCHES_FOR_RANKING } from "@/domain/constants";
import {
  computeRecordForFormat,
  type LeaderboardFormatFilter,
  type StatsMatch,
} from "@/domain/player-stats";

export type LeaderboardPlayerInput = {
  id: string;
  fullName: string;
};

export type LeaderboardEntry = {
  userId: string;
  fullName: string;
  played: number;
  wins: number;
  losses: number;
  winRate: number;
  setAverage: number;
  pointAverage: number;
  rank: number | null; // null if unranked
};

export type LeaderboardResult = {
  ranked: LeaderboardEntry[];
  unranked: LeaderboardEntry[];
};

function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (b.wins !== a.wins) return b.wins - a.wins;
  if (b.winRate !== a.winRate) return b.winRate - a.winRate;
  if (b.setAverage !== a.setAverage) return b.setAverage - a.setAverage;
  if (b.pointAverage !== a.pointAverage) return b.pointAverage - a.pointAverage;
  return a.fullName.localeCompare(b.fullName, "tr");
}

/**
 * Rank players for an organization.
 * Tie-break: wins → win% → set average → point average → alphabetical.
 * Players with fewer than MIN_MATCHES_FOR_RANKING go to unranked.
 */
export function calculateLeaderboard(
  players: LeaderboardPlayerInput[],
  matches: StatsMatch[],
  formatFilter: LeaderboardFormatFilter = "ALL",
): LeaderboardResult {
  const entries: LeaderboardEntry[] = players.map((player) => {
    const record = computeRecordForFormat(player.id, matches, formatFilter);
    return {
      userId: player.id,
      fullName: player.fullName,
      played: record.played,
      wins: record.wins,
      losses: record.losses,
      winRate: record.winRate,
      setAverage: record.setAverage,
      pointAverage: record.pointAverage,
      rank: null,
    };
  });

  const rankedPool = entries
    .filter((e) => e.played >= MIN_MATCHES_FOR_RANKING)
    .sort(compareEntries);

  const unranked = entries
    .filter((e) => e.played < MIN_MATCHES_FOR_RANKING)
    .sort((a, b) => {
      if (b.played !== a.played) return b.played - a.played;
      return a.fullName.localeCompare(b.fullName, "tr");
    });

  const ranked = rankedPool.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  return { ranked, unranked };
}

/** 1-based rank in ALL-format leaderboard, or null if unranked / not found. */
export function findPlayerRank(
  playerId: string,
  players: LeaderboardPlayerInput[],
  matches: StatsMatch[],
): number | null {
  const { ranked } = calculateLeaderboard(players, matches, "ALL");
  return ranked.find((e) => e.userId === playerId)?.rank ?? null;
}

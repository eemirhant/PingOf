import { MatchStatus } from "@prisma/client";

import { calculateLeaderboard, findPlayerRank } from "@/domain/leaderboard";
import {
  computePlayerStats,
  type LeaderboardFormatFilter,
  type MatchHistoryRow,
  type PlayerStats,
  type StatsMatch,
} from "@/domain/player-stats";
import { prisma } from "@/lib/db";
import { withOrgScope } from "@/lib/org-scope";

export type ProfileHistoryFilters = {
  format?: LeaderboardFormatFilter;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  page?: number;
  pageSize?: number;
};

function toStatsMatch(match: {
  id: string;
  format: "SINGLES" | "DOUBLES";
  playedAt: Date | null;
  winnerTeam: number | null;
  team1SetsWon: number | null;
  team2SetsWon: number | null;
  tournamentId?: string | null;
  participants: Array<{
    userId: string;
    team: number;
    user: { fullName: string };
  }>;
  sets: Array<{ team1Score: number; team2Score: number }>;
}): StatsMatch | null {
  if (match.winnerTeam !== 1 && match.winnerTeam !== 2) return null;
  if (match.team1SetsWon == null || match.team2SetsWon == null) return null;

  return {
    id: match.id,
    format: match.format,
    playedAt: match.playedAt,
    winnerTeam: match.winnerTeam,
    team1SetsWon: match.team1SetsWon,
    team2SetsWon: match.team2SetsWon,
    tournamentId: match.tournamentId ?? null,
    participants: match.participants.map((p) => ({
      userId: p.userId,
      team: p.team === 1 ? 1 : 2,
      fullName: p.user.fullName,
    })),
    sets: match.sets.map((s) => ({
      team1Score: s.team1Score,
      team2Score: s.team2Score,
    })),
  };
}

export async function loadCompletedMatchesForOrg(
  organizationId: string,
): Promise<StatsMatch[]> {
  const rows = await prisma.match.findMany({
    where: withOrgScope(organizationId, { status: MatchStatus.COMPLETED }),
    orderBy: [{ playedAt: "desc" }, { updatedAt: "desc" }],
    include: {
      participants: {
        include: {
          user: { select: { fullName: true } },
        },
      },
      sets: {
        orderBy: { setNumber: "asc" },
      },
    },
  });

  return rows
    .map((row) =>
      toStatsMatch({
        id: row.id,
        format: row.format,
        playedAt: row.playedAt,
        winnerTeam: row.winnerTeam,
        team1SetsWon: row.team1SetsWon,
        team2SetsWon: row.team2SetsWon,
        tournamentId: row.tournamentId,
        participants: row.participants,
        sets: row.sets,
      }),
    )
    .filter((m): m is StatsMatch => m !== null);
}

async function loadOrgPlayers(organizationId: string) {
  return prisma.user.findMany({
    where: withOrgScope(organizationId),
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
}

function parseDayStart(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const d = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDayEnd(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const d = new Date(`${isoDate}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function filterHistory(
  history: MatchHistoryRow[],
  filters: ProfileHistoryFilters,
): MatchHistoryRow[] {
  let rows = history;

  if (filters.format && filters.format !== "ALL") {
    rows = rows.filter((r) => r.format === filters.format);
  }

  if (filters.from) {
    const from = parseDayStart(filters.from);
    if (from) {
      rows = rows.filter((r) => r.playedAt && r.playedAt >= from);
    }
  }

  if (filters.to) {
    const to = parseDayEnd(filters.to);
    if (to) {
      rows = rows.filter((r) => r.playedAt && r.playedAt <= to);
    }
  }

  return rows;
}

export type PlayerProfilePayload = {
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    createdAt: Date;
  };
  stats: PlayerStats;
  rank: number | null;
  history: {
    rows: MatchHistoryRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

export async function getPlayerProfileStats(
  organizationId: string,
  playerId: string,
  filters: ProfileHistoryFilters = {},
): Promise<PlayerProfilePayload | null> {
  const user = await prisma.user.findFirst({
    where: withOrgScope(organizationId, { id: playerId }),
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  const [matches, players] = await Promise.all([
    loadCompletedMatchesForOrg(organizationId),
    loadOrgPlayers(organizationId),
  ]);

  const stats = computePlayerStats(playerId, matches);
  const rank = findPlayerRank(
    playerId,
    players.map((p) => ({ id: p.id, fullName: p.fullName })),
    matches,
  );

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const filtered = filterHistory(stats.matchHistory, filters);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  return {
    user,
    stats,
    rank,
    history: {
      rows,
      total,
      page,
      pageSize,
      totalPages,
    },
  };
}

export async function getLeaderboard(
  organizationId: string,
  tab: LeaderboardFormatFilter = "ALL",
) {
  const [matches, players] = await Promise.all([
    loadCompletedMatchesForOrg(organizationId),
    loadOrgPlayers(organizationId),
  ]);

  const board = calculateLeaderboard(
    players.map((p) => ({ id: p.id, fullName: p.fullName })),
    matches,
    tab,
  );

  const avatarById = new Map(players.map((p) => [p.id, p.avatarUrl]));

  return {
    ranked: board.ranked.map((e) => ({
      ...e,
      avatarUrl: avatarById.get(e.userId) ?? null,
    })),
    unranked: board.unranked.map((e) => ({
      ...e,
      avatarUrl: avatarById.get(e.userId) ?? null,
    })),
  };
}

export async function getDashboardStatsSnippet(
  organizationId: string,
  userId: string,
) {
  const [matches, players] = await Promise.all([
    loadCompletedMatchesForOrg(organizationId),
    loadOrgPlayers(organizationId),
  ]);

  const playerInputs = players.map((p) => ({ id: p.id, fullName: p.fullName }));
  const stats = computePlayerStats(userId, matches);
  const rank = findPlayerRank(userId, playerInputs, matches);
  const board = calculateLeaderboard(playerInputs, matches, "ALL");
  const avatarById = new Map(players.map((p) => [p.id, p.avatarUrl]));

  return {
    overall: stats.overall,
    recentForm: stats.recentForm,
    currentStreak: stats.currentStreak,
    rank,
    top5: board.ranked.slice(0, 5).map((e) => ({
      ...e,
      avatarUrl: avatarById.get(e.userId) ?? null,
    })),
  };
}

export function parseLeaderboardTab(
  value: string | undefined,
): LeaderboardFormatFilter {
  if (value === "singles" || value === "SINGLES") return "SINGLES";
  if (value === "doubles" || value === "DOUBLES") return "DOUBLES";
  return "ALL";
}

export function parseHistoryFormat(
  value: string | undefined,
): LeaderboardFormatFilter {
  return parseLeaderboardTab(value);
}

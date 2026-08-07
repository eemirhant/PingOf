/**
 * Achievement (badge) system — pure evaluation from existing match/tournament data.
 * No Prisma / React. Display-only overlay on stats already used for US-14.
 */

import { MIN_MATCHES_FOR_RANKING } from "@/domain/constants";
import {
  filterMatchesForPlayer,
  type StatsMatch,
} from "@/domain/player-stats";

/** Min completed matches before win-rate badges can unlock. */
export const ACHIEVEMENT_WIN_RATE_MIN_MATCHES = Math.max(
  MIN_MATCHES_FOR_RANKING,
  10,
);

export type AchievementCategory =
  | "wins"
  | "matches"
  | "tournament"
  | "activity"
  | "streak"
  | "special";

export type AchievementId =
  | "first_win"
  | "wins_10"
  | "wins_25"
  | "wins_50"
  | "wins_100"
  | "first_match"
  | "matches_10"
  | "matches_50"
  | "matches_100"
  | "first_tournament"
  | "first_championship"
  | "championships_3"
  | "championships_10"
  | "active_days_7"
  | "active_days_30"
  | "active_days_100"
  | "streak_3"
  | "streak_5"
  | "streak_10"
  | "undefeated_tournament"
  | "win_rate_90"
  | "points_100";

export type AchievementDefinition = {
  id: AchievementId;
  category: AchievementCategory;
  name: string;
  description: string;
  icon: string;
  /** Accent color for unlocked state */
  color: string;
  /** Target value for progress (boolean badges use 1). */
  target: number;
};

export type TournamentAchievementHint = {
  id: string;
  type: "KNOCKOUT" | "ROUND_ROBIN";
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  participantUserIds: string[];
  /** Users who won the tournament (KO final / RR #1). Empty if not decided. */
  championUserIds: string[];
  /**
   * Per-user results inside this tournament (completed matches only).
   * Used for undefeated + participation via play.
   */
  playerRecords: Array<{
    userId: string;
    played: number;
    wins: number;
    losses: number;
  }>;
};

export type AchievementProgress = {
  id: AchievementId;
  category: AchievementCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  target: number;
  current: number;
  percent: number;
  unlocked: boolean;
};

export type AchievementMetrics = {
  wins: number;
  matchesPlayed: number;
  pointsScored: number;
  winRate: number;
  bestWinStreak: number;
  activeDays: number;
  tournamentsJoined: number;
  championships: number;
  undefeatedTournaments: number;
};

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  wins: "Galibiyet",
  matches: "Maç",
  tournament: "Turnuva",
  activity: "Aktivite",
  streak: "Seri",
  special: "Özel",
};

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  {
    id: "first_win",
    category: "wins",
    name: "İlk Galibiyet",
    description: "İlk maçını kazandın.",
    icon: "🥇",
    color: "#fbbf24",
    target: 1,
  },
  {
    id: "wins_10",
    category: "wins",
    name: "10 Galibiyet",
    description: "Toplam 10 galibiyete ulaş.",
    icon: "🏅",
    color: "#f59e0b",
    target: 10,
  },
  {
    id: "wins_25",
    category: "wins",
    name: "25 Galibiyet",
    description: "Toplam 25 galibiyete ulaş.",
    icon: "🎖️",
    color: "#f97316",
    target: 25,
  },
  {
    id: "wins_50",
    category: "wins",
    name: "50 Galibiyet",
    description: "Toplam 50 galibiyete ulaş.",
    icon: "🏆",
    color: "#ea580c",
    target: 50,
  },
  {
    id: "wins_100",
    category: "wins",
    name: "100 Galibiyet",
    description: "Toplam 100 galibiyete ulaş.",
    icon: "👑",
    color: "#dc2626",
    target: 100,
  },
  {
    id: "first_match",
    category: "matches",
    name: "İlk Maç",
    description: "İlk tamamlanmış maçını oynadın.",
    icon: "🏓",
    color: "#818cf8",
    target: 1,
  },
  {
    id: "matches_10",
    category: "matches",
    name: "10 Maç",
    description: "10 tamamlanmış maç oyna.",
    icon: "🎯",
    color: "#6366f1",
    target: 10,
  },
  {
    id: "matches_50",
    category: "matches",
    name: "50 Maç",
    description: "50 tamamlanmış maç oyna.",
    icon: "🔥",
    color: "#4f46e5",
    target: 50,
  },
  {
    id: "matches_100",
    category: "matches",
    name: "100 Maç",
    description: "100 tamamlanmış maç oyna.",
    icon: "💎",
    color: "#4338ca",
    target: 100,
  },
  {
    id: "first_tournament",
    category: "tournament",
    name: "İlk Turnuva",
    description: "Bir turnuvaya katıldın.",
    icon: "🎫",
    color: "#a855f7",
    target: 1,
  },
  {
    id: "first_championship",
    category: "tournament",
    name: "İlk Şampiyonluk",
    description: "Bir turnuvayı şampiyon olarak tamamladın.",
    icon: "🏆",
    color: "#eab308",
    target: 1,
  },
  {
    id: "championships_3",
    category: "tournament",
    name: "3 Şampiyonluk",
    description: "3 turnuva şampiyonluğu kazan.",
    icon: "🥇",
    color: "#ca8a04",
    target: 3,
  },
  {
    id: "championships_10",
    category: "tournament",
    name: "10 Şampiyonluk",
    description: "10 turnuva şampiyonluğu kazan.",
    icon: "👑",
    color: "#a16207",
    target: 10,
  },
  {
    id: "active_days_7",
    category: "activity",
    name: "7 Gün Aktif",
    description: "7 farklı günde maç tamamla.",
    icon: "📅",
    color: "#34d399",
    target: 7,
  },
  {
    id: "active_days_30",
    category: "activity",
    name: "30 Gün Aktif",
    description: "30 farklı günde maç tamamla.",
    icon: "🗓️",
    color: "#10b981",
    target: 30,
  },
  {
    id: "active_days_100",
    category: "activity",
    name: "100 Gün Aktif",
    description: "100 farklı günde maç tamamla.",
    icon: "⏳",
    color: "#059669",
    target: 100,
  },
  {
    id: "streak_3",
    category: "streak",
    name: "3 Galibiyet Serisi",
    description: "Üst üste 3 maç kazan.",
    icon: "⚡",
    color: "#fb923c",
    target: 3,
  },
  {
    id: "streak_5",
    category: "streak",
    name: "5 Galibiyet Serisi",
    description: "Üst üste 5 maç kazan.",
    icon: "💥",
    color: "#f97316",
    target: 5,
  },
  {
    id: "streak_10",
    category: "streak",
    name: "10 Galibiyet Serisi",
    description: "Üst üste 10 maç kazan.",
    icon: "🚀",
    color: "#ea580c",
    target: 10,
  },
  {
    id: "undefeated_tournament",
    category: "special",
    name: "Namağlup Turnuva",
    description: "Tamamlanan bir turnuvayı yenilgisiz bitir.",
    icon: "🛡️",
    color: "#38bdf8",
    target: 1,
  },
  {
    id: "win_rate_90",
    category: "special",
    name: "%90 Kazanma Oranı",
    description: `En az ${ACHIEVEMENT_WIN_RATE_MIN_MATCHES} maçta %90+ kazanma oranına ulaş.`,
    icon: "📈",
    color: "#22d3ee",
    target: 90,
  },
  {
    id: "points_100",
    category: "special",
    name: "100 Sayı",
    description: "Toplam 100 sayı at.",
    icon: "💯",
    color: "#ec4899",
    target: 100,
  },
] as const;

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function playerTeam(match: StatsMatch, playerId: string): 1 | 2 | null {
  const p = match.participants.find((x) => x.userId === playerId);
  return p ? p.team : null;
}

/** Best consecutive win streak over chronological history. */
export function computeBestWinStreak(
  playerId: string,
  matches: StatsMatch[],
): number {
  const mine = filterMatchesForPlayer(playerId, matches)
    .slice()
    .sort((a, b) => {
      const ta = a.playedAt?.getTime() ?? 0;
      const tb = b.playedAt?.getTime() ?? 0;
      return ta - tb;
    });

  let best = 0;
  let current = 0;
  for (const match of mine) {
    const team = playerTeam(match, playerId);
    if (team == null) continue;
    if (team === match.winnerTeam) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

export function computeActiveDays(
  playerId: string,
  matches: StatsMatch[],
): number {
  const days = new Set<string>();
  for (const match of filterMatchesForPlayer(playerId, matches)) {
    if (!match.playedAt) continue;
    days.add(dayKey(match.playedAt));
  }
  return days.size;
}

export function computeAchievementMetrics(
  playerId: string,
  matches: StatsMatch[],
  tournaments: TournamentAchievementHint[] = [],
): AchievementMetrics {
  const mine = filterMatchesForPlayer(playerId, matches);
  let wins = 0;
  let pointsScored = 0;

  for (const match of mine) {
    const team = playerTeam(match, playerId);
    if (team == null) continue;
    if (team === match.winnerTeam) wins += 1;
    for (const set of match.sets) {
      pointsScored += team === 1 ? set.team1Score : set.team2Score;
    }
  }

  const matchesPlayed = mine.length;
  const winRate =
    matchesPlayed === 0
      ? 0
      : Math.round((wins / matchesPlayed) * 1000) / 10;

  const joined = new Set<string>();
  let championships = 0;
  let undefeatedTournaments = 0;

  for (const t of tournaments) {
    const isParticipant = t.participantUserIds.includes(playerId);
    const record = t.playerRecords.find((r) => r.userId === playerId);
    const playedIn = Boolean(record && record.played > 0);
    if (isParticipant || playedIn) joined.add(t.id);

    if (t.championUserIds.includes(playerId)) {
      championships += 1;
    }

    if (
      t.status === "COMPLETED" &&
      record &&
      record.played > 0 &&
      record.losses === 0 &&
      record.wins === record.played
    ) {
      undefeatedTournaments += 1;
    }
  }

  return {
    wins,
    matchesPlayed,
    pointsScored,
    winRate,
    bestWinStreak: computeBestWinStreak(playerId, matches),
    activeDays: computeActiveDays(playerId, matches),
    tournamentsJoined: joined.size,
    championships,
    undefeatedTournaments,
  };
}

function progressFor(
  def: AchievementDefinition,
  metrics: AchievementMetrics,
): { current: number; unlocked: boolean } {
  switch (def.id) {
    case "first_win":
    case "wins_10":
    case "wins_25":
    case "wins_50":
    case "wins_100":
      return {
        current: metrics.wins,
        unlocked: metrics.wins >= def.target,
      };
    case "first_match":
    case "matches_10":
    case "matches_50":
    case "matches_100":
      return {
        current: metrics.matchesPlayed,
        unlocked: metrics.matchesPlayed >= def.target,
      };
    case "first_tournament":
      return {
        current: metrics.tournamentsJoined,
        unlocked: metrics.tournamentsJoined >= 1,
      };
    case "first_championship":
    case "championships_3":
    case "championships_10":
      return {
        current: metrics.championships,
        unlocked: metrics.championships >= def.target,
      };
    case "active_days_7":
    case "active_days_30":
    case "active_days_100":
      return {
        current: metrics.activeDays,
        unlocked: metrics.activeDays >= def.target,
      };
    case "streak_3":
    case "streak_5":
    case "streak_10":
      return {
        current: metrics.bestWinStreak,
        unlocked: metrics.bestWinStreak >= def.target,
      };
    case "undefeated_tournament":
      return {
        current: metrics.undefeatedTournaments,
        unlocked: metrics.undefeatedTournaments >= 1,
      };
    case "win_rate_90": {
      const eligible =
        metrics.matchesPlayed >= ACHIEVEMENT_WIN_RATE_MIN_MATCHES;
      const current = eligible ? metrics.winRate : 0;
      return {
        current,
        unlocked: eligible && metrics.winRate >= 90,
      };
    }
    case "points_100":
      return {
        current: metrics.pointsScored,
        unlocked: metrics.pointsScored >= def.target,
      };
    default:
      return { current: 0, unlocked: false };
  }
}

/**
 * Evaluate all achievements once for a player.
 * Call from server/service — do not re-run on every React render.
 */
export function evaluateAchievements(
  playerId: string,
  matches: StatsMatch[],
  tournaments: TournamentAchievementHint[] = [],
): AchievementProgress[] {
  const metrics = computeAchievementMetrics(playerId, matches, tournaments);

  return ACHIEVEMENT_DEFINITIONS.map((def) => {
    const { current, unlocked } = progressFor(def, metrics);
    const capped = Math.min(current, def.target);
    const percent =
      def.target <= 0
        ? 0
        : Math.min(100, Math.round((capped / def.target) * 100));

    return {
      id: def.id,
      category: def.category,
      name: def.name,
      description: def.description,
      icon: def.icon,
      color: def.color,
      target: def.target,
      current,
      percent: unlocked ? 100 : percent,
      unlocked,
    };
  });
}

export function unlockedAchievementIds(
  progress: AchievementProgress[],
): AchievementId[] {
  return progress.filter((a) => a.unlocked).map((a) => a.id);
}

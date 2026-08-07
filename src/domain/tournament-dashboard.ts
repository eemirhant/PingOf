/**
 * Tournament detail dashboard metrics — display-only.
 * Pure functions over existing tournament match/participant data.
 */

export type TournamentDashboardPlayer = {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
};

export type TournamentDashboardMatch = {
  id: string;
  status: string;
  winnerTeam: number | null;
  scheduledAt: Date | null;
  playedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  participants: Array<{
    userId: string;
    team: number;
    fullName: string;
    avatarUrl?: string | null;
    avatarColor?: string | null;
  }>;
  sets: Array<{ team1Score: number; team2Score: number }>;
};

export type TournamentSummary = {
  participantCount: number;
  totalMatches: number;
  completedMatches: number;
  remainingMatches: number;
  cancelledMatches: number;
  /** 0–100 */
  progressPercent: number;
  championLabel: string | null;
  /** Tournament startsAt (no createdAt on Tournament model). */
  startedAt: Date;
};

export type TournamentStatLeader = {
  label: string;
  valueLabel: string;
  player: TournamentDashboardPlayer | null;
};

export type TournamentDashboardStats = {
  mostWins: TournamentStatLeader | null;
  mostPoints: TournamentStatLeader | null;
  mostActive: TournamentStatLeader | null;
  fastestMatch: TournamentStatLeader | null;
  averageDuration: TournamentStatLeader | null;
};

const MIN_DURATION_MS = 2 * 60 * 1000; // 2 dk
const MAX_DURATION_MS = 6 * 60 * 60 * 1000; // 6 saat

function isCompleted(status: string): boolean {
  return status === "COMPLETED";
}

function isCancelled(status: string): boolean {
  return status === "CANCELLED";
}

function estimateDurationMs(match: TournamentDashboardMatch): number | null {
  if (!isCompleted(match.status)) return null;
  const end = match.playedAt ?? match.updatedAt;
  const start = match.scheduledAt ?? match.createdAt;
  const ms = end.getTime() - start.getTime();
  if (ms < MIN_DURATION_MS || ms > MAX_DURATION_MS) return null;
  return ms;
}

export function formatDurationShort(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}sa ${m}dk`;
  if (m > 0) return s > 0 ? `${m}dk ${s}sn` : `${m}dk`;
  return `${s}sn`;
}

export function computeTournamentSummary(params: {
  participantCount: number;
  startedAt: Date;
  matches: TournamentDashboardMatch[];
  championLabels: string[];
}): TournamentSummary {
  const totalMatches = params.matches.length;
  const completedMatches = params.matches.filter((m) => isCompleted(m.status)).length;
  const cancelledMatches = params.matches.filter((m) => isCancelled(m.status)).length;
  const remainingMatches = params.matches.filter(
    (m) => !isCompleted(m.status) && !isCancelled(m.status),
  ).length;

  const countable = completedMatches + remainingMatches;
  const progressPercent =
    countable <= 0
      ? totalMatches > 0 && completedMatches === totalMatches
        ? 100
        : 0
      : Math.min(100, Math.round((completedMatches / countable) * 100));

  return {
    participantCount: params.participantCount,
    totalMatches,
    completedMatches,
    remainingMatches,
    cancelledMatches,
    progressPercent,
    championLabel:
      params.championLabels.length > 0
        ? params.championLabels.join(" / ")
        : null,
    startedAt: params.startedAt,
  };
}

type Acc = {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  wins: number;
  points: number;
  played: number;
};

function bump(
  map: Map<string, Acc>,
  p: TournamentDashboardMatch["participants"][number],
  won: boolean,
  points: number,
) {
  const cur = map.get(p.userId) ?? {
    userId: p.userId,
    fullName: p.fullName,
    avatarUrl: p.avatarUrl,
    avatarColor: p.avatarColor,
    wins: 0,
    points: 0,
    played: 0,
  };
  cur.fullName = p.fullName;
  cur.avatarUrl = p.avatarUrl ?? cur.avatarUrl;
  cur.avatarColor = p.avatarColor ?? cur.avatarColor;
  cur.played += 1;
  if (won) cur.wins += 1;
  cur.points += points;
  map.set(p.userId, cur);
}

function toPlayer(acc: Acc): TournamentDashboardPlayer {
  return {
    userId: acc.userId,
    fullName: acc.fullName,
    avatarUrl: acc.avatarUrl,
    avatarColor: acc.avatarColor,
  };
}

function pickBest(
  values: Acc[],
  score: (a: Acc) => number,
): Acc | null {
  if (values.length === 0) return null;
  let best = values[0]!;
  let bestScore = score(best);
  for (let i = 1; i < values.length; i++) {
    const v = values[i]!;
    const s = score(v);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    } else if (s === bestScore && v.fullName.localeCompare(best.fullName, "tr") < 0) {
      best = v;
    }
  }
  if (bestScore <= 0) return null;
  return best;
}

export function computeTournamentDashboardStats(
  matches: TournamentDashboardMatch[],
): TournamentDashboardStats {
  const map = new Map<string, Acc>();
  const durations: Array<{ matchId: string; ms: number; label: string }> = [];

  for (const match of matches) {
    if (!isCompleted(match.status) || match.winnerTeam == null) continue;

    for (const p of match.participants) {
      const team = p.team === 1 ? 1 : 2;
      const won = team === match.winnerTeam;
      let points = 0;
      for (const set of match.sets) {
        points += team === 1 ? set.team1Score : set.team2Score;
      }
      bump(map, p, won, points);
    }

    const ms = estimateDurationMs(match);
    if (ms != null) {
      const names = match.participants.map((p) => p.fullName).join(" / ");
      durations.push({
        matchId: match.id,
        ms,
        label: names || "Maç",
      });
    }
  }

  const players = [...map.values()];
  const mostWinsAcc = pickBest(players, (a) => a.wins);
  const mostPointsAcc = pickBest(players, (a) => a.points);
  const mostActiveAcc = pickBest(players, (a) => a.played);

  let fastestMatch: TournamentStatLeader | null = null;
  let averageDuration: TournamentStatLeader | null = null;

  if (durations.length > 0) {
    durations.sort((a, b) => a.ms - b.ms);
    const fastest = durations[0]!;
    fastestMatch = {
      label: "En Hızlı Maç",
      valueLabel: formatDurationShort(fastest.ms),
      player: {
        userId: fastest.matchId,
        fullName: fastest.label,
      },
    };

    const avg =
      durations.reduce((sum, d) => sum + d.ms, 0) / durations.length;
    averageDuration = {
      label: "Ortalama Maç Süresi",
      valueLabel: formatDurationShort(avg),
      player: null,
    };
  }

  return {
    mostWins: mostWinsAcc
      ? {
          label: "En Çok Galibiyet",
          valueLabel: `${mostWinsAcc.wins}G`,
          player: toPlayer(mostWinsAcc),
        }
      : null,
    mostPoints: mostPointsAcc
      ? {
          label: "En Çok Sayı",
          valueLabel: `${mostPointsAcc.points}`,
          player: toPlayer(mostPointsAcc),
        }
      : null,
    mostActive: mostActiveAcc
      ? {
          label: "En Aktif Oyuncu",
          valueLabel: `${mostActiveAcc.played} maç`,
          player: toPlayer(mostActiveAcc),
        }
      : null,
    fastestMatch,
    averageDuration,
  };
}

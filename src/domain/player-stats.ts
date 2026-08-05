/**
 * Player statistics domain (PRD US-14 / KK-14).
 * Pure functions — no UI / Prisma / React dependencies.
 */

export type StatsFormat = "SINGLES" | "DOUBLES";
export type LeaderboardFormatFilter = "ALL" | StatsFormat;
export type MatchResultLetter = "W" | "L";

export type StatsParticipant = {
  userId: string;
  team: 1 | 2;
  fullName: string;
};

export type StatsSet = {
  team1Score: number;
  team2Score: number;
};

export type StatsMatch = {
  id: string;
  format: StatsFormat;
  playedAt: Date | null;
  winnerTeam: 1 | 2;
  team1SetsWon: number;
  team2SetsWon: number;
  participants: StatsParticipant[];
  sets: StatsSet[];
  /** Present when the match belongs to a tournament (PRD KK-12). */
  tournamentId?: string | null;
  /** Optional 2v2 display names (visual only). */
  team1Name?: string | null;
  team2Name?: string | null;
};

export type RecordStats = {
  played: number;
  wins: number;
  losses: number;
  winRate: number; // 0–100, 0 if no matches
};

export type SetPointStats = {
  won: number;
  lost: number;
  average: number; // won - lost
};

export type HeadToHeadSummary = {
  userId: string;
  fullName: string;
  played: number;
  wins: number;
  losses: number;
};

export type MatchHistoryRow = {
  matchId: string;
  playedAt: Date | null;
  format: StatsFormat;
  opponents: Array<{ userId: string; fullName: string }>;
  partners: Array<{ userId: string; fullName: string }>;
  /** Opponent side label: custom team name or joined player names. */
  opponentLabel: string;
  /** Own side custom team name when set (2v2). */
  ownTeamLabel: string | null;
  team1SetsWon: number;
  team2SetsWon: number;
  playerSetsWon: number;
  playerSetsLost: number;
  result: MatchResultLetter;
  setScores: StatsSet[];
  isTournament: boolean;
};

export type PlayerStats = {
  overall: RecordStats;
  singles: RecordStats;
  doubles: RecordStats;
  sets: SetPointStats;
  points: SetPointStats;
  recentForm: MatchResultLetter[]; // most recent first, max 5
  currentStreak: { type: MatchResultLetter; count: number } | null;
  topOpponent: HeadToHeadSummary | null;
  topPartner: HeadToHeadSummary | null;
  matchHistory: MatchHistoryRow[];
};

function emptyRecord(): RecordStats {
  return { played: 0, wins: 0, losses: 0, winRate: 0 };
}

function winRate(wins: number, played: number): number {
  if (played === 0) return 0;
  return Math.round((wins / played) * 1000) / 10; // one decimal
}

function playerTeam(
  match: StatsMatch,
  playerId: string,
): 1 | 2 | null {
  const p = match.participants.find((x) => x.userId === playerId);
  return p ? p.team : null;
}

function sortByPlayedAtDesc(a: StatsMatch, b: StatsMatch): number {
  const ta = a.playedAt?.getTime() ?? 0;
  const tb = b.playedAt?.getTime() ?? 0;
  return tb - ta;
}

function addRecord(stats: RecordStats, won: boolean): void {
  stats.played += 1;
  if (won) stats.wins += 1;
  else stats.losses += 1;
  stats.winRate = winRate(stats.wins, stats.played);
}

function accumulateSetsAndPoints(
  match: StatsMatch,
  team: 1 | 2,
  sets: SetPointStats,
  points: SetPointStats,
): void {
  for (const set of match.sets) {
    const scored = team === 1 ? set.team1Score : set.team2Score;
    const conceded = team === 1 ? set.team2Score : set.team1Score;
    points.won += scored;
    points.lost += conceded;
    if (scored > conceded) sets.won += 1;
    else sets.lost += 1;
  }
  sets.average = sets.won - sets.lost;
  points.average = points.won - points.lost;
}

function bumpCounter(
  map: Map<string, { fullName: string; played: number; wins: number; losses: number }>,
  userId: string,
  fullName: string,
  won: boolean,
): void {
  const cur = map.get(userId) ?? { fullName, played: 0, wins: 0, losses: 0 };
  cur.fullName = fullName;
  cur.played += 1;
  if (won) cur.wins += 1;
  else cur.losses += 1;
  map.set(userId, cur);
}

function pickTop(
  map: Map<string, { fullName: string; played: number; wins: number; losses: number }>,
  mode: "mostPlayed" | "mostWins",
): HeadToHeadSummary | null {
  const entries = [...map.entries()];
  if (entries.length === 0) return null;

  entries.sort((a, b) => {
    const [, va] = a;
    const [, vb] = b;
    if (mode === "mostPlayed") {
      if (vb.played !== va.played) return vb.played - va.played;
    } else if (vb.wins !== va.wins) {
      return vb.wins - va.wins;
    }
    if (vb.played !== va.played) return vb.played - va.played;
    return va.fullName.localeCompare(vb.fullName, "tr");
  });

  const [userId, v] = entries[0]!;
  return {
    userId,
    fullName: v.fullName,
    played: v.played,
    wins: v.wins,
    losses: v.losses,
  };
}

export function filterMatchesForPlayer(
  playerId: string,
  matches: StatsMatch[],
): StatsMatch[] {
  return matches
    .filter((m) => m.participants.some((p) => p.userId === playerId))
    .slice()
    .sort(sortByPlayedAtDesc);
}

export function filterMatchesByFormat(
  matches: StatsMatch[],
  format: LeaderboardFormatFilter,
): StatsMatch[] {
  if (format === "ALL") return matches;
  return matches.filter((m) => m.format === format);
}

/**
 * Compute full player stats from completed matches (already org-scoped by caller).
 * `matches` may include matches the player did not play — those are ignored.
 */
export function computePlayerStats(
  playerId: string,
  matches: StatsMatch[],
): PlayerStats {
  const playerMatches = filterMatchesForPlayer(playerId, matches);

  const overall = emptyRecord();
  const singles = emptyRecord();
  const doubles = emptyRecord();
  const sets: SetPointStats = { won: 0, lost: 0, average: 0 };
  const points: SetPointStats = { won: 0, lost: 0, average: 0 };
  const opponents = new Map<
    string,
    { fullName: string; played: number; wins: number; losses: number }
  >();
  const partners = new Map<
    string,
    { fullName: string; played: number; wins: number; losses: number }
  >();

  const matchHistory: MatchHistoryRow[] = [];
  const resultsChronological: MatchResultLetter[] = []; // newest first

  for (const match of playerMatches) {
    const team = playerTeam(match, playerId);
    if (!team) continue;
    const won = team === match.winnerTeam;
    const letter: MatchResultLetter = won ? "W" : "L";
    resultsChronological.push(letter);

    addRecord(overall, won);
    if (match.format === "SINGLES") addRecord(singles, won);
    else addRecord(doubles, won);

    accumulateSetsAndPoints(match, team, sets, points);

    const opponentsList = match.participants.filter((p) => p.team !== team);
    const partnersList = match.participants.filter(
      (p) => p.team === team && p.userId !== playerId,
    );

    for (const opp of opponentsList) {
      bumpCounter(opponents, opp.userId, opp.fullName, won);
    }
    for (const partner of partnersList) {
      // top partner = most wins together
      bumpCounter(partners, partner.userId, partner.fullName, won);
    }

    const playerSetsWon = team === 1 ? match.team1SetsWon : match.team2SetsWon;
    const playerSetsLost = team === 1 ? match.team2SetsWon : match.team1SetsWon;

    const ownTeamName =
      team === 1 ? match.team1Name?.trim() : match.team2Name?.trim();
    const opponentTeamName =
      team === 1 ? match.team2Name?.trim() : match.team1Name?.trim();

    matchHistory.push({
      matchId: match.id,
      playedAt: match.playedAt,
      format: match.format,
      opponents: opponentsList.map((o) => ({
        userId: o.userId,
        fullName: o.fullName,
      })),
      partners: partnersList.map((o) => ({
        userId: o.userId,
        fullName: o.fullName,
      })),
      opponentLabel:
        opponentTeamName ||
        opponentsList.map((o) => o.fullName).join(" & ") ||
        "—",
      ownTeamLabel: ownTeamName || null,
      team1SetsWon: match.team1SetsWon,
      team2SetsWon: match.team2SetsWon,
      playerSetsWon,
      playerSetsLost,
      result: letter,
      setScores: match.sets.map((s) => ({ ...s })),
      isTournament: Boolean(match.tournamentId),
    });
  }

  let currentStreak: PlayerStats["currentStreak"] = null;
  if (resultsChronological.length > 0) {
    const type = resultsChronological[0]!;
    let count = 0;
    for (const r of resultsChronological) {
      if (r !== type) break;
      count += 1;
    }
    currentStreak = { type, count };
  }

  // topPartner: most wins (only count wins for ranking partners)
  const partnerWinsOnly = new Map<
    string,
    { fullName: string; played: number; wins: number; losses: number }
  >();
  for (const [id, v] of partners) {
    partnerWinsOnly.set(id, { ...v });
  }

  return {
    overall,
    singles,
    doubles,
    sets,
    points,
    recentForm: resultsChronological.slice(0, 5),
    currentStreak,
    topOpponent: pickTop(opponents, "mostPlayed"),
    topPartner: pickTop(partnerWinsOnly, "mostWins"),
    matchHistory,
  };
}

/** Record stats for a player filtered by format (used by leaderboard). */
export function computeRecordForFormat(
  playerId: string,
  matches: StatsMatch[],
  format: LeaderboardFormatFilter,
): RecordStats & { setAverage: number; pointAverage: number } {
  const filtered = filterMatchesByFormat(
    filterMatchesForPlayer(playerId, matches),
    format,
  );
  const record = emptyRecord();
  const sets: SetPointStats = { won: 0, lost: 0, average: 0 };
  const points: SetPointStats = { won: 0, lost: 0, average: 0 };

  for (const match of filtered) {
    const team = playerTeam(match, playerId);
    if (!team) continue;
    addRecord(record, team === match.winnerTeam);
    accumulateSetsAndPoints(match, team, sets, points);
  }

  return {
    ...record,
    setAverage: sets.average,
    pointAverage: points.average,
  };
}

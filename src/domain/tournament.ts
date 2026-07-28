/**
 * Tournament bracket / standings — PRD US-12 / KK-12.
 * Pure functions — no UI / Prisma / React dependencies.
 */

import { ROUND_ROBIN_LOSS_POINTS, ROUND_ROBIN_WIN_POINTS } from "@/domain/constants";

export type TournamentTypeValue = "KNOCKOUT" | "ROUND_ROBIN";
export type TournamentStatusValue =
  | "DRAFT"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type BracketMatchStatus = "WAITING" | "PENDING" | "COMPLETED";

/** null = BYE placeholder in the padded bracket. */
export type BracketEntryId = string | null;

export type BracketMatch = {
  /** Stable id within a bracket build, e.g. "r1-s0". */
  id: string;
  round: number;
  bracketSlot: number;
  team1EntryId: BracketEntryId;
  team2EntryId: BracketEntryId;
  winnerEntryId: BracketEntryId;
  status: BracketMatchStatus;
};

export type RoundRobinPairing = {
  team1EntryId: string;
  team2EntryId: string;
};

export type RoundRobinResult = {
  team1EntryId: string;
  team2EntryId: string;
  winnerEntryId: string;
  team1SetsWon: number;
  team2SetsWon: number;
  team1PointsScored: number;
  team2PointsScored: number;
};

export type RoundRobinStanding = {
  entryId: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  setDiff: number;
  pointDiff: number;
  rank: number;
};

export function nextPowerOfTwo(n: number): number {
  if (n < 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Pads entry list with null BYE slots up to the next power of two. */
export function padToPowerOfTwo(entryIds: string[]): BracketEntryId[] {
  const size = nextPowerOfTwo(entryIds.length);
  const padded: BracketEntryId[] = [...entryIds];
  while (padded.length < size) {
    padded.push(null);
  }
  return padded;
}

export function knockoutMatchId(round: number, bracketSlot: number): string {
  return `r${round}-s${bracketSlot}`;
}

export function nextRoundTarget(
  round: number,
  bracketSlot: number,
): { round: number; bracketSlot: number; team: 1 | 2 } {
  return {
    round: round + 1,
    bracketSlot: Math.floor(bracketSlot / 2),
    team: bracketSlot % 2 === 0 ? 1 : 2,
  };
}

/**
 * Builds a full knockout tree from seeded entry ids (order = seed order).
 * Round 1 = first round; highest round = final.
 * BYE matches are auto-completed with the real entry as winner.
 */
export function buildKnockoutBracket(entryIds: string[]): {
  size: number;
  rounds: number;
  matches: BracketMatch[];
} {
  if (entryIds.length < 2) {
    throw new Error("Knockout requires at least 2 entries");
  }

  const padded = padToPowerOfTwo(entryIds);
  const size = padded.length;
  const rounds = Math.log2(size);
  const matches: BracketMatch[] = [];

  // Round 1 pairings
  for (let slot = 0; slot < size / 2; slot++) {
    const team1 = padded[slot * 2] ?? null;
    const team2 = padded[slot * 2 + 1] ?? null;
    let winner: BracketEntryId = null;
    let status: BracketMatchStatus = "WAITING";

    if (team1 != null && team2 != null) {
      status = "PENDING";
    } else if (team1 != null && team2 === null) {
      winner = team1;
      status = "COMPLETED";
    } else if (team1 === null && team2 != null) {
      winner = team2;
      status = "COMPLETED";
    } else {
      status = "WAITING";
    }

    matches.push({
      id: knockoutMatchId(1, slot),
      round: 1,
      bracketSlot: slot,
      team1EntryId: team1,
      team2EntryId: team2,
      winnerEntryId: winner,
      status,
    });
  }

  // Later rounds — empty shells
  for (let round = 2; round <= rounds; round++) {
    const slotCount = size / 2 ** round;
    for (let slot = 0; slot < slotCount; slot++) {
      matches.push({
        id: knockoutMatchId(round, slot),
        round,
        bracketSlot: slot,
        team1EntryId: null,
        team2EntryId: null,
        winnerEntryId: null,
        status: "WAITING",
      });
    }
  }

  // Propagate auto-BYE winners into later rounds
  let changed = true;
  while (changed) {
    changed = false;
    for (const match of matches) {
      if (match.status !== "COMPLETED" || match.winnerEntryId == null) continue;
      if (match.round >= rounds) continue;

      const target = nextRoundTarget(match.round, match.bracketSlot);
      const next = matches.find(
        (m) => m.round === target.round && m.bracketSlot === target.bracketSlot,
      );
      if (!next) continue;

      if (target.team === 1 && next.team1EntryId == null) {
        next.team1EntryId = match.winnerEntryId;
        changed = true;
      } else if (target.team === 2 && next.team2EntryId == null) {
        next.team2EntryId = match.winnerEntryId;
        changed = true;
      }

      // Re-evaluate next match for BYE / ready
      if (next.winnerEntryId != null) continue;

      if (next.team1EntryId != null && next.team2EntryId != null) {
        next.status = "PENDING";
      } else if (next.team1EntryId != null && next.team2EntryId === null) {
        // Only one side filled and the other is a true BYE only in round-1 sense;
        // in later rounds null means "not yet known", not BYE — keep WAITING
        next.status = "WAITING";
      } else if (next.team1EntryId === null && next.team2EntryId != null) {
        next.status = "WAITING";
      }
    }
  }

  return { size, rounds, matches };
}

/**
 * After a PENDING match is completed, place the winner into the next round.
 * Returns updated matches, champion (if final done), and newly PENDING match ids.
 */
export function advanceTournamentBracket(params: {
  matches: BracketMatch[];
  completedMatchId: string;
  winnerEntryId: string;
}): {
  matches: BracketMatch[];
  championEntryId: string | null;
  newlyReadyMatchIds: string[];
} {
  const matches = params.matches.map((m) => ({ ...m }));
  const completed = matches.find((m) => m.id === params.completedMatchId);
  if (!completed) {
    throw new Error("Completed match not found in bracket");
  }

  const isParticipant =
    completed.team1EntryId === params.winnerEntryId ||
    completed.team2EntryId === params.winnerEntryId;
  if (!isParticipant) {
    throw new Error("Winner must be a participant of the completed match");
  }

  completed.winnerEntryId = params.winnerEntryId;
  completed.status = "COMPLETED";

  const maxRound = matches.reduce((max, m) => Math.max(max, m.round), 0);
  const newlyReadyMatchIds: string[] = [];

  if (completed.round < maxRound) {
    const target = nextRoundTarget(completed.round, completed.bracketSlot);
    const next = matches.find(
      (m) => m.round === target.round && m.bracketSlot === target.bracketSlot,
    );
    if (next) {
      const wasPending = next.status === "PENDING";
      if (target.team === 1) {
        next.team1EntryId = params.winnerEntryId;
      } else {
        next.team2EntryId = params.winnerEntryId;
      }

      if (next.team1EntryId != null && next.team2EntryId != null) {
        next.status = "PENDING";
        if (!wasPending) {
          newlyReadyMatchIds.push(next.id);
        }
      } else {
        // Later rounds: a null side means opponent not decided yet (not BYE).
        next.status = "WAITING";
      }
    }
  }

  const final = matches.find((m) => m.round === maxRound);
  const championEntryId =
    final?.status === "COMPLETED" && final.winnerEntryId != null
      ? final.winnerEntryId
      : null;

  return { matches, championEntryId, newlyReadyMatchIds };
}

/** All unique pairings for round-robin (each entry plays every other once). */
export function buildRoundRobinPairings(entryIds: string[]): RoundRobinPairing[] {
  if (entryIds.length < 2) {
    throw new Error("Round robin requires at least 2 entries");
  }
  const pairings: RoundRobinPairing[] = [];
  for (let i = 0; i < entryIds.length; i++) {
    for (let j = i + 1; j < entryIds.length; j++) {
      pairings.push({
        team1EntryId: entryIds[i]!,
        team2EntryId: entryIds[j]!,
      });
    }
  }
  return pairings;
}

/**
 * Lig standings: G=3, M=0.
 * Tiebreak: points → setDiff → pointDiff → alphabetical name (or entryId).
 */
export function calculateRoundRobinStandings(
  entryIds: string[],
  results: RoundRobinResult[],
  displayNames: Record<string, string> = {},
): RoundRobinStanding[] {
  const byId = new Map<
    string,
    Omit<RoundRobinStanding, "rank">
  >();

  for (const id of entryIds) {
    byId.set(id, {
      entryId: id,
      played: 0,
      wins: 0,
      losses: 0,
      points: 0,
      setDiff: 0,
      pointDiff: 0,
    });
  }

  for (const r of results) {
    const t1 = byId.get(r.team1EntryId);
    const t2 = byId.get(r.team2EntryId);
    if (!t1 || !t2) continue;

    t1.played += 1;
    t2.played += 1;
    t1.setDiff += r.team1SetsWon - r.team2SetsWon;
    t2.setDiff += r.team2SetsWon - r.team1SetsWon;
    t1.pointDiff += r.team1PointsScored - r.team2PointsScored;
    t2.pointDiff += r.team2PointsScored - r.team1PointsScored;

    if (r.winnerEntryId === r.team1EntryId) {
      t1.wins += 1;
      t1.points += ROUND_ROBIN_WIN_POINTS;
      t2.losses += 1;
      t2.points += ROUND_ROBIN_LOSS_POINTS;
    } else if (r.winnerEntryId === r.team2EntryId) {
      t2.wins += 1;
      t2.points += ROUND_ROBIN_WIN_POINTS;
      t1.losses += 1;
      t1.points += ROUND_ROBIN_LOSS_POINTS;
    }
  }

  const sorted = [...byId.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    const nameA = (displayNames[a.entryId] ?? a.entryId).localeCompare(
      displayNames[b.entryId] ?? b.entryId,
      "tr",
    );
    return nameA;
  });

  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function isRoundRobinComplete(
  entryCount: number,
  completedMatchCount: number,
): boolean {
  if (entryCount < 2) return false;
  const expected = (entryCount * (entryCount - 1)) / 2;
  return completedMatchCount >= expected;
}

export function tournamentStatusLabel(status: TournamentStatusValue): string {
  switch (status) {
    case "DRAFT":
      return "Taslak";
    case "IN_PROGRESS":
      return "Devam ediyor";
    case "COMPLETED":
      return "Tamamlandı";
    case "CANCELLED":
      return "İptal";
    default:
      return status;
  }
}

export function tournamentTypeLabel(type: TournamentTypeValue): string {
  switch (type) {
    case "KNOCKOUT":
      return "Tek eleme";
    case "ROUND_ROBIN":
      return "Lig";
    default:
      return type;
  }
}

export function knockoutRoundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Yarı final";
  if (round === totalRounds - 2) return "Çeyrek final";
  return `${round}. Tur`;
}

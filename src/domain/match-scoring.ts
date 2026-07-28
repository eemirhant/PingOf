/**
 * Table tennis match scoring domain (PRD KK-7b).
 * Pure functions — no UI / Prisma / React dependencies.
 */

export const SETS_TO_WIN = 3;
export const MAX_SETS = 5;
export const MIN_SET_POINTS = 11;
export const MIN_SET_MARGIN = 2;

export type TeamNumber = 1 | 2;

export type SetScoreInput = {
  team1Score: number | null | undefined;
  team2Score: number | null | undefined;
};

export type ValidatedSetScore = {
  team1Score: number;
  team2Score: number;
  winnerTeam: TeamNumber;
};

export type ValidateSetScoreResult =
  | { ok: true; set: ValidatedSetScore }
  | { ok: false; error: string };

export type MatchSetInput = {
  setNumber: number;
  team1Score: number;
  team2Score: number;
};

export type DetermineMatchWinnerResult =
  | {
      ok: true;
      complete: true;
      winnerTeam: TeamNumber;
      team1SetsWon: number;
      team2SetsWon: number;
      sets: ValidatedSetScore[];
    }
  | {
      ok: true;
      complete: false;
      winnerTeam: null;
      team1SetsWon: number;
      team2SetsWon: number;
      sets: ValidatedSetScore[];
      leadingTeam: TeamNumber | null;
      summary: string;
    }
  | { ok: false; error: string };

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Validates a single set score (11 points, win by 2, deuce exact-margin-2).
 */
export function validateSetScore(
  team1Score: number | null | undefined,
  team2Score: number | null | undefined,
): ValidateSetScoreResult {
  if (team1Score === null || team1Score === undefined || team2Score === null || team2Score === undefined) {
    return { ok: false, error: "Set skoru boş olamaz" };
  }

  if (!isNonNegativeInteger(team1Score) || !isNonNegativeInteger(team2Score)) {
    return { ok: false, error: "Set skoru negatif veya geçersiz olamaz" };
  }

  if (team1Score === team2Score) {
    return { ok: false, error: "Set skoru berabere olamaz; en az 2 sayı fark gerekir" };
  }

  const winnerScore = Math.max(team1Score, team2Score);
  const loserScore = Math.min(team1Score, team2Score);
  const margin = winnerScore - loserScore;

  if (winnerScore < MIN_SET_POINTS) {
    return { ok: false, error: `Kazanan en az ${MIN_SET_POINTS} sayı almalıdır` };
  }

  if (margin < MIN_SET_MARGIN) {
    return { ok: false, error: `En az ${MIN_SET_MARGIN} sayı fark gerekir` };
  }

  // Deuce / extended set: once past 11, winner must win by exactly 2
  if (winnerScore > MIN_SET_POINTS && margin !== MIN_SET_MARGIN) {
    return {
      ok: false,
      error: `${MIN_SET_POINTS} sayıdan sonra fark tam ${MIN_SET_MARGIN} olmalıdır (örn. 13-11)`,
    };
  }

  const winnerTeam: TeamNumber = team1Score > team2Score ? 1 : 2;

  return {
    ok: true,
    set: {
      team1Score,
      team2Score,
      winnerTeam,
    },
  };
}

/**
 * Validates an ordered list of sets and determines the match winner.
 * Valid completed scores: 3-0, 3-1, 3-2.
 */
export function determineMatchWinner(sets: SetScoreInput[]): DetermineMatchWinnerResult {
  if (sets.length === 0) {
    return {
      ok: true,
      complete: false,
      winnerTeam: null,
      team1SetsWon: 0,
      team2SetsWon: 0,
      sets: [],
      leadingTeam: null,
      summary: "Henüz set girilmedi",
    };
  }

  if (sets.length > MAX_SETS) {
    return { ok: false, error: `Bir maç en fazla ${MAX_SETS} set olabilir` };
  }

  const validated: ValidatedSetScore[] = [];
  let team1SetsWon = 0;
  let team2SetsWon = 0;

  for (let i = 0; i < sets.length; i++) {
    if (team1SetsWon === SETS_TO_WIN || team2SetsWon === SETS_TO_WIN) {
      return {
        ok: false,
        error: "Bir taraf 3 set aldıktan sonra ek set girilemez",
      };
    }

    const current = sets[i]!;
    const result = validateSetScore(current.team1Score, current.team2Score);

    if (!result.ok) {
      return { ok: false, error: `Set ${i + 1}: ${result.error}` };
    }

    validated.push(result.set);

    if (result.set.winnerTeam === 1) {
      team1SetsWon += 1;
    } else {
      team2SetsWon += 1;
    }
  }

  if (team1SetsWon === SETS_TO_WIN || team2SetsWon === SETS_TO_WIN) {
    const winnerTeam: TeamNumber = team1SetsWon === SETS_TO_WIN ? 1 : 2;
    const expectedSetCount = team1SetsWon + team2SetsWon;

    if (validated.length !== expectedSetCount) {
      return { ok: false, error: "Set sayısı maç sonucuyla uyuşmuyor" };
    }

    // Completed match must be exactly 3, 4, or 5 sets with a 3-x score
    if (validated.length < SETS_TO_WIN) {
      return { ok: false, error: "Tamamlanmış maç en az 3 set olmalıdır" };
    }

    return {
      ok: true,
      complete: true,
      winnerTeam,
      team1SetsWon,
      team2SetsWon,
      sets: validated,
    };
  }

  return {
    ok: true,
    complete: false,
    winnerTeam: null,
    team1SetsWon,
    team2SetsWon,
    sets: validated,
    leadingTeam: getLeadingTeam(team1SetsWon, team2SetsWon),
    summary: formatMatchSummary(team1SetsWon, team2SetsWon),
  };
}

export function canAddAnotherSet(team1SetsWon: number, team2SetsWon: number, setCount: number): boolean {
  if (setCount >= MAX_SETS) return false;
  if (team1SetsWon >= SETS_TO_WIN || team2SetsWon >= SETS_TO_WIN) return false;
  return true;
}

export function getLeadingTeam(team1SetsWon: number, team2SetsWon: number): TeamNumber | null {
  if (team1SetsWon === team2SetsWon) return null;
  return team1SetsWon > team2SetsWon ? 1 : 2;
}

/**
 * Live summary for the match form, e.g. "2-1 Takım 1 önde".
 */
export function formatMatchSummary(team1SetsWon: number, team2SetsWon: number): string {
  if (team1SetsWon === 0 && team2SetsWon === 0) {
    return "Henüz set girilmedi";
  }

  if (team1SetsWon === team2SetsWon) {
    return `${team1SetsWon}-${team2SetsWon} eşit`;
  }

  if (team1SetsWon > team2SetsWon) {
    return `${team1SetsWon}-${team2SetsWon} Takım 1 önde`;
  }

  return `${team1SetsWon}-${team2SetsWon} Takım 2 önde`;
}

/**
 * Convenience: validate sets then return a live summary string.
 */
export function getMatchProgressSummary(sets: SetScoreInput[]): string {
  const result = determineMatchWinner(sets);

  if (!result.ok) {
    return result.error;
  }

  if (result.complete) {
    return `${result.team1SetsWon}-${result.team2SetsWon} Takım ${result.winnerTeam} kazandı`;
  }

  return result.summary;
}

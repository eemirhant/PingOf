import {
  canAddAnotherSet,
  determineMatchWinner,
  validateSetScore,
  type SetScoreInput,
} from "@/domain/match-scoring";

export type SetDraft = { team1Score: string; team2Score: string };

export const EMPTY_SET: SetDraft = { team1Score: "", team2Score: "" };

/** Digits only — never coerce through Number while the user is typing. */
export function sanitizeScoreInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 3);
}

export function toSetInputs(sets: SetDraft[]): SetScoreInput[] {
  return sets
    .filter((set) => set.team1Score !== "" && set.team2Score !== "")
    .map((set) => ({
      team1Score: Number(set.team1Score),
      team2Score: Number(set.team2Score),
    }));
}

export function setsToDraft(
  sets: Array<{ team1Score: number; team2Score: number }>,
): SetDraft[] {
  if (sets.length === 0) return [{ ...EMPTY_SET }];
  return sets.map((set) => ({
    team1Score: String(set.team1Score),
    team2Score: String(set.team2Score),
  }));
}

/**
 * Keeps set rows in sync with match progress without wiping in-progress typing.
 * Partial rows (one side filled) and invalid both-filled rows are preserved as typed.
 */
export function syncSetRows(sets: SetDraft[]): SetDraft[] {
  const validPrefix: SetDraft[] = [];
  let incompleteFrom = -1;

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i]!;

    if (set.team1Score === "" || set.team2Score === "") {
      incompleteFrom = i;
      break;
    }

    const result = validateSetScore(Number(set.team1Score), Number(set.team2Score));
    if (!result.ok) {
      // Keep the invalid row and anything after — do not reset typed values.
      return [...validPrefix, ...sets.slice(i)];
    }

    validPrefix.push(set);
  }

  const progress = determineMatchWinner(toSetInputs(validPrefix));

  if (progress.ok && progress.complete) {
    return validPrefix.length > 0 ? validPrefix : [{ ...EMPTY_SET }];
  }

  if (
    progress.ok &&
    canAddAnotherSet(progress.team1SetsWon, progress.team2SetsWon, validPrefix.length)
  ) {
    const rest = incompleteFrom >= 0 ? sets.slice(incompleteFrom) : [];
    if (rest.length === 0) {
      return [...validPrefix, { ...EMPTY_SET }];
    }

    // Preserve open/partial rows; drop only extra fully blank duplicates.
    const preserved: SetDraft[] = [];
    for (const row of rest) {
      const blank = row.team1Score === "" && row.team2Score === "";
      if (blank && preserved.some((r) => r.team1Score === "" && r.team2Score === "")) {
        continue;
      }
      preserved.push(row);
    }
    return [...validPrefix, ...preserved];
  }

  if (incompleteFrom >= 0) {
    return [...validPrefix, ...sets.slice(incompleteFrom)];
  }

  return validPrefix.length > 0 ? validPrefix : [{ ...EMPTY_SET }];
}

/**
 * UI helpers for single-elimination bracket columns.
 * Does not change domain tournament algorithms.
 */

import { knockoutRoundLabel } from "@/domain/tournament";

/** Display title for a knockout round column (Son 16, Çeyrek Final, …). */
export function bracketColumnTitle(round: number, totalRounds: number): string {
  if (totalRounds < 1 || round < 1) return knockoutRoundLabel(round, totalRounds);
  const playersInRound = 2 ** (totalRounds - round + 1);
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Yarı Final";
  if (round === totalRounds - 2) return "Çeyrek Final";
  if (playersInRound >= 8) return `Son ${playersInRound}`;
  return knockoutRoundLabel(round, totalRounds);
}

import type { CelebrationPayload, CelebrationVariant } from "@/lib/celebration/types";

type BuildArgs = {
  matchId: string;
  myTeam: 1 | 2 | null;
  winnerTeam: 1 | 2;
  team1SetsWon: number;
  team2SetsWon: number;
  isTournamentFinal?: boolean;
  tournamentName?: string | null;
  /** Current user when they are on the winning side. */
  player?: CelebrationPayload["player"];
};

export function buildCelebrationPayload(
  args: BuildArgs,
): Omit<CelebrationPayload, "createdAt"> | null {
  const { myTeam, winnerTeam } = args;
  if (myTeam == null) return null;

  const scoreLabel = `${args.team1SetsWon}–${args.team2SetsWon}`;
  const won = myTeam === winnerTeam;

  let variant: CelebrationVariant;
  if (!won) {
    variant = "loss";
  } else if (args.isTournamentFinal) {
    variant = "champion";
  } else {
    variant = "win";
  }

  return {
    matchId: args.matchId,
    variant,
    scoreLabel,
    player: won ? args.player : undefined,
    tournamentName: args.isTournamentFinal ? args.tournamentName ?? null : null,
  };
}

export function resolveMyTeam(
  currentUserId: string,
  team1PlayerIds: string[],
  team2PlayerIds: string[],
): 1 | 2 | null {
  if (team1PlayerIds.includes(currentUserId)) return 1;
  if (team2PlayerIds.includes(currentUserId)) return 2;
  return null;
}

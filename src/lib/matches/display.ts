type ParticipantLike = {
  team: number;
  user: { fullName: string };
};

/** KK-8: treat as edited when updatedAt is clearly after createdAt. */
const EDITED_THRESHOLD_MS = 2000;

export function wasMatchEdited(createdAt: Date, updatedAt: Date): boolean {
  return updatedAt.getTime() - createdAt.getTime() > EDITED_THRESHOLD_MS;
}

export function getWinningTeamPlayers(
  participants: ParticipantLike[],
  winnerTeam: number | null | undefined,
): string[] {
  if (!winnerTeam) return [];
  return participants.filter((p) => p.team === winnerTeam).map((p) => p.user.fullName);
}

/** e.g. "emir kazandı" or "Ahmet / Mehmet kazandı" for doubles */
export function formatWinnerLabel(
  participants: ParticipantLike[],
  winnerTeam: number | null | undefined,
): string {
  const names = getWinningTeamPlayers(participants, winnerTeam);
  if (names.length === 0) return "Kazanan belirsiz";
  return `${names.join(" / ")} kazandı`;
}

export function formatTeamLabel(participants: ParticipantLike[], team: number): string {
  return participants
    .filter((p) => p.team === team)
    .map((p) => p.user.fullName)
    .join(" / ");
}

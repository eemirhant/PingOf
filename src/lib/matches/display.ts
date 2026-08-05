type ParticipantLike = {
  team: number;
  user: { fullName: string };
};

export type MatchTeamNames = {
  team1Name?: string | null;
  team2Name?: string | null;
};

/** KK-8: treat as edited when updatedAt is clearly after createdAt. */
const EDITED_THRESHOLD_MS = 2000;

const PLAYER_NAME_JOINER = " & ";

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

export function getTeamName(
  teamNames: MatchTeamNames | null | undefined,
  team: number,
): string | null {
  if (!teamNames) return null;
  const raw = team === 1 ? teamNames.team1Name : team === 2 ? teamNames.team2Name : null;
  if (raw == null) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Team display label: custom team name wins; otherwise all player names joined.
 * Never returns only the first player when multiple players exist.
 */
export function formatTeamLabel(
  participants: ParticipantLike[],
  team: number,
  teamName?: string | null,
): string {
  const custom = teamName?.trim();
  if (custom) return custom;

  return participants
    .filter((p) => p.team === team)
    .map((p) => p.user.fullName)
    .join(PLAYER_NAME_JOINER);
}

/** e.g. "emir kazandı" or "Ahmet & Mehmet kazandı" / custom team name */
export function formatWinnerLabel(
  participants: ParticipantLike[],
  winnerTeam: number | null | undefined,
  teamNames?: MatchTeamNames | null,
): string {
  if (!winnerTeam) return "Kazanan belirsiz";

  const custom = getTeamName(teamNames, winnerTeam);
  if (custom) return `${custom} kazandı`;

  const names = getWinningTeamPlayers(participants, winnerTeam);
  if (names.length === 0) return "Kazanan belirsiz";
  return `${names.join(PLAYER_NAME_JOINER)} kazandı`;
}

/** Notification body for a completed match result (2v2-aware). */
export function formatMatchDefeatNotificationBody(params: {
  participants: ParticipantLike[];
  winnerTeam: 1 | 2;
  team1SetsWon: number;
  team2SetsWon: number;
  teamNames?: MatchTeamNames | null;
  format: "SINGLES" | "DOUBLES";
}): string {
  const { participants, winnerTeam, team1SetsWon, team2SetsWon, teamNames, format } =
    params;
  const loserTeam = winnerTeam === 1 ? 2 : 1;
  const score = `${team1SetsWon}-${team2SetsWon}`;

  const winnerLabel = formatTeamLabel(
    participants,
    winnerTeam,
    getTeamName(teamNames, winnerTeam),
  );
  const loserLabel = formatTeamLabel(
    participants,
    loserTeam,
    getTeamName(teamNames, loserTeam),
  );

  if (format === "DOUBLES") {
    return `${winnerLabel}, ${loserLabel} takımını ${score} mağlup etti.`;
  }

  return `${winnerLabel}, ${loserLabel} rakibini ${score} mağlup etti.`;
}


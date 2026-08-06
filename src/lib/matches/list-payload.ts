export type MatchesListScope = "mine" | "all" | "tournament";

export type MatchesListPayload = {
  matches: Array<{
    id: string;
    format: "SINGLES" | "DOUBLES";
    status: string;
    scheduledAt: string | null;
    playedAt: string | null;
    winnerTeam: number | null;
    team1SetsWon: number | null;
    team2SetsWon: number | null;
    team1Name: string | null;
    team2Name: string | null;
    stakeNote: string | null;
    stakeSettled: boolean;
    tournamentId: string | null;
    tournamentName: string | null;
    participants: Array<{
      id: string;
      team: number;
      user: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
        avatarColor: string | null;
      };
    }>;
  }>;
  total: number;
  page: number;
  totalPages: number;
};

type MatchListSource = {
  total: number;
  page: number;
  totalPages: number;
  matches: Array<{
    id: string;
    format: "SINGLES" | "DOUBLES";
    status: string;
    scheduledAt: Date | null;
    playedAt: Date | null;
    winnerTeam: number | null;
    team1SetsWon: number | null;
    team2SetsWon: number | null;
    team1Name: string | null;
    team2Name: string | null;
    stakeNote: string | null;
    stakeSettled: boolean;
    tournamentId?: string | null;
    tournament?: { id: string; name: string } | null;
    participants: Array<{
      id: string;
      team: number;
      user: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
        avatarColor: string | null;
      };
    }>;
  }>;
};

export function serializeMatchesList(result: MatchListSource): MatchesListPayload {
  return {
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    matches: result.matches.map((match) => ({
      id: match.id,
      format: match.format,
      status: match.status,
      scheduledAt: match.scheduledAt?.toISOString() ?? null,
      playedAt: match.playedAt?.toISOString() ?? null,
      winnerTeam: match.winnerTeam,
      team1SetsWon: match.team1SetsWon,
      team2SetsWon: match.team2SetsWon,
      team1Name: match.team1Name,
      team2Name: match.team2Name,
      stakeNote: match.stakeNote,
      stakeSettled: match.stakeSettled,
      tournamentId: match.tournament?.id ?? match.tournamentId ?? null,
      tournamentName: match.tournament?.name ?? null,
      participants: match.participants.map((p) => ({
        id: p.id,
        team: p.team,
        user: {
          id: p.user.id,
          fullName: p.user.fullName,
          avatarUrl: p.user.avatarUrl,
          avatarColor: p.user.avatarColor,
        },
      })),
    })),
  };
}

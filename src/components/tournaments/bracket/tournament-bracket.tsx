import { BracketChampionCard } from "@/components/tournaments/bracket/bracket-champion-card";
import { BracketColumn } from "@/components/tournaments/bracket/bracket-column";
import { bracketColumnTitle } from "@/components/tournaments/bracket/bracket-labels";
import type {
  BracketMatchCardProps,
  BracketMatchTone,
  BracketPlayerView,
  BracketSideView,
} from "@/components/tournaments/bracket/bracket-types";
import {
  matchStatusLabel,
  resolveMatchStatus,
  type MatchStatusValue,
} from "@/domain/match-status";
import { formatTeamLabel } from "@/lib/matches/display";

export type TournamentBracketMatchInput = {
  id: string;
  status: string;
  format: string;
  scheduledAt: Date | null;
  tournamentRound: number | null;
  bracketSlot: number | null;
  winnerTeam: number | null;
  team1SetsWon: number | null;
  team2SetsWon: number | null;
  team1Name: string | null;
  team2Name: string | null;
  participants: Array<{
    team: number;
    user: {
      id: string;
      fullName: string;
      avatarUrl: string | null;
      avatarColor: string | null;
    };
  }>;
};

type TournamentBracketProps = {
  matches: TournamentBracketMatchInput[];
  /** userId → tournament seed (0-based from DB). */
  seedByUserId?: Record<string, number>;
  /** Optional champion display labels (fallback). */
  championLabels?: string[];
};

function seedLabelForPlayers(
  players: BracketPlayerView[],
  seedByUserId: Record<string, number>,
): string | null {
  const seeds = players
    .map((p) => seedByUserId[p.userId])
    .filter((s): s is number => typeof s === "number");
  if (seeds.length === 0) return null;
  const best = Math.min(...seeds);
  return `Seri #${best + 1}`;
}

function emptySide(): BracketSideView {
  return {
    label: "Bekleniyor",
    isWinner: false,
    isLoser: false,
    isEmpty: true,
    players: [],
    seedLabel: null,
  };
}

function sideFromParticipants(
  match: TournamentBracketMatchInput,
  team: 1 | 2,
  seedByUserId: Record<string, number>,
): BracketSideView {
  const members = match.participants.filter((p) => p.team === team);
  if (members.length === 0) {
    if (match.status === "COMPLETED") {
      return {
        label: "BAY",
        isWinner: false,
        isLoser: true,
        isEmpty: true,
        players: [],
        seedLabel: null,
      };
    }
    return emptySide();
  }

  const players: BracketPlayerView[] = members.map((p) => ({
    userId: p.user.id,
    fullName: p.user.fullName,
    avatarUrl: p.user.avatarUrl,
    avatarColor: p.user.avatarColor,
  }));

  const label =
    formatTeamLabel(
      members.map((p) => ({
        team,
        user: { fullName: p.user.fullName },
      })),
      team,
      team === 1 ? match.team1Name : match.team2Name,
    ) || "Bekleniyor";

  const completed = match.status === "COMPLETED" && match.winnerTeam != null;
  const isWinner = completed && match.winnerTeam === team;
  const isLoser = completed && match.winnerTeam !== team;

  return {
    label,
    isWinner,
    isLoser,
    isEmpty: false,
    players,
    seedLabel: seedLabelForPlayers(players, seedByUserId),
  };
}

function toneForMatch(
  status: MatchStatusValue,
  hasBothSides: boolean,
): BracketMatchTone {
  if (status === "CANCELLED") return "cancelled";
  if (status === "COMPLETED") return "completed";
  if (status === "PENDING" || (status === "PLANNED" && hasBothSides)) {
    return "active";
  }
  return "pending";
}

function formatMeta(scheduledAt: Date | null): string | null {
  if (!scheduledAt) return null;
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(scheduledAt);
}

function toCardProps(
  match: TournamentBracketMatchInput,
  seedByUserId: Record<string, number>,
): BracketMatchCardProps {
  const resolved = resolveMatchStatus(
    match.status as MatchStatusValue,
    match.scheduledAt,
  );
  const side1 = sideFromParticipants(match, 1, seedByUserId);
  const side2 = sideFromParticipants(match, 2, seedByUserId);
  const hasBoth = !side1.isEmpty && !side2.isEmpty;
  const isBye =
    match.status === "COMPLETED" && (side1.isEmpty || side2.isEmpty);

  let scoreLabel: string | null = null;
  if (
    match.status === "COMPLETED" &&
    match.team1SetsWon != null &&
    match.team2SetsWon != null
  ) {
    scoreLabel = isBye
      ? "BAY"
      : `${match.team1SetsWon} - ${match.team2SetsWon}`;
  }

  return {
    matchId: match.id,
    href: `/matches/${match.id}`,
    side1,
    side2,
    scoreLabel,
    metaLine: formatMeta(match.scheduledAt),
    tone: toneForMatch(resolved, hasBoth),
    statusLabel: matchStatusLabel(resolved),
    isBye,
  };
}

function buildChampion(params: {
  matches: TournamentBracketMatchInput[];
  maxRound: number;
  seedByUserId: Record<string, number>;
  championLabels: string[];
}): {
  name: string;
  players: BracketPlayerView[];
  finalScore: string | null;
  seedLabel: string | null;
} | null {
  const finals = params.matches.filter(
    (m) =>
      m.tournamentRound === params.maxRound &&
      m.status === "COMPLETED" &&
      m.winnerTeam != null,
  );
  const finalMatch = finals.sort(
    (a, b) => (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0),
  )[0];

  if (!finalMatch) {
    if (params.championLabels.length === 0) return null;
    return {
      name: params.championLabels.join(" / "),
      players: [],
      finalScore: null,
      seedLabel: null,
    };
  }

  const winnerSide = sideFromParticipants(
    finalMatch,
    finalMatch.winnerTeam as 1 | 2,
    params.seedByUserId,
  );

  const isBye =
    finalMatch.participants.filter((p) => p.team === 1).length === 0 ||
    finalMatch.participants.filter((p) => p.team === 2).length === 0;

  let finalScore: string | null = null;
  if (
    finalMatch.team1SetsWon != null &&
    finalMatch.team2SetsWon != null &&
    !isBye
  ) {
    finalScore = `${finalMatch.team1SetsWon} - ${finalMatch.team2SetsWon}`;
  } else if (isBye) {
    finalScore = "BAY";
  }

  return {
    name:
      winnerSide.label ||
      params.championLabels.join(" / ") ||
      "Şampiyon",
    players: winnerSide.players,
    finalScore,
    seedLabel: winnerSide.seedLabel,
  };
}

/** Shared champion derivation for bracket column + page hero card. */
export function resolveTournamentChampion(params: {
  matches: TournamentBracketMatchInput[];
  seedByUserId?: Record<string, number>;
  championLabels?: string[];
}) {
  const knockoutMatches = params.matches.filter(
    (m) => m.tournamentRound != null && m.bracketSlot != null,
  );
  if (knockoutMatches.length === 0) {
    if ((params.championLabels?.length ?? 0) === 0) return null;
    return {
      name: params.championLabels!.join(" / "),
      players: [] as BracketPlayerView[],
      finalScore: null as string | null,
      seedLabel: null as string | null,
    };
  }
  const maxRound = knockoutMatches.reduce(
    (max, m) => Math.max(max, m.tournamentRound ?? 0),
    0,
  );
  return buildChampion({
    matches: knockoutMatches,
    maxRound,
    seedByUserId: params.seedByUserId ?? {},
    championLabels: params.championLabels ?? [],
  });
}

/**
 * Single-elimination tournament bracket board.
 * Visualizes existing match results only — does not mutate bracket state.
 * Live updates rely on org realtime → router.refresh.
 */
export function TournamentBracket({
  matches,
  seedByUserId = {},
  championLabels = [],
}: TournamentBracketProps) {
  const knockoutMatches = matches.filter(
    (m) => m.tournamentRound != null && m.bracketSlot != null,
  );

  if (knockoutMatches.length === 0) {
    return (
      <p className="text-text-secondary text-sm">
        Fikstür henüz oluşmadı. Turnuva başlatılınca eşleşmeler burada görünür.
      </p>
    );
  }

  const maxRound = knockoutMatches.reduce(
    (max, m) => Math.max(max, m.tournamentRound ?? 0),
    0,
  );

  const byRound = new Map<number, TournamentBracketMatchInput[]>();
  for (const match of knockoutMatches) {
    const round = match.tournamentRound!;
    const list = byRound.get(round) ?? [];
    list.push(match);
    byRound.set(round, list);
  }

  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  const champion = buildChampion({
    matches: knockoutMatches,
    maxRound,
    seedByUserId,
    championLabels,
  });

  return (
    <div className="tournament-bracket-shell">
      <div className="tournament-bracket" role="region" aria-label="Turnuva fikstürü">
        {rounds.map((round) => {
          const roundMatches = byRound.get(round) ?? [];
          const isFinalRound = round === maxRound;
          return (
            <BracketColumn
              key={round}
              title={bracketColumnTitle(round, maxRound)}
              showFeedConnectors={!isFinalRound}
              matches={roundMatches.map((match) => ({
                ...toCardProps(match, seedByUserId),
                bracketSlot: match.bracketSlot ?? 0,
              }))}
            />
          );
        })}

        {champion ? (
          <section
            className="bracket-column bracket-column--champion"
            aria-label="Şampiyon"
          >
            <h3 className="bracket-column-title">Şampiyon</h3>
            <div className="bracket-column-slots">
              <div className="bracket-slot">
                <BracketChampionCard
                  name={champion.name}
                  players={champion.players}
                  finalScore={champion.finalScore}
                  seedLabel={champion.seedLabel}
                />
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

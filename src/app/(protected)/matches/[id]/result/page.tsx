import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TournamentType } from "@prisma/client";

import { auth } from "@/auth";
import { PlannedResultForm } from "@/components/matches/planned-result-form";
import { canEnterResult, resolveMatchStatus, type MatchStatusValue } from "@/domain/match-status";
import { prisma } from "@/lib/db";
import { formatTeamLabel } from "@/lib/matches/display";
import { getMatchForOrganization } from "@/lib/matches/service";
import { withOrgScope } from "@/lib/org-scope";

export default async function EnterMatchResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const match = await getMatchForOrganization(session.user.organizationId, id);
  if (!match) notFound();

  const status = resolveMatchStatus(
    match.status as MatchStatusValue,
    match.scheduledAt,
  );

  const myParticipation = match.participants.find((p) => p.user.id === session.user.id);
  if (
    !myParticipation ||
    !canEnterResult(status, match.format, match.participants.length)
  ) {
    redirect(`/matches/${id}`);
  }

  const team1Label = formatTeamLabel(
    match.participants.map((p) => ({ team: p.team, user: p.user })),
    1,
    match.team1Name,
  );
  const team2Label = formatTeamLabel(
    match.participants.map((p) => ({ team: p.team, user: p.user })),
    2,
    match.team2Name,
  );

  let isTournamentFinal = false;
  let tournamentName: string | null = null;

  // Knockout final = highest tournamentRound with bracket slots (display-only check).
  if (
    match.tournamentId &&
    match.tournamentRound != null &&
    match.bracketSlot != null
  ) {
    const tournament = await prisma.tournament.findFirst({
      where: withOrgScope(session.user.organizationId, { id: match.tournamentId }),
      select: {
        name: true,
        type: true,
        matches: {
          where: {
            tournamentRound: { not: null },
            bracketSlot: { not: null },
          },
          select: { tournamentRound: true },
        },
      },
    });

    if (tournament?.type === TournamentType.KNOCKOUT) {
      tournamentName = tournament.name;
      const maxRound = tournament.matches.reduce(
        (max, m) => Math.max(max, m.tournamentRound ?? 0),
        0,
      );
      isTournamentFinal =
        maxRound > 0 && match.tournamentRound === maxRound;
    }
  }

  return (
    <div className="px-6 py-6">
      <div className="mx-auto mb-6 max-w-[680px]">
        <Link
          href={`/matches/${match.id}`}
          className="text-text-muted hover:text-text-secondary text-sm"
        >
          ← Maç detayı
        </Link>
        <h1 className="mt-2 text-xl font-bold text-text-primary">Sonuç Gir</h1>
        <p className="text-text-secondary mt-1 text-sm">
          {team1Label || "Takım 1"} vs {team2Label || "Takım 2"}
          {isTournamentFinal ? " · Final" : ""}
        </p>
      </div>
      <PlannedResultForm
        matchId={match.id}
        team1Label={team1Label || "Takım 1"}
        team2Label={team2Label || "Takım 2"}
        currentUserId={session.user.id}
        myTeam={myParticipation.team as 1 | 2}
        currentUser={{
          id: myParticipation.user.id,
          fullName: myParticipation.user.fullName,
          avatarUrl: myParticipation.user.avatarUrl,
          avatarColor: myParticipation.user.avatarColor,
        }}
        isTournamentFinal={isTournamentFinal}
        tournamentName={tournamentName}
      />
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { PlannedResultForm } from "@/components/matches/planned-result-form";
import { canEnterResult, resolveMatchStatus, type MatchStatusValue } from "@/domain/match-status";
import { formatTeamLabel } from "@/lib/matches/display";
import { getMatchForOrganization } from "@/lib/matches/service";

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

  const isParticipant = match.participants.some((p) => p.user.id === session.user.id);
  if (
    !isParticipant ||
    !canEnterResult(status, match.format, match.participants.length)
  ) {
    redirect(`/matches/${id}`);
  }

  const team1Label = formatTeamLabel(
    match.participants.map((p) => ({ team: p.team, user: p.user })),
    1,
  );
  const team2Label = formatTeamLabel(
    match.participants.map((p) => ({ team: p.team, user: p.user })),
    2,
  );

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
        </p>
      </div>
      <PlannedResultForm
        matchId={match.id}
        team1Label={team1Label || "Takım 1"}
        team2Label={team2Label || "Takım 2"}
      />
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { InstantMatchForm } from "@/components/matches/instant-match-form";
import {
  canManageMatch,
  getMatchForOrganization,
  getOrganizationPlayers,
} from "@/lib/matches/service";

export default async function EditMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const [match, players] = await Promise.all([
    getMatchForOrganization(session.user.organizationId, id),
    getOrganizationPlayers(session.user.organizationId),
  ]);

  if (!match) notFound();

  if (
    !canManageMatch({ id: session.user.id, role: session.user.role }, match) ||
    match.status !== "COMPLETED"
  ) {
    redirect(`/matches/${id}`);
  }

  const team1PlayerIds = match.participants
    .filter((p) => p.team === 1)
    .map((p) => p.user.id);
  const team2PlayerIds = match.participants
    .filter((p) => p.team === 2)
    .map((p) => p.user.id);

  const me = players.find((p) => p.id === session.user.id);

  return (
    <div className="px-6 py-6">
      <div className="mx-auto mb-6 max-w-[680px]">
        <Link
          href={`/matches/${match.id}`}
          className="text-text-muted hover:text-text-secondary text-sm"
        >
          ← Maç detayı
        </Link>
        <h1 className="mt-2 text-xl font-bold text-text-primary">Maçı Düzenle</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Skor veya katılımcı hatalarını buradan düzeltebilirsin.
        </p>
      </div>
      <InstantMatchForm
        mode="edit"
        matchId={match.id}
        currentUserId={session.user.id}
        currentUserName={session.user.fullName}
        currentUserAvatarUrl={me?.avatarUrl}
        players={players}
        initialValues={{
          format: match.format === "SINGLES" ? "SINGLES" : "DOUBLES",
          team1PlayerIds,
          team2PlayerIds,
          sets: match.sets.map((set) => ({
            team1Score: set.team1Score,
            team2Score: set.team2Score,
          })),
          stakeNote: match.stakeNote,
          team1Name: match.team1Name,
          team2Name: match.team2Name,
        }}
      />
    </div>
  );
}

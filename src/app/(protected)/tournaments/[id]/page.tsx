import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MatchStatus, TournamentStatus } from "@prisma/client";

import { auth } from "@/auth";
import {
  TournamentCancelButton,
  TournamentDraftActions,
} from "@/components/tournaments/tournament-actions";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  canEnterResult,
  matchStatusLabel,
  resolveMatchStatus,
  type MatchStatusValue,
} from "@/domain/match-status";
import {
  knockoutRoundLabel,
  tournamentStatusLabel,
  tournamentTypeLabel,
  type TournamentStatusValue,
  type TournamentTypeValue,
} from "@/domain/tournament";
import { formatTeamLabel } from "@/lib/matches/display";
import {
  canCancelTournament,
  getTournamentDetail,
} from "@/lib/tournaments/service";

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const detail = await getTournamentDetail(session.user.organizationId, id);
  if (!detail) notFound();

  const { tournament, entries, standings, championLabels } = detail;
  const status = tournament.status as TournamentStatusValue;
  const canCancel = canCancelTournament(
    { id: session.user.id, role: session.user.role },
    tournament,
  );

  const maxRound = tournament.matches.reduce(
    (max, m) => Math.max(max, m.tournamentRound ?? 0),
    0,
  );

  const entryLabel = (entryId: string) => {
    const entry = entries.find((e) => e.entryId === entryId);
    if (!entry) return entryId;
    return entry.userIds
      .map(
        (uid) =>
          tournament.participants.find((p) => p.userId === uid)?.user
            .fullName ?? uid,
      )
      .join(" / ");
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href="/tournaments"
        className="text-text-muted hover:text-text-secondary text-sm"
      >
        ← Turnuvalar
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            {tournament.name}
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            {tournamentTypeLabel(tournament.type as TournamentTypeValue)} ·{" "}
            {tournament.format === "SINGLES" ? "1v1" : "2v2"} ·{" "}
            {new Intl.DateTimeFormat("tr-TR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(tournament.startsAt)}
          </p>
        </div>
        <span className="badge badge-planned">
          {tournamentStatusLabel(status)}
        </span>
      </div>

      {championLabels.length > 0 ? (
        <div className="card mt-4 border border-emerald-500/30">
          <div className="text-text-muted text-xs font-bold uppercase">
            Şampiyon
          </div>
          <p className="mt-1 text-lg font-bold text-emerald-400">
            {championLabels.join(" / ")}
          </p>
        </div>
      ) : null}

      {tournament.status === TournamentStatus.DRAFT ? (
        <div className="card mt-6 space-y-4">
          <div>
            <h2 className="font-bold text-text-primary">Taslak</h2>
            <p className="text-text-secondary mt-1 text-sm">
              Katılımcı sırasını karıştırabilir veya turnuvayı başlatabilirsin.
            </p>
          </div>
          <ul className="space-y-2">
            {entries.map((entry, index) => (
              <li
                key={entry.entryId}
                className="flex items-center gap-2 text-sm text-text-primary"
              >
                <span className="text-text-muted w-6">#{index + 1}</span>
                {entryLabel(entry.entryId)}
              </li>
            ))}
          </ul>
          <TournamentDraftActions
            tournamentId={tournament.id}
            canCancel={canCancel}
          />
        </div>
      ) : null}

      {tournament.status === TournamentStatus.IN_PROGRESS && canCancel ? (
        <div className="mt-4">
          <TournamentCancelButton tournamentId={tournament.id} />
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-bold text-text-primary">Katılımcılar</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {tournament.participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-md border border-white/10 px-3 py-2"
            >
              <UserAvatar
                userId={p.user.id}
                fullName={p.user.fullName}
                avatarUrl={p.user.avatarUrl}
                size="sm"
              />
              <div>
                <Link
                  href={`/players/${p.user.id}`}
                  className="text-sm font-medium text-text-primary hover:text-accent-light"
                >
                  {p.user.fullName}
                </Link>
                {p.pairIndex != null ? (
                  <p className="text-text-muted text-xs">
                    Çift {p.pairIndex + 1}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {standings ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-text-primary">Puan tablosu</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="text-text-muted border-b border-white/10 text-xs uppercase">
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Takım</th>
                  <th className="px-2 py-2">O</th>
                  <th className="px-2 py-2">G</th>
                  <th className="px-2 py-2">M</th>
                  <th className="px-2 py-2">P</th>
                  <th className="px-2 py-2">SAV</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr
                    key={row.entryId}
                    className="border-b border-white/5 text-text-primary"
                  >
                    <td className="px-2 py-2">{row.rank}</td>
                    <td className="px-2 py-2 font-medium">
                      {entryLabel(row.entryId)}
                    </td>
                    <td className="px-2 py-2">{row.played}</td>
                    <td className="px-2 py-2">{row.wins}</td>
                    <td className="px-2 py-2">{row.losses}</td>
                    <td className="px-2 py-2 font-bold">{row.points}</td>
                    <td className="px-2 py-2">
                      {row.setDiff > 0 ? `+${row.setDiff}` : row.setDiff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-bold text-text-primary">Maçlar</h2>
        {tournament.matches.length === 0 ? (
          <p className="text-text-secondary mt-3 text-sm">
            Turnuva başlatılınca eşleşmeler burada görünür.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {tournament.matches.map((match) => {
              const resolved = resolveMatchStatus(
                match.status as MatchStatusValue,
                match.scheduledAt,
              );
              const team1 = match.participants.filter((p) => p.team === 1);
              const team2 = match.participants.filter((p) => p.team === 2);
              const enterable = canEnterResult(
                resolved,
                match.format,
                match.participants.length,
              );
              const isParticipant = match.participants.some(
                (p) => p.userId === session.user!.id,
              );
              const roundLabel =
                match.tournamentRound != null && maxRound > 0
                  ? knockoutRoundLabel(match.tournamentRound, maxRound)
                  : null;
              const isBye =
                match.status === MatchStatus.COMPLETED &&
                (team1.length === 0 || team2.length === 0);

              return (
                <li key={match.id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      {roundLabel ? (
                        <div className="text-text-muted text-xs font-bold uppercase">
                          {roundLabel}
                          {match.bracketSlot != null
                            ? ` · Maç ${match.bracketSlot + 1}`
                            : ""}
                        </div>
                      ) : null}
                      <p className="mt-1 text-sm font-semibold text-text-primary">
                        {team1.length
                          ? formatTeamLabel(
                              team1.map((p) => ({
                                team: 1,
                                user: { fullName: p.user.fullName },
                              })),
                              1,
                            )
                          : "BAY / Bekleniyor"}{" "}
                        <span className="text-text-muted">vs</span>{" "}
                        {team2.length
                          ? formatTeamLabel(
                              team2.map((p) => ({
                                team: 2,
                                user: { fullName: p.user.fullName },
                              })),
                              2,
                            )
                          : "BAY / Bekleniyor"}
                      </p>
                      {match.status === MatchStatus.COMPLETED &&
                      match.team1SetsWon != null &&
                      match.team2SetsWon != null ? (
                        <p className="text-text-secondary mt-1 text-sm">
                          {isBye
                            ? "BAY ile otomatik geçiş"
                            : `Set: ${match.team1SetsWon}–${match.team2SetsWon}`}
                        </p>
                      ) : null}
                    </div>
                    <span className="badge badge-planned">
                      {matchStatusLabel(resolved)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/matches/${match.id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      Detay
                    </Link>
                    {enterable && isParticipant ? (
                      <Link
                        href={`/matches/${match.id}/result`}
                        className="btn btn-primary btn-sm"
                      >
                        Sonuç gir
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

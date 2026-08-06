import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardLeaderboardSection } from "@/components/dashboard/dashboard-leaderboard-section";
import { FormBadges } from "@/components/players/form-badges";
import {
  canEnterResult,
  matchStatusLabel,
  resolveMatchStatus,
  type MatchStatusValue,
} from "@/domain/match-status";
import {
  countPendingIncoming,
  listIncomingChallenges,
} from "@/lib/challenges/service";
import { isMobilePhoneRequest } from "@/lib/device";
import { formatTeamLabel, formatWinnerLabel } from "@/lib/matches/display";
import { getRecentMatches, listUpcomingForUser } from "@/lib/matches/service";
import { getDashboardStatsSnippet } from "@/lib/stats/service";
import { getActiveTournaments } from "@/lib/tournaments/service";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  tournamentTypeLabel,
  type TournamentTypeValue,
} from "@/domain/tournament";

function pastStatusBadgeClass(status: MatchStatusValue): string {
  switch (status) {
    case "COMPLETED":
      return "badge-win";
    case "PLANNED":
      return "badge-planned";
    case "PENDING":
      return "badge-1v1";
    case "CANCELLED":
      return "";
    default:
      return "";
  }
}
export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const headerList = await headers();
  const ssrDesktop = !isMobilePhoneRequest(headerList);

  const [
    recentMatches,
    snippet,
    upcoming,
    pendingChallenges,
    incomingPreview,
    activeTournaments,
  ] = await Promise.all([
    getRecentMatches(session.user.organizationId, 5),
    getDashboardStatsSnippet(session.user.organizationId, session.user.id, {
      includeTop5: ssrDesktop,
    }),
    listUpcomingForUser(session.user.organizationId, session.user.id, 5),
    countPendingIncoming(session.user.organizationId, session.user.id),
    listIncomingChallenges(session.user.organizationId, session.user.id),
    getActiveTournaments(session.user.organizationId, 3),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div
        className="mb-6 overflow-hidden rounded-xl border p-6"
        style={{
          background:
            "linear-gradient(135deg,rgba(99,102,241,0.2) 0%,rgba(168,85,247,0.15) 100%)",
          borderColor: "rgba(99,102,241,0.25)",
        }}
      >
        <div className="text-accent-light text-sm font-semibold">Hoşgeldin 👋</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary">
          <Link href={`/players/${session.user.id}`} className="hover:text-accent-light">
            {session.user.fullName}
          </Link>
        </h1>
        <p className="text-text-secondary mt-1 text-sm">
          {session.user.organizationName} · Maçlarını kaydet, sıralamayı takip et.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <div className="text-text-muted text-[0.65rem] font-bold uppercase">Rekor</div>
            <p className="mt-1 text-lg font-bold">
              <span className="text-green">{snippet.overall.wins}G</span>
              {" – "}
              <span style={{ color: "#fb7185" }}>{snippet.overall.losses}M</span>
              <span className="text-text-secondary ml-2 text-sm font-semibold">
                %{snippet.overall.winRate}
              </span>
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <div className="text-text-muted text-[0.65rem] font-bold uppercase">Form</div>
            <div className="mt-1">
              <FormBadges form={snippet.recentForm} size="sm" />
            </div>
            {snippet.currentStreak ? (
              <p className="text-text-secondary mt-1 text-xs">
                {snippet.currentStreak.count}{" "}
                {snippet.currentStreak.type === "W" ? "galibiyet" : "mağlubiyet"} serisi
              </p>
            ) : null}
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <div className="text-text-muted text-[0.65rem] font-bold uppercase">Sıra</div>
            <p className="mt-1 text-lg font-bold">
              {snippet.rank != null ? `#${snippet.rank}` : "Henüz sıralanmadı"}
            </p>
            <Link
              href={`/players/${session.user.id}`}
              className="text-accent-light text-xs font-semibold"
            >
              Profilim →
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/matches/new"
          className="btn btn-primary flex h-14 items-center justify-center rounded-md text-base"
        >
          Maç Ekle
        </Link>
        <Link
          href="/matches/new?type=planned"
          className="btn btn-secondary flex h-14 items-center justify-center rounded-md text-base"
        >
          Maç Planla
        </Link>
        <Link
          href="/matches/new?type=challenge"
          className="btn btn-secondary flex h-14 items-center justify-center rounded-md text-base"
        >
          Meydan Oku
        </Link>
        <Link
          href="/leaderboard"
          className="btn btn-secondary flex h-14 items-center justify-center rounded-md text-base"
        >
          Sıralama
        </Link>
      </div>

      {pendingChallenges > 0 ? (
        <div className="card mb-8 border border-accent/30">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
              Bekleyen Teklifler ({pendingChallenges})
            </h2>
            <Link href="/challenges" className="text-accent-light text-sm font-semibold">
              Tümü →
            </Link>
          </div>
          <ul className="space-y-2">
            {incomingPreview.slice(0, 3).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold">{c.fromUser.fullName}</span>
                <Link href="/challenges" className="btn btn-primary btn-sm">
                  Yanıtla
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {activeTournaments.length > 0 ? (
        <div className="card mb-8 border border-accent/30">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
              Aktif Turnuvalar
            </h2>
            <Link
              href="/tournaments"
              className="text-accent-light text-sm font-semibold"
            >
              Tümü →
            </Link>
          </div>
          <ul className="space-y-2">
            {activeTournaments.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/[0.03]"
                >
                  <div>
                    <div className="font-semibold text-text-primary">{t.name}</div>
                    <div className="text-text-muted text-xs">
                      {tournamentTypeLabel(t.type as TournamentTypeValue)} ·{" "}
                      {t.format === "SINGLES" ? "1v1" : "2v2"}
                    </div>
                  </div>
                  <span className="text-accent-light text-xs font-semibold">
                    Aç →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
            Yaklaşan Maçlarım
          </h2>
          <Link
            href="/matches?time=UPCOMING"
            className="text-accent-light text-sm font-semibold"
          >
            Tümü →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="card text-center">
            <p className="text-text-secondary text-sm">
              Yaklaşan maçın yok. İleri tarihli bir maç planlayabilirsin.
            </p>
            <Link href="/matches/new?type=planned" className="btn btn-secondary btn-sm mt-3">
              Maç Planla
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((match) => {
              const status = resolveMatchStatus(
                match.status as MatchStatusValue,
                match.scheduledAt,
              );
              const team1 =
                formatTeamLabel(match.participants, 1, match.team1Name) || "Açık";
              const team2 =
                formatTeamLabel(match.participants, 2, match.team2Name) || "Açık";
              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border px-3 py-3 hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap gap-2">
                      <span className="badge badge-planned">{matchStatusLabel(status)}</span>
                      <span
                        className={`badge ${match.format === "SINGLES" ? "badge-1v1" : "badge-2v2"}`}
                      >
                        {match.format === "SINGLES" ? "1v1" : "2v2"}
                      </span>
                    </div>
                    <div className="truncate text-sm font-semibold">
                      {team1} <span className="text-text-muted font-normal">vs</span> {team2}
                    </div>
                  </div>
                  <div className="text-text-muted shrink-0 text-xs">
                    {match.scheduledAt
                      ? new Intl.DateTimeFormat("tr-TR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(match.scheduledAt)
                      : "Saat belirtilmedi"}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <DashboardLeaderboardSection
        currentUserId={session.user.id}
        initialTop5={snippet.top5}
        ssrDesktop={ssrDesktop}
      />

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          Geçmiş Maçlar
        </h2>
        <Link href="/matches?time=PAST" className="text-accent-light text-sm font-semibold">
          Tümü →
        </Link>
      </div>

      {recentMatches.length === 0 ? (
        <div className="card text-center">
          <p className="text-text-secondary text-sm">
            Henüz geçmiş maç yok. İlk maçını ekleyerek başla.
          </p>
          <Link href="/matches/new" className="btn btn-primary btn-sm mt-4">
            Maç Ekle
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recentMatches.map((match) => {
            const status = resolveMatchStatus(
              match.status as MatchStatusValue,
              match.scheduledAt,
            );
            const team1 = formatTeamLabel(match.participants, 1, match.team1Name);
            const team2 = formatTeamLabel(match.participants, 2, match.team2Name);
            const isCompleted = status === "COMPLETED";
            const winnerLabel = isCompleted
              ? formatWinnerLabel(match.participants, match.winnerTeam, {
                  team1Name: match.team1Name,
                  team2Name: match.team2Name,
                })
              : null;
            const team1Won = match.winnerTeam === 1;
            const team2Won = match.winnerTeam === 2;
            const isParticipant = match.participants.some(
              (p) => p.user.id === session.user.id,
            );
            const showEnter =
              isParticipant &&
              canEnterResult(status, match.format, match.participants.length);

            return (
              <Link key={match.id} href={`/matches/${match.id}`} className="match-card block">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap gap-2">
                      <span
                        className={`badge ${match.format === "SINGLES" ? "badge-1v1" : "badge-2v2"}`}
                      >
                        {match.format === "SINGLES" ? "1v1" : "2v2"}
                      </span>
                      <span className={`badge ${pastStatusBadgeClass(status)}`}>
                        {matchStatusLabel(status)}
                      </span>
                      {winnerLabel ? (
                        <span className="badge badge-win">👑 {winnerLabel}</span>
                      ) : null}
                    </div>
                    <div className="truncate text-sm font-semibold">
                      <span className={team1Won && isCompleted ? "text-yellow" : ""}>
                        {team1Won && isCompleted ? "👑 " : ""}
                        {team1}
                      </span>{" "}
                      <span className="text-text-muted font-normal">vs</span>{" "}
                      <span className={team2Won && isCompleted ? "text-yellow" : ""}>
                        {team2Won && isCompleted ? "👑 " : ""}
                        {team2}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="flex -space-x-1">
                      {match.participants.slice(0, 4).map((p) => (
                        <UserAvatar
                          key={p.id}
                          userId={p.user.id}
                          fullName={p.user.fullName}
                          avatarUrl={p.user.avatarUrl}
                          avatarColor={p.user.avatarColor}
                          size="xs"
                          className="border border-bg-900"
                          style={{
                            boxShadow:
                              isCompleted && p.team === match.winnerTeam
                                ? "0 0 0 1px rgba(234,179,8,0.8)"
                                : undefined,
                          }}
                        />
                      ))}
                    </div>
                    {isCompleted ? (
                      <div className="match-score text-lg">
                        <span className={team1Won ? "text-green" : ""}>
                          {match.team1SetsWon}
                        </span>
                        -
                        <span className={team2Won ? "text-green" : ""}>
                          {match.team2SetsWon}
                        </span>
                      </div>
                    ) : showEnter ? (
                      <span className="btn btn-primary btn-sm pointer-events-none">
                        Skor Gir
                      </span>
                    ) : (
                      <span className="text-text-muted text-xs">Skor yok</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

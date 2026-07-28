import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  canEnterResult,
  isRosterFull,
  isWaitingForMatchTime,
  matchStatusLabel,
  resolveMatchStatus,
  type MatchStatusValue,
} from "@/domain/match-status";
import {
  matchTimeFilterLabel,
  type MatchListTimeFilter,
} from "@/domain/match-time-filter";
import { formatTeamLabel, formatWinnerLabel } from "@/lib/matches/display";
import { UserAvatar } from "@/components/ui/user-avatar";
import { StakeNoteBadge } from "@/components/matches/stake-controls";
import {
  listMatchesForOrganization,
  type MatchListStatusFilter,
} from "@/lib/matches/service";

function parseStatus(value: string | undefined): MatchListStatusFilter {
  if (
    value === "COMPLETED" ||
    value === "PLANNED" ||
    value === "PENDING" ||
    value === "CANCELLED"
  ) {
    return value;
  }
  return "ALL";
}

function parseTime(value: string | undefined): MatchListTimeFilter {
  if (
    value === "TODAY" ||
    value === "WEEK" ||
    value === "MONTH" ||
    value === "UPCOMING" ||
    value === "PAST"
  ) {
    return value;
  }
  return "ALL";
}

function statusBadgeClass(status: MatchStatusValue): string {
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

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; time?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const status = parseStatus(params.status);
  const time = parseTime(params.time);

  const { matches, total, totalPages, page: currentPage } = await listMatchesForOrganization(
    session.user.organizationId,
    { page, pageSize: 20, status, time },
  );

  const statusTabs: Array<{ key: MatchListStatusFilter; label: string }> = [
    { key: "ALL", label: "Tümü" },
    { key: "COMPLETED", label: "Tamamlandı" },
    { key: "PLANNED", label: "Planlandı" },
    { key: "PENDING", label: "Bekliyor" },
    { key: "CANCELLED", label: "İptal" },
  ];

  const timeTabs: MatchListTimeFilter[] = [
    "ALL",
    "TODAY",
    "WEEK",
    "MONTH",
    "UPCOMING",
    "PAST",
  ];

  function hrefFor(
    next: { status?: MatchListStatusFilter; time?: MatchListTimeFilter; page?: number },
  ) {
    const s = next.status ?? status;
    const t = next.time ?? time;
    const p = next.page ?? 1;
    const sp = new URLSearchParams();
    if (s !== "ALL") sp.set("status", s);
    if (t !== "ALL") sp.set("time", t);
    if (p > 1) sp.set("page", String(p));
    const q = sp.toString();
    return `/matches${q ? `?${q}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-text-muted hover:text-text-secondary text-sm">
            ← Ana sayfa
          </Link>
          <h1 className="mt-2 text-xl font-bold text-text-primary">Maçlar</h1>
          <p className="text-text-secondary text-sm">{total} maç</p>
        </div>
        <div className="flex gap-2">
          <Link href="/matches/new?type=planned" className="btn btn-secondary btn-sm">
            Planla
          </Link>
          <Link href="/matches/new?type=challenge" className="btn btn-secondary btn-sm">
            Meydan Oku
          </Link>
          <Link href="/matches/new" className="btn btn-primary btn-sm">
            + Maç Ekle
          </Link>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
          Zaman
        </p>
        <div className="flex flex-wrap gap-2">
          {timeTabs.map((key) => (
            <Link
              key={key}
              href={hrefFor({ time: key, page: 1 })}
              className={`badge min-h-9 px-3 ${time === key ? "badge-win" : "badge-planned"}`}
            >
              {matchTimeFilterLabel(key)}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
          Durum
        </p>
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <Link
              key={tab.key}
              href={hrefFor({ status: tab.key, page: 1 })}
              className={`badge min-h-9 px-3 ${status === tab.key ? "badge-win" : "badge-planned"}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🏓</div>
          <div className="empty-title">Bu filtrede maç yok</div>
          <p className="empty-desc">
            Zaman veya durum filtresini değiştir, ya da yeni maç ekle.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/matches" className="btn btn-secondary">
              Filtreleri temizle
            </Link>
            <Link href="/matches/new?type=challenge" className="btn btn-secondary">
              Meydan Oku
            </Link>
            <Link href="/matches/new" className="btn btn-primary">
              Maç Ekle
            </Link>
            <Link href="/matches/new?type=planned" className="btn btn-secondary">
              Maç Planla
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const resolved = resolveMatchStatus(
              match.status as MatchStatusValue,
              match.scheduledAt,
            );
            const team1Label = formatTeamLabel(match.participants, 1) || "Açık";
            const team2Label = formatTeamLabel(match.participants, 2) || "Açık";
            const isCompleted = resolved === "COMPLETED";
            const winnerLabel = isCompleted
              ? formatWinnerLabel(match.participants, match.winnerTeam)
              : null;
            const team1Won = match.winnerTeam === 1;
            const team2Won = match.winnerTeam === 2;
            const isParticipant = match.participants.some(
              (p) => p.user.id === session.user.id,
            );
            const showEnter =
              isParticipant &&
              canEnterResult(resolved, match.format, match.participants.length);
            const waiting =
              isParticipant &&
              isWaitingForMatchTime(resolved, match.format, match.participants.length);

            return (
              <Link key={match.id} href={`/matches/${match.id}`} className="match-card block">
                <div className="match-card-header">
                  <span
                    className={`badge ${match.format === "SINGLES" ? "badge-1v1" : "badge-2v2"}`}
                  >
                    {match.format === "SINGLES" ? "1v1" : "2v2"}
                  </span>
                  <span className={`badge ${statusBadgeClass(resolved)}`}>
                    {matchStatusLabel(resolved)}
                  </span>
                  {winnerLabel ? (
                    <span className="badge badge-win">👑 {winnerLabel}</span>
                  ) : null}
                  {!isRosterFull(match.format, match.participants.length) &&
                  (resolved === "PLANNED" || resolved === "PENDING") ? (
                    <span className="badge">Açık maç</span>
                  ) : null}
                  <StakeNoteBadge
                    stakeNote={match.stakeNote}
                    stakeSettled={match.stakeSettled}
                    completed={isCompleted}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate font-semibold ${team1Won && isCompleted ? "text-yellow" : "text-text-primary"}`}
                    >
                      {team1Won && isCompleted ? "👑 " : ""}
                      {team1Label}
                    </div>
                    <div className="text-text-muted text-xs">vs</div>
                    <div
                      className={`truncate font-semibold ${team2Won && isCompleted ? "text-yellow" : "text-text-primary"}`}
                    >
                      {team2Won && isCompleted ? "👑 " : ""}
                      {team2Label}
                    </div>
                  </div>
                  {isCompleted ? (
                    <div className="match-score text-right">
                      <span className={team1Won ? "text-green" : ""}>
                        {match.team1SetsWon ?? 0}
                      </span>
                      -
                      <span className={team2Won ? "text-green" : ""}>
                        {match.team2SetsWon ?? 0}
                      </span>
                    </div>
                  ) : showEnter ? (
                    <span className="btn btn-primary btn-sm">Sonuç Gir</span>
                  ) : waiting ? (
                    <span className="text-text-muted text-right text-xs">
                      Saat bekleniyor
                    </span>
                  ) : null}
                </div>
                <div className="text-text-muted mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex -space-x-1">
                    {match.participants.slice(0, 4).map((p) => (
                      <UserAvatar
                        key={p.id}
                        userId={p.user.id}
                        fullName={p.user.fullName}
                        avatarUrl={p.user.avatarUrl}
                        size="xs"
                        className="border border-bg-900"
                      />
                    ))}
                  </div>
                  {match.scheduledAt
                    ? new Intl.DateTimeFormat("tr-TR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(match.scheduledAt)
                    : match.playedAt
                      ? new Intl.DateTimeFormat("tr-TR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(match.playedAt)
                      : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-6 flex justify-center gap-2">
          {currentPage > 1 ? (
            <Link
              href={hrefFor({ page: currentPage - 1 })}
              className="btn btn-secondary btn-sm"
            >
              Önceki
            </Link>
          ) : null}
          <span className="text-text-muted self-center text-sm">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link
              href={hrefFor({ page: currentPage + 1 })}
              className="btn btn-secondary btn-sm"
            >
              Sonraki
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

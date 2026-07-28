import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { FormBadges } from "@/components/players/form-badges";
import { HistoryFilters } from "@/components/players/history-filters";
import { MatchHistoryList } from "@/components/players/match-history-list";
import { MIN_MATCHES_FOR_RANKING } from "@/domain/constants";
import type { RecordStats } from "@/domain/player-stats";
import { formatTeamLabel } from "@/lib/matches/display";
import { listUnpaidStakesForUser } from "@/lib/matches/service";
import {
  getPlayerProfileStats,
  parseHistoryFormat,
} from "@/lib/stats/service";
import { UserAvatar } from "@/components/ui/user-avatar";

function StatBlock({
  title,
  record,
}: {
  title: string;
  record: RecordStats;
}) {
  return (
    <div className="rounded-md border border-border bg-white/[0.02] p-3">
      <div className="text-text-muted mb-2 text-[0.7rem] font-bold uppercase tracking-wider">
        {title}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-lg font-bold">{record.played}</div>
          <div className="text-text-muted text-[0.65rem]">Oynanan</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green">{record.wins}</div>
          <div className="text-text-muted text-[0.65rem]">Galibiyet</div>
        </div>
        <div>
          <div className="text-lg font-bold" style={{ color: "#fb7185" }}>
            {record.losses}
          </div>
          <div className="text-text-muted text-[0.65rem]">Mağlubiyet</div>
        </div>
        <div>
          <div className="text-lg font-bold text-accent-light">%{record.winRate}</div>
          <div className="text-text-muted text-[0.65rem]">Kazanma</div>
        </div>
      </div>
    </div>
  );
}

export default async function PlayerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    format?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const query = await searchParams;
  const format = parseHistoryFormat(query.format);
  const page = Number(query.page ?? "1") || 1;

  const profile = await getPlayerProfileStats(session.user.organizationId, id, {
    format,
    from: query.from,
    to: query.to,
    page,
    pageSize: 20,
  });

  if (!profile) notFound();

  const unpaidStakes = await listUnpaidStakesForUser(
    session.user.organizationId,
    id,
  );

  const { user, stats, rank, history } = profile;
  const isSelf = session.user.id === user.id;

  function pageHref(nextPage: number) {
    const sp = new URLSearchParams();
    if (format !== "ALL") sp.set("format", format.toLowerCase());
    if (query.from) sp.set("from", query.from);
    if (query.to) sp.set("to", query.to);
    if (nextPage > 1) sp.set("page", String(nextPage));
    const q = sp.toString();
    return `/players/${user.id}${q ? `?${q}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/players" className="text-text-muted hover:text-text-secondary text-sm">
        ← Oyuncular
      </Link>

      <div className="card mt-4">
        <div className="flex flex-wrap items-start gap-4">
          <UserAvatar
            userId={user.id}
            fullName={user.fullName}
            avatarUrl={user.avatarUrl}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary">{user.fullName}</h1>
              {isSelf ? <span className="badge badge-planned">Sen</span> : null}
              {rank != null ? (
                <span className="badge badge-win">Sıra #{rank}</span>
              ) : (
                <span className="badge">Henüz sıralanmadı</span>
              )}
            </div>
            <p className="text-text-secondary mt-1 text-sm">
              Katılım:{" "}
              {new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(user.createdAt)}
            </p>
            {!isSelf ? (
              <Link
                href={`/players/${user.id}/challenge`}
                className="btn btn-primary btn-sm mt-3"
              >
                Meydan Oku
              </Link>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div>
                <div className="text-text-muted mb-1 text-[0.65rem] font-bold uppercase">
                  Son 5 form
                </div>
                <FormBadges form={stats.recentForm} />
              </div>
              {stats.currentStreak ? (
                <div>
                  <div className="text-text-muted mb-1 text-[0.65rem] font-bold uppercase">
                    Seri
                  </div>
                  <p className="text-sm font-semibold">
                    {stats.currentStreak.count}{" "}
                    {stats.currentStreak.type === "W" ? "galibiyet" : "mağlubiyet"}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {unpaidStakes.length > 0 ? (
        <div className="card mt-4 border border-orange/30">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
            Ödenmemiş iddialar ({unpaidStakes.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {unpaidStakes.map((match) => (
              <li key={match.id}>
                <Link
                  href={`/matches/${match.id}`}
                  className="flex min-h-11 flex-col gap-1 rounded-md border border-white/10 px-3 py-2 hover:bg-white/[0.03]"
                >
                  <span className="text-sm font-semibold text-text-primary">
                    {match.stakeNote}
                  </span>
                  <span className="text-text-muted text-xs">
                    {formatTeamLabel(match.participants, 1)} vs{" "}
                    {formatTeamLabel(match.participants, 2)}
                    {match.playedAt
                      ? ` · ${new Intl.DateTimeFormat("tr-TR", {
                          dateStyle: "medium",
                        }).format(match.playedAt)}`
                      : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {stats.overall.played === 0 ? (
        <div className="card empty-state mt-4">
          <div className="empty-title">Henüz maç yok</div>
          <p className="empty-desc">
            {isSelf
              ? "İlk maçını kaydederek istatistiklerini doldurmaya başla."
              : "Bu oyuncunun henüz tamamlanmış maçı yok."}
          </p>
          {isSelf ? (
            <Link href="/matches/new" className="btn btn-primary">
              Maç Ekle
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatBlock title="Toplam" record={stats.overall} />
            <StatBlock title="1v1" record={stats.singles} />
            <StatBlock title="2v2" record={stats.doubles} />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-white/[0.02] p-3">
              <div className="text-text-muted mb-2 text-[0.7rem] font-bold uppercase tracking-wider">
                Set İstatistikleri
              </div>
              <p className="text-sm">
                Kazanılan {stats.sets.won} · Kaybedilen {stats.sets.lost}
              </p>
              <p className="mt-1 text-lg font-bold">
                Set Averajı:{" "}
                <span className={stats.sets.average >= 0 ? "text-green" : ""}>
                  {stats.sets.average > 0 ? "+" : ""}
                  {stats.sets.average}
                </span>
              </p>
            </div>
            <div className="rounded-md border border-border bg-white/[0.02] p-3">
              <div className="text-text-muted mb-2 text-[0.7rem] font-bold uppercase tracking-wider">
                Sayı İstatistikleri
              </div>
              <p className="text-sm">
                Atılan {stats.points.won} · Yenilen {stats.points.lost}
              </p>
              <p className="mt-1 text-lg font-bold">
                Sayı Averajı:{" "}
                <span className={stats.points.average >= 0 ? "text-green" : ""}>
                  {stats.points.average > 0 ? "+" : ""}
                  {stats.points.average}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-white/[0.02] p-3">
              <div className="text-text-muted mb-1 text-[0.7rem] font-bold uppercase tracking-wider">
                En çok oynanan rakip
              </div>
              {stats.topOpponent ? (
                <p className="text-sm font-semibold">
                  <Link
                    href={`/players/${stats.topOpponent.userId}`}
                    className="text-accent-light hover:underline"
                  >
                    {stats.topOpponent.fullName}
                  </Link>
                  {" — "}
                  {stats.topOpponent.wins}G-{stats.topOpponent.losses}M
                </p>
              ) : (
                <p className="text-text-muted text-sm">Veri yok</p>
              )}
            </div>
            <div className="rounded-md border border-border bg-white/[0.02] p-3">
              <div className="text-text-muted mb-1 text-[0.7rem] font-bold uppercase tracking-wider">
                En çok kazandığı partner (2v2)
              </div>
              {stats.topPartner && stats.topPartner.wins > 0 ? (
                <p className="text-sm font-semibold">
                  <Link
                    href={`/players/${stats.topPartner.userId}`}
                    className="text-accent-light hover:underline"
                  >
                    {stats.topPartner.fullName}
                  </Link>
                  {" — "}
                  {stats.topPartner.wins} galibiyet
                </p>
              ) : (
                <p className="text-text-muted text-sm">Veri yok</p>
              )}
            </div>
          </div>

          {rank == null && stats.overall.played > 0 ? (
            <p className="text-text-muted mt-3 text-xs">
              Sıralamaya girmek için en az {MIN_MATCHES_FOR_RANKING} maç gerekir (şu an{" "}
              {stats.overall.played}).
            </p>
          ) : null}

          <div className="card mt-6">
            <div className="card-title">Maç Geçmişi</div>
            <HistoryFilters
              playerId={user.id}
              format={format === "ALL" ? "all" : format.toLowerCase()}
              from={query.from ?? ""}
              to={query.to ?? ""}
            />
            <div className="mt-4">
              <MatchHistoryList rows={history.rows} />
            </div>
            {history.totalPages > 1 ? (
              <div className="mt-4 flex justify-center gap-2">
                {history.page > 1 ? (
                  <Link href={pageHref(history.page - 1)} className="btn btn-secondary btn-sm">
                    Önceki
                  </Link>
                ) : null}
                <span className="text-text-muted self-center text-sm">
                  {history.page} / {history.totalPages}
                </span>
                {history.page < history.totalPages ? (
                  <Link href={pageHref(history.page + 1)} className="btn btn-secondary btn-sm">
                    Sonraki
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

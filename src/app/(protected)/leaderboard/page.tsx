import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MIN_MATCHES_FOR_RANKING } from "@/domain/constants";
import { getLeaderboard, parseLeaderboardTab } from "@/lib/stats/service";
import { UserAvatar } from "@/components/ui/user-avatar";

function formatAvg(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

function medalForRank(rank: number | null): string | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

type BoardEntry = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  played: number;
  wins: number;
  losses: number;
  winRate: number;
  setAverage: number;
  pointAverage: number;
  rank: number | null;
};

function StatCell({ label, value, className = "" }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="min-w-0 text-center">
      <div className="text-text-muted text-[0.58rem] font-semibold leading-tight hyphens-auto">
        {label}
      </div>
      <div className={`mt-0.5 text-sm font-semibold tabular-nums whitespace-nowrap ${className}`}>
        {value}
      </div>
    </div>
  );
}

function LeaderboardMobileCard({
  entry,
  isSelf,
}: {
  entry: BoardEntry;
  isSelf: boolean;
}) {
  const medal = medalForRank(entry.rank);

  return (
    <Link
      href={`/players/${entry.userId}`}
      className="leaderboard-mobile-card block"
      style={{
        background: isSelf
          ? "rgba(99,102,241,0.12)"
          : entry.rank != null && entry.rank <= 3
            ? "rgba(234,179,8,0.05)"
            : undefined,
        borderColor: isSelf ? "rgba(99,102,241,0.35)" : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex w-10 shrink-0 flex-col items-center pt-0.5">
          {medal ? (
            <span className="text-lg leading-none" aria-hidden="true">
              {medal}
            </span>
          ) : null}
          <span className="text-text-primary mt-0.5 text-sm font-extrabold tabular-nums">
            #{entry.rank}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <UserAvatar
              userId={entry.userId}
              fullName={entry.fullName}
              avatarUrl={entry.avatarUrl}
              size="sm"
            />
            <div className="min-w-0">
              <div className="text-text-primary break-words text-sm font-bold leading-snug">
                {entry.fullName}
                {isSelf ? (
                  <span className="text-accent-light ml-1 text-xs font-semibold">(Sen)</span>
                ) : null}
              </div>
              <div className="text-text-muted mt-0.5 text-xs tabular-nums">
                {entry.played} maç oynandı
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-5 gap-1 border-t border-white/5 pt-3">
            <StatCell label="Galibiyet" value={entry.wins} className="text-green" />
            <StatCell label="Mağlubiyet" value={entry.losses} className="text-red-light" />
            <StatCell label="Kazanma %" value={`%${entry.winRate}`} />
            <StatCell label="Set Averajı" value={formatAvg(entry.setAverage)} />
            <StatCell label="Sayı Averajı" value={formatAvg(entry.pointAverage)} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const tab = parseLeaderboardTab(params.tab);
  const board = await getLeaderboard(session.user.organizationId, tab);

  const tabs = [
    { key: "all", label: "Genel", filter: "ALL" as const },
    { key: "singles", label: "1v1", filter: "SINGLES" as const },
    { key: "doubles", label: "2v2", filter: "DOUBLES" as const },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-text-muted hover:text-text-secondary text-sm">
        ← Ana sayfa
      </Link>
      <h1 className="mt-2 text-xl font-bold text-text-primary">Sıralama</h1>
      <p className="text-text-secondary mt-1 text-sm">
        Tüm zamanlar · min. {MIN_MATCHES_FOR_RANKING} maç barajı
      </p>

      <div className="toggle-group mt-4">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/leaderboard" : `/leaderboard?tab=${t.key}`}
            className={`toggle-btn ${tab === t.filter ? "active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {board.ranked.length === 0 && board.unranked.length === 0 ? (
        <div className="card empty-state mt-6">
          <div className="empty-title">Henüz oyuncu yok</div>
          <p className="empty-desc">Organizasyona üye ekleyerek başla.</p>
        </div>
      ) : null}

      {board.ranked.length === 0 && board.unranked.length > 0 ? (
        <div className="card mt-6 text-center">
          <p className="text-text-secondary text-sm">
            Henüz kimse sıralamaya girecek kadar maç oynamadı (min.{" "}
            {MIN_MATCHES_FOR_RANKING} maç).
          </p>
        </div>
      ) : null}

      {board.ranked.length > 0 ? (
        <>
          {/* Mobile: card list */}
          <div className="mt-6 space-y-3 md:hidden">
            {board.ranked.map((entry) => (
              <LeaderboardMobileCard
                key={entry.userId}
                entry={entry}
                isSelf={entry.userId === session.user.id}
              />
            ))}
          </div>

          {/* Desktop: table (unchanged layout) */}
          <div className="card mt-6 hidden overflow-x-auto p-0 md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-[0.7rem] font-bold">
                  <th className="px-3 py-3">Sıra</th>
                  <th className="px-3 py-3">Oyuncu</th>
                  <th className="px-3 py-3 text-center">Oynanan</th>
                  <th className="px-3 py-3 text-center">Galibiyet</th>
                  <th className="px-3 py-3 text-center">Mağlubiyet</th>
                  <th className="px-3 py-3 text-center">Kazanma %</th>
                  <th className="px-3 py-3 text-center">Set Averajı</th>
                  <th className="px-3 py-3 text-center">Sayı Averajı</th>
                </tr>
              </thead>
              <tbody>
                {board.ranked.map((entry) => {
                  const isSelf = entry.userId === session.user.id;
                  const medal = medalForRank(entry.rank);

                  return (
                    <tr
                      key={entry.userId}
                      className="border-b border-border/60"
                      style={{
                        background: isSelf
                          ? "rgba(99,102,241,0.12)"
                          : entry.rank != null && entry.rank <= 3
                            ? "rgba(234,179,8,0.05)"
                            : undefined,
                      }}
                    >
                      <td className="px-3 py-3 font-bold">
                        {medal ? (
                          <span title={`${entry.rank}. sıra`}>
                            {medal} {entry.rank}
                          </span>
                        ) : (
                          entry.rank
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/players/${entry.userId}`}
                          className="flex min-h-11 items-center gap-2 font-semibold hover:text-accent-light"
                        >
                          <UserAvatar
                            userId={entry.userId}
                            fullName={entry.fullName}
                            avatarUrl={entry.avatarUrl}
                            size="xs"
                          />
                          <span>
                            {entry.fullName}
                            {isSelf ? (
                              <span className="text-accent-light ml-1 text-xs">(Sen)</span>
                            ) : null}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-center">{entry.played}</td>
                      <td className="px-3 py-3 text-center text-green">{entry.wins}</td>
                      <td className="px-3 py-3 text-center" style={{ color: "#fb7185" }}>
                        {entry.losses}
                      </td>
                      <td className="px-3 py-3 text-center">{entry.winRate}</td>
                      <td className="px-3 py-3 text-center">{formatAvg(entry.setAverage)}</td>
                      <td className="px-3 py-3 text-center">{formatAvg(entry.pointAverage)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {board.unranked.length > 0 ? (
        <div className="card mt-6">
          <div className="card-title">
            Henüz sıralanmadı (min. {MIN_MATCHES_FOR_RANKING} maç)
          </div>
          <ul className="space-y-2">
            {board.unranked.map((entry) => {
              const isSelf = entry.userId === session.user.id;
              return (
                <li key={entry.userId}>
                  <Link
                    href={`/players/${entry.userId}`}
                    className="flex min-h-11 flex-col gap-2 rounded-md border border-border px-3 py-2.5 hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    style={{
                      background: isSelf ? "rgba(99,102,241,0.1)" : undefined,
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-2 font-semibold">
                      <UserAvatar
                        userId={entry.userId}
                        fullName={entry.fullName}
                        avatarUrl={entry.avatarUrl}
                        size="xs"
                      />
                      <span className="min-w-0 break-words">
                        {entry.fullName}
                        {isSelf ? (
                          <span className="text-accent-light ml-1 text-xs">(Sen)</span>
                        ) : null}
                      </span>
                    </span>
                    <span className="text-text-muted shrink-0 text-sm tabular-nums">
                      {entry.played} maç · {entry.wins}G-{entry.losses}M
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

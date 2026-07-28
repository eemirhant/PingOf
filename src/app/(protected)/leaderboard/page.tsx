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
    <div className="mx-auto max-w-4xl px-6 py-8">
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
        <div className="card mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-[0.7rem] uppercase tracking-wider">
                <th className="px-3 py-3 font-bold">#</th>
                <th className="px-3 py-3 font-bold">Oyuncu</th>
                <th className="px-3 py-3 text-center font-bold">O</th>
                <th className="px-3 py-3 text-center font-bold">G</th>
                <th className="px-3 py-3 text-center font-bold">M</th>
                <th className="px-3 py-3 text-center font-bold">%</th>
                <th className="px-3 py-3 text-center font-bold">SAV</th>
                <th className="px-3 py-3 text-center font-bold">SYAV</th>
              </tr>
            </thead>
            <tbody>
              {board.ranked.map((entry) => {
                const isSelf = entry.userId === session.user.id;
                const medal =
                  entry.rank === 1
                    ? "🥇"
                    : entry.rank === 2
                      ? "🥈"
                      : entry.rank === 3
                        ? "🥉"
                        : null;

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
                    className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border px-3 py-2 hover:bg-white/[0.03]"
                    style={{
                      background: isSelf ? "rgba(99,102,241,0.1)" : undefined,
                    }}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <UserAvatar
                        userId={entry.userId}
                        fullName={entry.fullName}
                        avatarUrl={entry.avatarUrl}
                        size="xs"
                      />
                      {entry.fullName}
                      {isSelf ? (
                        <span className="text-accent-light text-xs">(Sen)</span>
                      ) : null}
                    </span>
                    <span className="text-text-muted text-sm">
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

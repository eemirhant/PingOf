"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { UserAvatar } from "@/components/ui/user-avatar";
import { loadDashboardTop5Action } from "@/lib/actions/dashboard";

/** Tailwind `sm` breakpoint — tablet/desktop keep the section. */
const DESKTOP_MQ = "(min-width: 640px)";

export type DashboardTop5Entry = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  rank: number | null;
  wins: number;
  winRate: number;
};

type DashboardLeaderboardSectionProps = {
  currentUserId: string;
  /** Preloaded on desktop SSR; null when skipped for mobile requests. */
  initialTop5: DashboardTop5Entry[] | null;
  /** Server guess from UA / client hints — used for SSR snapshot. */
  ssrDesktop: boolean;
};

function subscribeDesktop(onStoreChange: () => void) {
  const mq = window.matchMedia(DESKTOP_MQ);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_MQ).matches;
}

/**
 * Desktop-only "Liderlik — İlk 5" on the home dashboard.
 * Returns null under 640px so the block is not in the mobile DOM.
 */
export function DashboardLeaderboardSection({
  currentUserId,
  initialTop5,
  ssrDesktop,
}: DashboardLeaderboardSectionProps) {
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    () => ssrDesktop,
  );
  const [top5, setTop5] = useState<DashboardTop5Entry[] | null>(initialTop5);

  useEffect(() => {
    setTop5(initialTop5);
  }, [initialTop5]);

  useEffect(() => {
    if (!isDesktop || top5 !== null) return;

    let cancelled = false;
    void loadDashboardTop5Action().then((rows) => {
      if (!cancelled) setTop5(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [isDesktop, top5]);

  if (!isDesktop) return null;
  if (top5 === null) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          Liderlik — İlk 5
        </h2>
        <Link href="/leaderboard" className="text-accent-light text-sm font-semibold">
          Tümü →
        </Link>
      </div>
      {top5.length === 0 ? (
        <div className="card text-center">
          <p className="text-text-secondary text-sm">
            Sıralamaya girmek için en az 3 maç gerekir.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {top5.map((entry) => {
            const isSelf = entry.userId === currentUserId;
            return (
              <Link
                key={entry.userId}
                href={`/players/${entry.userId}`}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border px-3 py-2 hover:bg-white/[0.03]"
                style={{
                  background: isSelf ? "rgba(99,102,241,0.1)" : undefined,
                }}
              >
                <span className="flex items-center gap-2 font-semibold">
                    <span className="text-text-muted w-6 text-sm">
                      #{entry.rank ?? "–"}
                    </span>
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
                  {entry.wins}G · %{entry.winRate}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

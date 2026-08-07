"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { AchievementUnlockWatcher } from "@/components/achievements/achievement-unlock-watcher";
import { AchievementsPanel } from "@/components/achievements/achievements-panel";
import type { AchievementProgress } from "@/domain/achievements";

type PlayerProfileTabsProps = {
  playerId: string;
  isSelf: boolean;
  achievements: AchievementProgress[];
  overview: ReactNode;
};

export function PlayerProfileTabs({
  playerId,
  isSelf,
  achievements,
  overview,
}: PlayerProfileTabsProps) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "achievements" ? "achievements" : "overview";

  function hrefFor(next: "overview" | "achievements") {
    if (next === "overview") return `/players/${playerId}`;
    return `/players/${playerId}?tab=achievements`;
  }

  return (
    <div className="mt-4">
      <div className="profile-tabs" role="tablist" aria-label="Profil sekmeleri">
        <Link
          href={hrefFor("overview")}
          role="tab"
          aria-selected={tab === "overview"}
          className={`profile-tab ${tab === "overview" ? "is-active" : ""}`}
        >
          Özet
        </Link>
        <Link
          href={hrefFor("achievements")}
          role="tab"
          aria-selected={tab === "achievements"}
          className={`profile-tab ${tab === "achievements" ? "is-active" : ""}`}
        >
          Başarılar
        </Link>
      </div>

      {tab === "achievements" ? (
        <div className="mt-4" role="tabpanel">
          <AchievementsPanel achievements={achievements} />
        </div>
      ) : (
        <div role="tabpanel">{overview}</div>
      )}

      <AchievementUnlockWatcher
        userId={playerId}
        enabled={isSelf}
        achievements={achievements}
      />
    </div>
  );
}

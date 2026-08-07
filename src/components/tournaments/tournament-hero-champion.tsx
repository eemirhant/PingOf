"use client";

import { useEffect, useState } from "react";

import { UserAvatar } from "@/components/ui/user-avatar";

export type TournamentHeroChampionProps = {
  name: string;
  finalScore: string | null;
  players: Array<{
    userId: string;
    fullName: string;
    avatarUrl?: string | null;
    avatarColor?: string | null;
  }>;
};

/**
 * Large champion banner above the bracket (display-only).
 */
export function TournamentHeroChampion({
  name,
  finalScore,
  players,
}: TournamentHeroChampionProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, [name]);

  const primary = players[0];

  return (
    <section
      className={`tournament-hero-champion ${animate ? "is-visible" : ""}`}
      aria-label={`Turnuva Şampiyonu: ${name}`}
    >
      <div className="tournament-hero-champion__glow" aria-hidden />
      <div className="tournament-hero-champion__trophy" aria-hidden>
        🏆
      </div>
      <p className="tournament-hero-champion__eyebrow">Turnuva Şampiyonu</p>

      {primary ? (
        <UserAvatar
          userId={primary.userId}
          fullName={primary.fullName}
          avatarUrl={primary.avatarUrl}
          avatarColor={primary.avatarColor}
          size="xl"
          highlight
          className="tournament-hero-champion__avatar"
        />
      ) : (
        <div className="tournament-hero-champion__avatar-fallback" aria-hidden>
          👑
        </div>
      )}

      {players.length > 1 ? (
        <div className="tournament-hero-champion__partners">
          {players.slice(1, 3).map((p) => (
            <UserAvatar
              key={p.userId}
              userId={p.userId}
              fullName={p.fullName}
              avatarUrl={p.avatarUrl}
              avatarColor={p.avatarColor}
              size="sm"
            />
          ))}
        </div>
      ) : null}

      <h2 className="tournament-hero-champion__name">{name}</h2>
      {finalScore ? (
        <p className="tournament-hero-champion__score">Final skoru · {finalScore}</p>
      ) : null}
    </section>
  );
}

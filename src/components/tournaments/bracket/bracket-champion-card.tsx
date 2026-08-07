"use client";

import { useEffect, useRef, useState } from "react";

import { UserAvatar } from "@/components/ui/user-avatar";
import type { BracketPlayerView } from "@/components/tournaments/bracket/bracket-types";

export type BracketChampionCardProps = {
  name: string;
  players: BracketPlayerView[];
  finalScore: string | null;
  seedLabel: string | null;
};

export function BracketChampionCard({
  name,
  players,
  finalScore,
  seedLabel,
}: BracketChampionCardProps) {
  const prevNameRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    const prev = prevNameRef.current;
    prevNameRef.current = name;

    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    if ((!prev || prev.length === 0) && name.length > 0) {
      setArrived(true);
      const timer = window.setTimeout(() => setArrived(false), 360);
      return () => window.clearTimeout(timer);
    }
  }, [name]);

  const primary = players[0];

  return (
    <div
      className={`bracket-champion-card${arrived ? " is-arrived" : ""}`}
      aria-label={`Şampiyon: ${name}`}
    >
      <div className="bracket-champion-trophy" aria-hidden>
        🏆
      </div>
      <div className="bracket-champion-label">Şampiyon</div>

      {primary ? (
        <UserAvatar
          userId={primary.userId}
          fullName={primary.fullName}
          avatarUrl={primary.avatarUrl}
          avatarColor={primary.avatarColor}
          size="lg"
          className="bracket-champion-avatar"
        />
      ) : (
        <span className="bracket-avatar-placeholder bracket-avatar-placeholder--lg" />
      )}

      {players.length > 1 ? (
        <div className="bracket-champion-avatars-row">
          {players.slice(1, 2).map((player) => (
            <UserAvatar
              key={player.userId}
              userId={player.userId}
              fullName={player.fullName}
              avatarUrl={player.avatarUrl}
              avatarColor={player.avatarColor}
              size="xs"
            />
          ))}
        </div>
      ) : null}

      <div className="bracket-champion-name">{name}</div>
      {seedLabel ? (
        <div className="bracket-champion-seed">{seedLabel}</div>
      ) : null}
      {finalScore ? (
        <div className="bracket-champion-score">Final: {finalScore}</div>
      ) : null}
    </div>
  );
}

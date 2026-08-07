"use client";

import { useEffect, useRef, useState } from "react";

import { UserAvatar } from "@/components/ui/user-avatar";
import type { BracketSideView } from "@/components/tournaments/bracket/bracket-types";

type BracketSideProps = {
  side: BracketSideView;
};

/**
 * Renders one bracket side with avatar + advance entrance animation.
 * Animation fires when a side transitions from empty → filled after live refresh.
 */
export function BracketSide({ side }: BracketSideProps) {
  const identity =
    side.players.map((p) => p.userId).join("|") ||
    (side.isEmpty ? "empty" : side.label);
  const prevRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = identity;

    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    const wasEmpty = prev === "empty" || prev === null;
    const nowFilled = !side.isEmpty && side.players.length > 0;
    if (wasEmpty && nowFilled) {
      setArrived(true);
      const timer = window.setTimeout(() => setArrived(false), 320);
      return () => window.clearTimeout(timer);
    }
  }, [identity, side.isEmpty, side.players.length]);

  const className = [
    "bracket-match-side",
    side.isWinner ? "is-winner" : "",
    side.isLoser ? "is-loser" : "",
    side.isEmpty ? "is-empty" : "",
    arrived ? "is-arrived" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <div className="bracket-match-avatars" aria-hidden={side.isEmpty}>
        {side.isEmpty || side.players.length === 0 ? (
          <span className="bracket-avatar-placeholder" />
        ) : (
          side.players.slice(0, 2).map((player) => (
            <UserAvatar
              key={player.userId}
              userId={player.userId}
              fullName={player.fullName}
              avatarUrl={player.avatarUrl}
              avatarColor={player.avatarColor}
              size="xs"
              className="bracket-match-avatar"
            />
          ))
        )}
      </div>

      <div className="bracket-match-side-text">
        <span className="bracket-match-name">
          {side.isWinner ? (
            <span className="bracket-winner-dot" aria-hidden>
              ●
            </span>
          ) : null}
          {side.label}
        </span>
        {side.seedLabel ? (
          <span className="bracket-match-seed">{side.seedLabel}</span>
        ) : null}
      </div>
    </div>
  );
}

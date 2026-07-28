"use client";

import { UserAvatar } from "@/components/ui/user-avatar";

type Side = {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
};

type ChallengeDuelAnimationProps = {
  challenger: Side;
  opponent: Side | null;
  /** "idle" = waiting for opponent pick; "ready" = both sides locked in */
  mode?: "idle" | "ready";
};

function DuelFace({
  side,
  sideClass,
  role,
}: {
  side: Side;
  sideClass: "left" | "right";
  role: string;
}) {
  return (
    <>
      <div className={`challenge-duel-avatar-wrap challenge-duel-avatar--${sideClass}`}>
        <UserAvatar
          userId={side.id}
          fullName={side.fullName}
          avatarUrl={side.avatarUrl}
          size="lg"
          className="challenge-duel-avatar-img"
        />
      </div>
      <div className="challenge-duel-name">{side.fullName}</div>
      <div className="challenge-duel-role">{role}</div>
    </>
  );
}

export function ChallengeDuelAnimation({
  challenger,
  opponent,
  mode = opponent ? "ready" : "idle",
}: ChallengeDuelAnimationProps) {
  const ready = mode === "ready" && opponent;

  return (
    <div
      className={`challenge-duel ${ready ? "challenge-duel--ready" : "challenge-duel--idle"}`}
      aria-hidden={!ready}
    >
      <div className="challenge-duel-glow challenge-duel-glow--left" />
      <div className="challenge-duel-glow challenge-duel-glow--right" />

      <div className="challenge-duel-side challenge-duel-side--left">
        <DuelFace side={challenger} sideClass="left" role="Sen" />
      </div>

      <div className="challenge-duel-center">
        <div className="challenge-duel-clash" />
        <div className="challenge-duel-vs">VS</div>
        <div className="challenge-duel-spark challenge-duel-spark--a" />
        <div className="challenge-duel-spark challenge-duel-spark--b" />
      </div>

      <div className="challenge-duel-side challenge-duel-side--right">
        {opponent ? (
          <DuelFace side={opponent} sideClass="right" role="Rakip" />
        ) : (
          <>
            <div className="challenge-duel-avatar challenge-duel-avatar--placeholder">?</div>
            <div className="challenge-duel-name text-text-muted">Rakip seç</div>
            <div className="challenge-duel-role">Bekleniyor</div>
          </>
        )}
      </div>
    </div>
  );
}

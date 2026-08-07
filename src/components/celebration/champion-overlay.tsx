"use client";

import { UserAvatar } from "@/components/ui/user-avatar";
import type { CelebrationPlayer } from "@/lib/celebration/types";

type ChampionOverlayProps = {
  player: CelebrationPlayer;
  scoreLabel: string;
  tournamentName?: string | null;
  onDismiss: () => void;
};

export function ChampionOverlay({
  player,
  scoreLabel,
  tournamentName,
  onDismiss,
}: ChampionOverlayProps) {
  return (
    <div
      className="champion-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="champion-overlay-title"
      onClick={onDismiss}
    >
      <div
        className="champion-overlay__card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="champion-overlay__trophy" aria-hidden>
          🏆
        </div>
        <p className="champion-overlay__eyebrow">
          {tournamentName ? tournamentName : "Turnuva"}
        </p>
        <h2 id="champion-overlay-title" className="champion-overlay__title">
          Turnuva Şampiyonu
        </h2>
        <div className="champion-overlay__avatar">
          <UserAvatar
            userId={player.id}
            fullName={player.fullName}
            avatarUrl={player.avatarUrl}
            avatarColor={player.avatarColor}
            size="xl"
            highlight
          />
        </div>
        <p className="champion-overlay__name">{player.fullName}</p>
        <p className="champion-overlay__score">Final skoru · {scoreLabel}</p>
        <p className="champion-overlay__cta">Kupayı Kazandın!</p>
        <button
          type="button"
          className="btn btn-primary champion-overlay__close"
          onClick={onDismiss}
        >
          Devam et
        </button>
      </div>
    </div>
  );
}

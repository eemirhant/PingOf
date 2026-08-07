import Link from "next/link";

import { BracketSide } from "@/components/tournaments/bracket/bracket-side";
import type { BracketMatchCardProps } from "@/components/tournaments/bracket/bracket-types";

export type {
  BracketMatchCardProps,
  BracketMatchTone,
  BracketPlayerView,
  BracketSideView,
} from "@/components/tournaments/bracket/bracket-types";

export function BracketMatchCard({
  matchId,
  href,
  side1,
  side2,
  scoreLabel,
  metaLine,
  tone,
  statusLabel,
  isBye = false,
}: BracketMatchCardProps) {
  const statusText =
    tone === "completed" ? `✓ ${statusLabel}` : statusLabel;

  return (
    <Link
      href={href}
      id={`bracket-match-${matchId}`}
      className={`bracket-match bracket-match--${tone}`}
      aria-label={`${side1.label} karşısında ${side2.label}`}
    >
      <div className="bracket-match-status">{statusText}</div>

      <div className="bracket-match-sides">
        <BracketSide side={side1} />
        <div className="bracket-match-vs" aria-hidden>
          VS
        </div>
        <BracketSide side={side2} />
      </div>

      {scoreLabel ? (
        <div className={`bracket-match-score ${isBye ? "is-bye" : ""}`}>
          {scoreLabel}
        </div>
      ) : null}

      {metaLine ? <div className="bracket-match-meta">{metaLine}</div> : null}
    </Link>
  );
}

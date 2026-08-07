"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { CelebrationToast } from "@/components/celebration/celebration-toast";
import { ChampionOverlay } from "@/components/celebration/champion-overlay";
import { celebrationSound } from "@/lib/celebration/sound";
import { consumeMatchCelebration } from "@/lib/celebration/storage";
import type { CelebrationPayload } from "@/lib/celebration/types";

const ConfettiBurst = dynamic(
  () =>
    import("@/components/celebration/confetti-burst").then((m) => m.ConfettiBurst),
  { ssr: false },
);

const SHOW_DELAY_MS = 220;
const WIN_TOAST_MS = 2800;
const LOSS_TOAST_MS = 2400;

/**
 * Consumes a queued celebration after result save redirects to match detail.
 * Mount once in the protected shell — zero cost until a payload exists.
 */
export function MatchCelebrationHost() {
  const pathname = usePathname();
  const [payload, setPayload] = useState<CelebrationPayload | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const match = pathname.match(/^\/matches\/([^/]+)$/);
    if (!match) {
      setPayload(null);
      setReady(false);
      return;
    }

    const matchId = match[1];
    const next = consumeMatchCelebration(matchId);
    if (!next) return;

    setPayload(next);
    setReady(false);

    const delay = window.setTimeout(() => setReady(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(delay);
  }, [pathname]);

  useEffect(() => {
    if (!ready || !payload) return;

    if (payload.variant === "win") celebrationSound.playWin();
    else if (payload.variant === "champion") celebrationSound.playChampion();
    else celebrationSound.playComplete();

    if (payload.variant === "champion") {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setPayload(null);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }

    const hideMs = payload.variant === "win" ? WIN_TOAST_MS : LOSS_TOAST_MS;
    const t = window.setTimeout(() => setPayload(null), hideMs);
    return () => window.clearTimeout(t);
  }, [ready, payload]);

  if (!payload || !ready) return null;

  if (payload.variant === "champion" && payload.player) {
    return (
      <>
        <ConfettiBurst intensity="champion" durationMs={3200} />
        <ChampionOverlay
          player={payload.player}
          scoreLabel={payload.scoreLabel}
          tournamentName={payload.tournamentName}
          onDismiss={() => setPayload(null)}
        />
      </>
    );
  }

  if (payload.variant === "win") {
    return (
      <>
        <ConfettiBurst intensity="normal" durationMs={1800} />
        <CelebrationToast title="🎉 Tebrikler!" subtitle="Maçı Kazandın." tone="win" />
      </>
    );
  }

  return (
    <CelebrationToast title="Maç tamamlandı" subtitle={payload.scoreLabel} tone="neutral" />
  );
}

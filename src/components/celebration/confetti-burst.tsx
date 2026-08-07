"use client";

import { useEffect, useRef } from "react";

type ConfettiBurstProps = {
  intensity?: "normal" | "champion";
  /** Total lifetime; particles stop firing after this. */
  durationMs?: number;
};

/**
 * Lazy canvas-confetti burst. Mount only when celebrating.
 * Unmounts cleanly; respects prefers-reduced-motion.
 */
export function ConfettiBurst({
  intensity = "normal",
  durationMs = intensity === "champion" ? 3200 : 1800,
}: ConfettiBurstProps) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let cancelled = false;
    let intervalId: number | undefined;
    let endTimer: number | undefined;

    void (async () => {
      const confetti = (await import("canvas-confetti")).default;
      if (cancelled) return;

      const colors =
        intensity === "champion"
          ? ["#fbbf24", "#f59e0b", "#6366f1", "#818cf8", "#34d399", "#f1f5f9"]
          : ["#6366f1", "#818cf8", "#34d399", "#fbbf24", "#f1f5f9"];

      const particleCount = intensity === "champion" ? 55 : 28;
      const spread = intensity === "champion" ? 72 : 58;

      const fire = (originX: number) => {
        void confetti({
          particleCount,
          spread,
          startVelocity: intensity === "champion" ? 38 : 28,
          gravity: 1.05,
          ticks: intensity === "champion" ? 160 : 120,
          origin: { x: originX, y: 0.15 },
          colors,
          disableForReducedMotion: true,
          zIndex: 90,
        });
      };

      fire(0.25);
      fire(0.75);

      if (intensity === "champion") {
        intervalId = window.setInterval(() => {
          fire(0.2 + Math.random() * 0.6);
        }, 420);
      }

      endTimer = window.setTimeout(() => {
        if (intervalId != null) window.clearInterval(intervalId);
        confetti.reset();
      }, Math.min(durationMs, intensity === "champion" ? 4000 : 2000));
    })();

    return () => {
      cancelled = true;
      if (intervalId != null) window.clearInterval(intervalId);
      if (endTimer != null) window.clearTimeout(endTimer);
    };
  }, [durationMs, intensity]);

  return null;
}

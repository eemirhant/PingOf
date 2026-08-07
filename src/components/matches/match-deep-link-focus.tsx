"use client";

import { useEffect } from "react";

type MatchDeepLinkFocusProps = {
  matchId: string | null;
};

/**
 * Scrolls to and highlights a match card opened via notification deep link.
 */
export function MatchDeepLinkFocus({ matchId }: MatchDeepLinkFocusProps) {
  useEffect(() => {
    if (!matchId) return;
    const el = document.getElementById(`match-${matchId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("deep-link-focus");
    const timer = window.setTimeout(() => {
      el.classList.remove("deep-link-focus");
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [matchId]);

  return null;
}

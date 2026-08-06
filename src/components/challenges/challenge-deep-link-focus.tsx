"use client";

import { useEffect } from "react";

type ChallengeDeepLinkFocusProps = {
  challengeId: string | null;
};

/**
 * Scrolls to and highlights a challenge card opened via notification deep link.
 */
export function ChallengeDeepLinkFocus({
  challengeId,
}: ChallengeDeepLinkFocusProps) {
  useEffect(() => {
    if (!challengeId) return;
    const el = document.getElementById(`challenge-${challengeId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("challenge-deep-link-focus");
    const timer = window.setTimeout(() => {
      el.classList.remove("challenge-deep-link-focus");
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [challengeId]);

  return null;
}

import {
  CELEBRATION_STORAGE_KEY,
  CELEBRATION_TTL_MS,
  type CelebrationPayload,
} from "@/lib/celebration/types";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

/** Queue a one-shot celebration for the post-redirect match detail view. */
export function queueMatchCelebration(payload: Omit<CelebrationPayload, "createdAt">): void {
  if (!canUseStorage()) return;
  try {
    const full: CelebrationPayload = { ...payload, createdAt: Date.now() };
    sessionStorage.setItem(CELEBRATION_STORAGE_KEY, JSON.stringify(full));
  } catch {
    /* private mode / quota — ignore */
  }
}

/** Discard a queued celebration (e.g. form validation/server error). */
export function clearMatchCelebration(): void {
  if (!canUseStorage()) return;
  try {
    sessionStorage.removeItem(CELEBRATION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Read + clear pending celebration if still fresh. */
export function consumeMatchCelebration(
  expectedMatchId?: string | null,
): CelebrationPayload | null {
  if (!canUseStorage()) return null;
  try {
    const raw = sessionStorage.getItem(CELEBRATION_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(CELEBRATION_STORAGE_KEY);
    const parsed = JSON.parse(raw) as CelebrationPayload;
    if (!parsed?.variant || !parsed.createdAt) return null;
    if (Date.now() - parsed.createdAt > CELEBRATION_TTL_MS) return null;
    if (
      expectedMatchId &&
      parsed.matchId !== "pending" &&
      parsed.matchId !== expectedMatchId
    ) {
      return null;
    }
    return parsed;
  } catch {
    try {
      sessionStorage.removeItem(CELEBRATION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

/**
 * Org-scoped realtime event types for polling sync.
 */

export const RealtimeEventType = {
  CHALLENGE_UPDATED: "CHALLENGE_UPDATED",
  MATCH_UPSERTED: "MATCH_UPSERTED",
  MATCH_RESULT: "MATCH_RESULT",
  NOTIFICATION: "NOTIFICATION",
  TOURNAMENT_UPDATED: "TOURNAMENT_UPDATED",
  LEADERBOARD_DIRTY: "LEADERBOARD_DIRTY",
  MEMBER_JOINED: "MEMBER_JOINED",
  PROFILE_UPDATED: "PROFILE_UPDATED",
} as const;

export type RealtimeEventTypeValue =
  (typeof RealtimeEventType)[keyof typeof RealtimeEventType];

export const REALTIME_EVENT_TTL_MS = 60 * 60 * 1000;

/** Filter events newer than an ISO cursor (exclusive). */
export function filterEventsSince<T extends { createdAt: string }>(
  events: T[],
  sinceIso: string | null,
): T[] {
  if (!sinceIso) return events;
  const sinceMs = Date.parse(sinceIso);
  if (Number.isNaN(sinceMs)) return events;
  return events.filter((e) => Date.parse(e.createdAt) > sinceMs);
}

/** Pathname → event types that should trigger a soft router.refresh. */
export function eventTypesForPath(pathname: string): RealtimeEventTypeValue[] {
  if (pathname.startsWith("/challenges")) {
    return [RealtimeEventType.CHALLENGE_UPDATED, RealtimeEventType.MATCH_UPSERTED];
  }
  if (pathname.startsWith("/notifications")) {
    return [RealtimeEventType.NOTIFICATION];
  }
  if (pathname.startsWith("/matches")) {
    return [
      RealtimeEventType.MATCH_UPSERTED,
      RealtimeEventType.MATCH_RESULT,
      RealtimeEventType.CHALLENGE_UPDATED,
    ];
  }
  if (pathname.startsWith("/tournaments")) {
    return [
      RealtimeEventType.TOURNAMENT_UPDATED,
      RealtimeEventType.MATCH_RESULT,
      RealtimeEventType.MATCH_UPSERTED,
    ];
  }
  if (pathname.startsWith("/leaderboard")) {
    return [RealtimeEventType.LEADERBOARD_DIRTY, RealtimeEventType.MATCH_RESULT];
  }
  if (pathname.startsWith("/players")) {
    return [
      RealtimeEventType.MEMBER_JOINED,
      RealtimeEventType.PROFILE_UPDATED,
      RealtimeEventType.MATCH_RESULT,
      RealtimeEventType.LEADERBOARD_DIRTY,
    ];
  }
  if (pathname === "/" || pathname === "") {
    return [
      RealtimeEventType.CHALLENGE_UPDATED,
      RealtimeEventType.MATCH_UPSERTED,
      RealtimeEventType.MATCH_RESULT,
      RealtimeEventType.NOTIFICATION,
      RealtimeEventType.TOURNAMENT_UPDATED,
      RealtimeEventType.LEADERBOARD_DIRTY,
      RealtimeEventType.MEMBER_JOINED,
    ];
  }
  if (pathname.startsWith("/settings")) {
    return [RealtimeEventType.PROFILE_UPDATED, RealtimeEventType.MEMBER_JOINED];
  }
  return [];
}

export function eventsMatchPath(
  types: string[],
  pathname: string,
): boolean {
  const relevant = new Set(eventTypesForPath(pathname));
  if (relevant.size === 0) return false;
  return types.some((t) => relevant.has(t as RealtimeEventTypeValue));
}

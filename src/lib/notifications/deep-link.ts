/**
 * Central notification deep-link mapping (type → destination).
 * Add new notification types here only — callers should not hardcode routes.
 */

import { NotificationType } from "@/domain/notification";
import { toSafeInternalPath } from "@/lib/url/safe-path";

export type NotificationDeepLinkRefs = {
  entityId?: string | null;
  challengeId?: string | null;
  matchId?: string | null;
  tournamentId?: string | null;
  playerId?: string | null;
  notificationId?: string | null;
};

export type ParsedNotificationDeepLink = {
  pathname: string;
  search: string;
  path: string;
  challengeId: string | null;
  matchId: string | null;
  tournamentId: string | null;
  playerId: string | null;
  notificationId: string | null;
  /** Generic focus id (?id= or ?highlight=) */
  focusId: string | null;
  highlightId: string | null;
  entityMissing: boolean;
};

const FALLBACK = "/notifications";
export const ENTITY_MISSING_QUERY = "entityMissing";

type ResolvedIds = {
  challengeId: string | null;
  matchId: string | null;
  tournamentId: string | null;
  playerId: string | null;
  notificationId: string | null;
  entityId: string | null;
};

type DestinationBuilder = (ids: ResolvedIds) => string;

function firstId(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    const v = typeof c === "string" ? c.trim() : "";
    if (v) return v;
  }
  return null;
}

export function withQuery(
  pathname: string,
  params: Record<string, string | null | undefined>,
): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) q.set(key, value);
  }
  const qs = q.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Normalize payload types (challenge_received → CHALLENGE_RECEIVED). */
export function normalizeNotificationType(type: string): string {
  return type.trim().replace(/-/g, "_").toUpperCase();
}

function challengesDestination(challengeId: string | null): string {
  return withQuery("/challenges", {
    highlight: challengeId,
    id: challengeId,
    challengeId,
  });
}

function matchDestination(matchId: string | null, listFallback: string): string {
  if (matchId) {
    return withQuery(`/matches/${matchId}`, { highlight: matchId });
  }
  return listFallback;
}

/**
 * Registry: one entry per notification type.
 * Future types → add a row here only.
 */
const DESTINATION_REGISTRY: Record<string, DestinationBuilder> = {
  [NotificationType.CHALLENGE_RECEIVED]: (ids) =>
    challengesDestination(firstId(ids.challengeId, ids.entityId)),
  [NotificationType.CHALLENGE_DECLINED]: (ids) =>
    challengesDestination(firstId(ids.challengeId, ids.entityId)),
  [NotificationType.CHALLENGE_CANCELLED]: (ids) =>
    challengesDestination(firstId(ids.challengeId, ids.entityId)),
  [NotificationType.CHALLENGE_ACCEPTED]: (ids) => {
    // Prefer match detail when a match was created; else challenges highlight.
    const matchId = firstId(ids.matchId);
    if (matchId) return matchDestination(matchId, "/matches");
    return challengesDestination(firstId(ids.challengeId, ids.entityId));
  },

  [NotificationType.MATCH_CREATED]: (ids) =>
    matchDestination(firstId(ids.matchId, ids.entityId), "/matches"),
  [NotificationType.MATCH_SCHEDULE_CHANGED]: (ids) =>
    matchDestination(firstId(ids.matchId, ids.entityId), "/matches"),
  [NotificationType.MATCH_REMINDER]: (ids) =>
    matchDestination(firstId(ids.matchId, ids.entityId), "/matches"),
  [NotificationType.MATCH_CANCELLED]: (ids) =>
    matchDestination(firstId(ids.matchId, ids.entityId), "/matches"),
  [NotificationType.MATCH_RESULT]: (ids) =>
    matchDestination(
      firstId(ids.matchId, ids.entityId),
      "/matches?time=PAST",
    ),

  [NotificationType.STAKE_CREATED]: (ids) =>
    matchDestination(firstId(ids.matchId, ids.entityId), "/matches"),
  [NotificationType.STAKE_SETTLED]: (ids) =>
    matchDestination(firstId(ids.matchId, ids.entityId), "/matches"),

  [NotificationType.TOURNAMENT_MATCH_READY]: (ids) => {
    const mid = firstId(ids.matchId);
    if (mid) return matchDestination(mid, "/matches");
    const tid = firstId(ids.tournamentId, ids.entityId);
    return tid ? `/tournaments/${tid}` : "/tournaments";
  },
  [NotificationType.TOURNAMENT_MATCH_CREATED]: (ids) => {
    const mid = firstId(ids.matchId);
    if (mid) return matchDestination(mid, "/matches");
    const tid = firstId(ids.tournamentId, ids.entityId);
    return tid ? `/tournaments/${tid}` : "/tournaments";
  },
  [NotificationType.TOURNAMENT_CREATED]: (ids) => {
    const tid = firstId(ids.tournamentId, ids.entityId);
    return tid
      ? withQuery(`/tournaments/${tid}`, { matchId: ids.matchId })
      : "/tournaments";
  },
  [NotificationType.TOURNAMENT_ADDED]: (ids) => {
    const tid = firstId(ids.tournamentId, ids.entityId);
    return tid ? `/tournaments/${tid}` : "/tournaments";
  },
  [NotificationType.TOURNAMENT_STARTED]: (ids) => {
    const tid = firstId(ids.tournamentId, ids.entityId);
    return tid ? `/tournaments/${tid}` : "/tournaments";
  },
  [NotificationType.TOURNAMENT_COMPLETED]: (ids) => {
    const tid = firstId(ids.tournamentId, ids.entityId);
    return tid ? `/tournaments/${tid}` : "/tournaments";
  },

  [NotificationType.LEADERBOARD_RANK_CHANGED]: () => "/leaderboard",
  [NotificationType.LEADERBOARD_TOP3]: () => "/leaderboard",
  [NotificationType.LEADERBOARD_OVERTAKEN]: () => "/leaderboard",
  [NotificationType.LEADERBOARD_STREAK]: (ids) => {
    const pid = firstId(ids.playerId, ids.entityId);
    return pid ? `/players/${pid}` : "/players";
  },

  [NotificationType.MEMBER_JOINED]: (ids) => {
    const pid = firstId(ids.playerId, ids.entityId);
    return pid ? `/players/${pid}` : "/players";
  },

  // Reserved future types (no dedicated screens yet)
  ORGANIZATION: () => "/settings",
  ANNOUNCEMENT: () => FALLBACK,
  NOTIFICATION: (ids) => withQuery(FALLBACK, { id: ids.notificationId }),
};

/** List page when a deep-linked entity no longer exists (no hard 404). */
export function getListFallbackForNotificationType(type: string): string {
  const t = normalizeNotificationType(type);
  if (t.startsWith("CHALLENGE_")) return "/challenges";
  if (t === NotificationType.MATCH_RESULT) return "/matches?time=PAST";
  if (t.startsWith("MATCH_") || t.startsWith("STAKE_")) return "/matches";
  if (t.startsWith("TOURNAMENT_")) return "/tournaments";
  if (t.startsWith("LEADERBOARD_")) return "/leaderboard";
  if (t === NotificationType.MEMBER_JOINED || t === "ORGANIZATION") {
    return t === "ORGANIZATION" ? "/settings" : "/players";
  }
  return FALLBACK;
}

export function withEntityMissingFlag(path: string): string {
  const safe = toSafeInternalPath(path, FALLBACK);
  let pathname = safe;
  let search = "";
  const qi = safe.indexOf("?");
  if (qi >= 0) {
    pathname = safe.slice(0, qi);
    search = safe.slice(qi + 1);
  }
  const params = new URLSearchParams(search);
  params.set(ENTITY_MISSING_QUERY, "1");
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Extract entity ids from a previously stored linkUrl (backward compatible).
 */
export function extractRefsFromLinkUrl(
  linkUrl: string | null | undefined,
): NotificationDeepLinkRefs {
  const path = toSafeInternalPath(linkUrl, "");
  if (!path) return {};

  let pathname = path;
  let search = "";
  const qIndex = path.indexOf("?");
  if (qIndex >= 0) {
    pathname = path.slice(0, qIndex);
    search = path.slice(qIndex + 1);
  }

  const params = new URLSearchParams(search);
  const focusId = params.get("highlight") ?? params.get("id");
  const challengeId = params.get("challengeId");
  const matchId = params.get("matchId");
  const tournamentId = params.get("tournamentId");
  const notificationId = params.get("notificationId");

  const matchPath = pathname.match(/^\/matches\/([^/]+)$/);
  const tournamentPath = pathname.match(/^\/tournaments\/([^/]+)$/);
  const playerPath = pathname.match(/^\/players\/([^/]+)$/);

  return {
    challengeId:
      challengeId ??
      (pathname === "/challenges" || pathname.startsWith("/challenges/")
        ? focusId
        : null),
    matchId: matchId ?? matchPath?.[1] ?? null,
    tournamentId: tournamentId ?? tournamentPath?.[1] ?? null,
    playerId: playerPath?.[1] ?? null,
    notificationId:
      notificationId ?? (pathname === "/notifications" ? focusId : null),
    entityId:
      matchPath?.[1] ??
      tournamentPath?.[1] ??
      playerPath?.[1] ??
      (pathname === "/challenges" ? focusId : null) ??
      null,
  };
}

function resolveIds(refs: NotificationDeepLinkRefs): ResolvedIds {
  return {
    challengeId: firstId(refs.challengeId),
    matchId: firstId(refs.matchId),
    tournamentId: firstId(refs.tournamentId),
    playerId: firstId(refs.playerId),
    notificationId: firstId(refs.notificationId),
    entityId: firstId(refs.entityId),
  };
}

/**
 * Single source of truth: notification type (+ refs) → internal path.
 */
export function getNotificationDestination(
  type: string,
  refs: NotificationDeepLinkRefs = {},
): string {
  const normalized = normalizeNotificationType(type);
  const ids = resolveIds(refs);
  const builder = DESTINATION_REGISTRY[normalized];
  if (builder) return builder(ids);
  return withQuery(FALLBACK, { id: ids.notificationId });
}

/** Alias kept for call-site clarity. */
export const resolveNotificationTarget = getNotificationDestination;

/**
 * Canonicalize a notification link: merge explicit refs + parse old linkUrl,
 * then rebuild via getNotificationDestination when possible.
 */
export function buildNotificationDeepLink(input: {
  type: string;
  linkUrl?: string | null;
  entityId?: string | null;
  challengeId?: string | null;
  matchId?: string | null;
  tournamentId?: string | null;
  playerId?: string | null;
  notificationId?: string | null;
}): string {
  const fromUrl = extractRefsFromLinkUrl(input.linkUrl);
  const refs: NotificationDeepLinkRefs = {
    entityId: firstId(input.entityId, fromUrl.entityId),
    challengeId: firstId(input.challengeId, fromUrl.challengeId),
    matchId: firstId(input.matchId, fromUrl.matchId),
    tournamentId: firstId(input.tournamentId, fromUrl.tournamentId),
    playerId: firstId(input.playerId, fromUrl.playerId),
    notificationId: firstId(input.notificationId, fromUrl.notificationId),
  };

  const hasRefs = Boolean(
    refs.entityId ||
      refs.challengeId ||
      refs.matchId ||
      refs.tournamentId ||
      refs.playerId ||
      refs.notificationId,
  );

  if (hasRefs || !input.linkUrl?.trim()) {
    return getNotificationDestination(input.type, refs);
  }

  return toSafeInternalPath(input.linkUrl, FALLBACK);
}

export function parseNotificationDeepLink(
  pathOrUrl: string | null | undefined,
): ParsedNotificationDeepLink {
  const path = toSafeInternalPath(pathOrUrl, FALLBACK);
  let pathname = path;
  let search = "";
  const qIndex = path.indexOf("?");
  if (qIndex >= 0) {
    pathname = path.slice(0, qIndex);
    search = path.slice(qIndex);
  }

  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const fromPath = extractRefsFromLinkUrl(path);
  const highlightId = params.get("highlight");
  const focusId = highlightId ?? params.get("id");

  return {
    pathname,
    search,
    path,
    challengeId: fromPath.challengeId ?? null,
    matchId: fromPath.matchId ?? null,
    tournamentId: fromPath.tournamentId ?? null,
    playerId: fromPath.playerId ?? null,
    notificationId: fromPath.notificationId ?? null,
    focusId,
    highlightId,
    entityMissing: params.get(ENTITY_MISSING_QUERY) === "1",
  };
}

/** Client / SW message channel type. */
export const NOTIFICATION_NAVIGATE_MESSAGE = "PINGOF_NAVIGATE" as const;

export type NotificationNavigateMessage = {
  type: typeof NOTIFICATION_NAVIGATE_MESSAGE;
  url: string;
  notificationType?: string;
  entityId?: string;
  organizationId?: string;
  challengeId?: string;
  matchId?: string;
  tournamentId?: string;
  notificationId?: string;
  source?: "push" | "foreground" | "in_app" | "sw";
};

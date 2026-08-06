/**
 * Central notification deep-link mapping (type → destination).
 * Used by in-app open, FCM payload URL, SW click, and foreground click.
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
  /** Generic ?id= used for challenge list focus */
  focusId: string | null;
};

const FALLBACK = "/notifications";

function firstId(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    const v = typeof c === "string" ? c.trim() : "";
    if (v) return v;
  }
  return null;
}

function withQuery(
  pathname: string,
  params: Record<string, string | null>,
): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) q.set(key, value);
  }
  const qs = q.toString();
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
  const focusId = params.get("id");
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

/**
 * Single source of truth: notification type (+ refs) → internal path.
 */
export function getNotificationDestination(
  type: string,
  refs: NotificationDeepLinkRefs = {},
): string {
  const matchId = firstId(refs.matchId, refs.entityId);
  const tournamentId = firstId(refs.tournamentId, refs.entityId);
  const playerId = firstId(refs.playerId, refs.entityId);
  const notificationId = firstId(refs.notificationId);
  const challengeFocus = firstId(refs.challengeId, refs.entityId);

  switch (type) {
    case NotificationType.CHALLENGE_RECEIVED:
    case NotificationType.CHALLENGE_DECLINED:
    case NotificationType.CHALLENGE_CANCELLED:
      return withQuery("/challenges", {
        id: challengeFocus,
        challengeId: challengeFocus,
      });

    case NotificationType.CHALLENGE_ACCEPTED: {
      const acceptedMatch = firstId(refs.matchId, refs.entityId);
      if (acceptedMatch) return `/matches/${acceptedMatch}`;
      return withQuery("/challenges", {
        id: firstId(refs.challengeId),
        challengeId: firstId(refs.challengeId),
      });
    }

    case NotificationType.MATCH_CREATED:
    case NotificationType.MATCH_SCHEDULE_CHANGED:
    case NotificationType.MATCH_REMINDER:
    case NotificationType.MATCH_CANCELLED:
    case NotificationType.MATCH_RESULT:
    case NotificationType.STAKE_CREATED:
    case NotificationType.STAKE_SETTLED: {
      const mid = firstId(refs.matchId, refs.entityId);
      if (mid) return `/matches/${mid}`;
      return FALLBACK;
    }

    case NotificationType.TOURNAMENT_MATCH_READY:
    case NotificationType.TOURNAMENT_MATCH_CREATED: {
      const mid = firstId(refs.matchId);
      if (mid) return `/matches/${mid}`;
      const tid = firstId(refs.tournamentId, refs.entityId);
      if (tid) return `/tournaments/${tid}`;
      return FALLBACK;
    }

    case NotificationType.TOURNAMENT_CREATED:
    case NotificationType.TOURNAMENT_ADDED:
    case NotificationType.TOURNAMENT_STARTED:
    case NotificationType.TOURNAMENT_COMPLETED:
      if (tournamentId) {
        return withQuery(`/tournaments/${tournamentId}`, {
          matchId: firstId(refs.matchId),
        });
      }
      if (matchId) return `/matches/${matchId}`;
      return "/tournaments";

    case NotificationType.LEADERBOARD_RANK_CHANGED:
    case NotificationType.LEADERBOARD_TOP3:
    case NotificationType.LEADERBOARD_OVERTAKEN:
      return "/leaderboard";

    case NotificationType.LEADERBOARD_STREAK:
    case NotificationType.MEMBER_JOINED:
      if (playerId) return `/players/${playerId}`;
      return "/players";

    default:
      return withQuery(FALLBACK, { id: notificationId });
  }
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

  return {
    pathname,
    search,
    path,
    challengeId: fromPath.challengeId ?? null,
    matchId: fromPath.matchId ?? null,
    tournamentId: fromPath.tournamentId ?? null,
    playerId: fromPath.playerId ?? null,
    notificationId: fromPath.notificationId ?? null,
    focusId: params.get("id"),
  };
}

/** Client / SW message channel type. */
export const NOTIFICATION_NAVIGATE_MESSAGE = "PINGOF_NAVIGATE" as const;

export type NotificationNavigateMessage = {
  type: typeof NOTIFICATION_NAVIGATE_MESSAGE;
  url: string;
};

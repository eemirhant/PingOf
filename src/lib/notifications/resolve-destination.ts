import "server-only";

import { prisma } from "@/lib/db";
import {
  buildNotificationDeepLink,
  getListFallbackForNotificationType,
  parseNotificationDeepLink,
  withEntityMissingFlag,
} from "@/lib/notifications/deep-link";
import { withOrgScope } from "@/lib/org-scope";
import { toSafeInternalPath } from "@/lib/url/safe-path";

const FALLBACK = "/notifications";

/**
 * Validate that deep-link targets still exist in the user's organization.
 * Missing entities → related list + entityMissing flag (no hard 404).
 */
export async function resolveSafeNotificationDestination(input: {
  organizationId: string;
  type: string;
  linkUrl?: string | null;
  entityId?: string | null;
  challengeId?: string | null;
  matchId?: string | null;
  tournamentId?: string | null;
  playerId?: string | null;
  notificationId?: string | null;
}): Promise<string> {
  const candidate = buildNotificationDeepLink(input);
  const parsed = parseNotificationDeepLink(candidate);
  const orgId = input.organizationId;
  const listFallback = getListFallbackForNotificationType(input.type);

  if (parsed.challengeId) {
    const challenge = await prisma.challenge.findFirst({
      where: withOrgScope(orgId, { id: parsed.challengeId }),
      select: { id: true },
    });
    if (!challenge) {
      return withEntityMissingFlag(listFallback);
    }
  }

  if (parsed.matchId) {
    const match = await prisma.match.findFirst({
      where: withOrgScope(orgId, { id: parsed.matchId }),
      select: { id: true },
    });
    if (!match) {
      return withEntityMissingFlag(listFallback);
    }
  }

  if (parsed.tournamentId) {
    const tournament = await prisma.tournament.findFirst({
      where: withOrgScope(orgId, { id: parsed.tournamentId }),
      select: { id: true },
    });
    if (!tournament) {
      return withEntityMissingFlag(listFallback);
    }
  }

  if (parsed.playerId) {
    const player = await prisma.user.findFirst({
      where: withOrgScope(orgId, { id: parsed.playerId }),
      select: { id: true },
    });
    if (!player) {
      return withEntityMissingFlag(listFallback);
    }
  }

  return toSafeInternalPath(candidate, FALLBACK);
}

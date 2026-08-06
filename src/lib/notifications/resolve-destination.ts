import "server-only";

import { prisma } from "@/lib/db";
import {
  buildNotificationDeepLink,
  parseNotificationDeepLink,
} from "@/lib/notifications/deep-link";
import { withOrgScope } from "@/lib/org-scope";
import { toSafeInternalPath } from "@/lib/url/safe-path";

const FALLBACK = "/notifications";

/**
 * Validate that deep-link targets still exist in the user's organization.
 * Missing / inaccessible entities fall back to /notifications (no 404).
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

  if (parsed.challengeId) {
    const challenge = await prisma.challenge.findFirst({
      where: withOrgScope(orgId, { id: parsed.challengeId }),
      select: { id: true },
    });
    if (!challenge) return FALLBACK;
  }

  if (parsed.matchId) {
    const match = await prisma.match.findFirst({
      where: withOrgScope(orgId, { id: parsed.matchId }),
      select: { id: true },
    });
    if (!match) return FALLBACK;
  }

  if (parsed.tournamentId) {
    const tournament = await prisma.tournament.findFirst({
      where: withOrgScope(orgId, { id: parsed.tournamentId }),
      select: { id: true },
    });
    if (!tournament) return FALLBACK;
  }

  if (parsed.playerId) {
    const player = await prisma.user.findFirst({
      where: withOrgScope(orgId, { id: parsed.playerId }),
      select: { id: true },
    });
    if (!player) return FALLBACK;
  }

  return toSafeInternalPath(candidate, FALLBACK);
}

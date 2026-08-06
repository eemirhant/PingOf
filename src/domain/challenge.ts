/**
 * Challenge (meydan okuma) domain — PRD US-11 / KK-11.
 * Pure functions — no UI / Prisma / React dependencies.
 */

import { CHALLENGE_EXPIRY_DAYS } from "@/domain/constants";

export type ChallengeStatusValue =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "CANCELLED";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function challengeExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + CHALLENGE_EXPIRY_DAYS * MS_PER_DAY);
}

export function isChallengeExpired(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= challengeExpiresAt(createdAt).getTime();
}

export function canRespondToChallenge(
  status: ChallengeStatusValue,
  createdAt: Date,
  now: Date = new Date(),
): boolean {
  if (status !== "PENDING") return false;
  return !isChallengeExpired(createdAt, now);
}

/**
 * Only the sender may cancel, and only while the offer is still pending
 * (not expired / accepted / declined / already cancelled).
 */
export function canCancelChallenge(
  status: ChallengeStatusValue,
  createdAt: Date,
  actorUserId: string,
  fromUserId: string,
  now: Date = new Date(),
): boolean {
  if (actorUserId !== fromUserId) return false;
  if (status !== "PENDING") return false;
  return !isChallengeExpired(createdAt, now);
}

/** Lazy resolve: PENDING past expiry becomes EXPIRED. */
export function resolveChallengeStatus(
  status: ChallengeStatusValue,
  createdAt: Date,
  now: Date = new Date(),
): ChallengeStatusValue {
  if (status === "PENDING" && isChallengeExpired(createdAt, now)) {
    return "EXPIRED";
  }
  return status;
}

export function challengeStatusLabel(status: ChallengeStatusValue): string {
  switch (status) {
    case "PENDING":
      return "Bekliyor";
    case "ACCEPTED":
      return "Kabul edildi";
    case "DECLINED":
      return "Reddedildi";
    case "EXPIRED":
      return "Süresi doldu";
    case "CANCELLED":
      return "İptal edildi";
    default:
      return status;
  }
}

/**
 * Match schedule when a challenge is accepted.
 * Only a still-future proposedAt becomes scheduledAt — never invent a default time.
 */
export function resolveChallengeMatchScheduledAt(
  proposedAt: Date | null | undefined,
  now: Date = new Date(),
): Date | null {
  if (!proposedAt) return null;
  if (Number.isNaN(proposedAt.getTime())) return null;
  if (proposedAt.getTime() <= now.getTime()) return null;
  return proposedAt;
}
